import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import type { AnimationRunner } from '../animation/runner'
import type { StripManager } from '../strips/manager'
import logger from '../logger'

const P = 'doorbell_chime'

const DEVICE = {
  identifiers: ['doorbell_chime'],
  name: 'Doorbell Chime',
  model: 'Lights Controller',
}

export class MqttBridge {
  private client: MqttClient | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private discoveryPrefix = 'homeassistant'
  private knownStrips = new Set<string>()

  constructor(
    private readonly getRunner: () => AnimationRunner,
    private readonly manager: StripManager,
    private readonly onManualCommand: () => void,
  ) {}

  connect(): void {
    const broker = process.env.MQTT_BROKER
    if (!broker) {
      logger.info('MQTT_BROKER not set — Home Assistant bridge disabled')
      return
    }

    this.discoveryPrefix = process.env.HA_DISCOVERY_PREFIX ?? 'homeassistant'

    this.client = mqtt.connect(broker, {
      clientId: process.env.MQTT_CLIENT_ID ?? 'doorbell-chime',
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
      will: {
        topic: `${P}/availability`,
        payload: Buffer.from('offline'),
        retain: true,
        qos: 1,
      },
    })

    this.client.on('connect', () => {
      logger.info('MQTT connected', { broker })
      this.client!.publish(`${P}/availability`, 'online', { retain: true, qos: 1 })
      this.publishDiscovery()
      this.subscribeCommands()
      this.publishState()
      this.pollTimer = setInterval(() => {
        this.publishState()
        this.syncStripDiscovery()
      }, 5000)
    })

    this.client.on('message', (topic, payload) => this.handleCommand(topic, payload.toString()))
    this.client.on('error', (err) => logger.error('MQTT error', { error: err.message }))
    this.client.on('close', () => {
      if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
      logger.warn('MQTT connection closed')
    })
  }

  private publishDiscovery(): void {
    const cycleNames = this.getRunner().getCycleNames()

    this.config('light', 'light', {
      name: 'Lights',
      unique_id: 'doorbell_chime_light',
      schema: 'json',
      state_topic: `${P}/light/state`,
      command_topic: `${P}/light/set`,
      brightness: true,
      brightness_scale: 255,
      availability_topic: `${P}/availability`,
      device: DEVICE,
    })

    this.config('select', 'cycle', {
      name: 'Cycle',
      unique_id: 'doorbell_chime_cycle',
      state_topic: `${P}/cycle/state`,
      command_topic: `${P}/cycle/set`,
      options: cycleNames,
      availability_topic: `${P}/availability`,
      device: DEVICE,
    })

    this.config('button', 'next', {
      name: 'Next Algorithm',
      unique_id: 'doorbell_chime_next',
      command_topic: `${P}/next/set`,
      availability_topic: `${P}/availability`,
      device: DEVICE,
    })

    this.config('sensor', 'algorithm', {
      name: 'Current Algorithm',
      unique_id: 'doorbell_chime_algorithm',
      state_topic: `${P}/algorithm/state`,
      availability_topic: `${P}/availability`,
      device: DEVICE,
    })

    this.config('sensor', 'next_change', {
      name: 'Time Until Next Algorithm',
      unique_id: 'doorbell_chime_next_change',
      state_topic: `${P}/next_change/state`,
      unit_of_measurement: 's',
      device_class: 'duration',
      state_class: 'measurement',
      availability_topic: `${P}/availability`,
      device: DEVICE,
    })

    for (const strip of this.manager.getConnected()) {
      this.publishStripDiscovery(strip.stripId)
      this.knownStrips.add(strip.stripId)
    }
  }

  private publishStripDiscovery(stripId: string): void {
    const safeId = stripId.replace(/[^a-zA-Z0-9_]/g, '_')
    const avail = `${P}/strip/${stripId}/availability`
    const availability = [
      { topic: `${P}/availability` },
      { topic: avail },
    ]

    const stripSensor = (id: string, name: string, extra: Record<string, unknown>) =>
      this.config('sensor', `strip_${safeId}_${id}`, {
        name: `${stripId} ${name}`,
        unique_id: `doorbell_chime_strip_${safeId}_${id}`,
        state_topic: `${P}/strip/${stripId}/${id}`,
        availability,
        availability_mode: 'all',
        device: DEVICE,
        ...extra,
      })

    stripSensor('fps',     'FPS',        { unit_of_measurement: 'fps',    state_class: 'measurement' })
    stripSensor('buffer',  'Buffer',      { unit_of_measurement: 'frames', state_class: 'measurement' })
    stripSensor('drops',   'Frame Drops', { unit_of_measurement: 'frames', state_class: 'measurement' })
    stripSensor('latency', 'Latency',     { unit_of_measurement: 'ms',     state_class: 'measurement' })

    this.client!.publish(avail, 'online', { retain: true, qos: 1 })
  }

  private syncStripDiscovery(): void {
    const connected = new Set(this.manager.getConnected().map(s => s.stripId))

    for (const id of connected) {
      if (!this.knownStrips.has(id)) {
        this.publishStripDiscovery(id)
        this.knownStrips.add(id)
      }
    }

    for (const id of this.knownStrips) {
      if (!connected.has(id)) {
        this.client!.publish(`${P}/strip/${id}/availability`, 'offline', { retain: true, qos: 1 })
        this.knownStrips.delete(id)
      }
    }
  }

  private publishState(): void {
    if (!this.client?.connected) return

    const status = this.getRunner().getStatus()

    this.pub(`${P}/light/state`, JSON.stringify({
      state: status.running ? 'ON' : 'OFF',
      brightness: Math.round(status.brightness * 255),
    }), true)

    this.pub(`${P}/cycle/state`, status.current_cycle, true)
    this.pub(`${P}/algorithm/state`, status.current_algorithm ?? 'off', true)

    const secsUntilNext = status.next_change_time !== null
      ? Math.max(0, Math.round((status.next_change_time - Date.now()) / 1000))
      : 0
    this.pub(`${P}/next_change/state`, String(secsUntilNext), true)

    for (const strip of this.manager.getConnected()) {
      const { stripId, bufferedFrames, reportedStats } = strip
      this.pub(`${P}/strip/${stripId}/fps`,     String((reportedStats?.measuredFps ?? 0).toFixed(1)), true)
      this.pub(`${P}/strip/${stripId}/buffer`,  String(bufferedFrames), true)
      this.pub(`${P}/strip/${stripId}/drops`,   String(reportedStats?.drops ?? 0), true)
      this.pub(`${P}/strip/${stripId}/latency`, String((reportedStats?.avgLatencyMs ?? 0).toFixed(1)), true)
    }
  }

  private subscribeCommands(): void {
    this.client!.subscribe([
      `${P}/light/set`,
      `${P}/cycle/set`,
      `${P}/next/set`,
    ])
  }

  private handleCommand(topic: string, payload: string): void {
    const runner = this.getRunner()

    if (topic === `${P}/light/set`) {
      let cmd: { state?: string; brightness?: number }
      try {
        cmd = JSON.parse(payload) as { state?: string; brightness?: number }
      } catch {
        logger.warn('MQTT: invalid light command payload', { payload })
        return
      }
      if (typeof cmd.brightness === 'number') {
        runner.setBrightness(cmd.brightness / 255)
      }
      if (cmd.state === 'ON') runner.turnOn()
      else if (cmd.state === 'OFF') runner.turnOffCommand()
    } else if (topic === `${P}/cycle/set`) {
      if (runner.getCycleNames().includes(payload)) {
        runner.setCycle(payload)
      } else {
        logger.warn('MQTT: unknown cycle', { cycle: payload })
        return
      }
    } else if (topic === `${P}/next/set`) {
      runner.nextAlgorithm()
    }

    this.onManualCommand()
    this.publishState()
  }

  private pub(topic: string, payload: string, retain: boolean): void {
    this.client?.publish(topic, payload, { retain })
  }

  private config(type: string, id: string, payload: Record<string, unknown>): void {
    this.client!.publish(
      `${this.discoveryPrefix}/${type}/doorbell_chime_${id}/config`,
      JSON.stringify(payload),
      { retain: true, qos: 1 },
    )
  }
}
