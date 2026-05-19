import { FC, useCallback, useEffect, useRef, useState } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { Button, Drawer, DrawerSize, HTMLSelect, Label, Slider } from '@blueprintjs/core'
import { useTheme } from '@emotion/react'
import { getAlgorithmNames, getAlgorithmSource, getAlgorithmConfig } from '@services/algorithms'
import { SettingsEditor } from '@components/SettingsEditor/SettingsEditor'
import type { OptionsSchema } from '@services/algorithms'
import { compileAndInstantiate, parseConfigSource } from '@app/algorithmRuntime/compileAlgorithm'
import { AlgorithmRunner } from '@app/algorithmRuntime/algorithmRunner'
import { Pixel } from '@app/algorithmRuntime/pixel'
import { StripVisualizer } from './StripVisualizer'
import type { editor as MonacoEditor } from 'monaco-editor'

const MONACO_TYPES = `
declare interface AlgorithmConfig {
  name: string;
  refresh_rate: number;
  options: Record<string, unknown>;
}
declare class Pixel {
  hue: number; sat: number; val: number; white: number;
  constructor(hue?: number, sat?: number, val?: number, white?: number);
  set(hue: number, sat: number, val: number, white?: number): void;
  clear(): void;
  multiply(value: number): Pixel;
  diff(other: Pixel): Pixel;
  combineWith(other: Pixel): void;
  fromRgb(r: number, g: number, b: number): void;
  getRawRgb(): [number, number, number];
  getRgb(brightness: number): [number, number, number];
  getRgbw(brightness: number): [number, number, number, number];
}
declare class BaseAlgorithm {
  readonly name: string;
  pixels: Pixel[];
  protected readonly config: AlgorithmConfig;
  constructor(numPixels: number, config: AlgorithmConfig, settings: Record<string, unknown>);
  refreshRate(): number;
  settings(): Record<string, unknown>;
  runCycle(elapsedMillis: number, elapsedSeconds: number): boolean;
}
declare class Pulse {
  location: number; color: Pixel; size: number; dropOffRight: number; dropOffLeft: number;
  constructor(location: number, color: Pixel, size: number, dropOffRight: number, dropOffLeft: number);
  applyPulse(pixels: Pixel[]): void;
}
declare function getMillis(): number;
declare function bezierBlend(t: number): number;
declare function hsvToRgb(h: number, s: number, v: number): [number, number, number];
`

const DEFAULT_CONFIG = `export const config: AlgorithmConfig = {
  name: 'MyAlgorithm',
  refresh_rate: 60,
  options: {},
}
`

const DEFAULT_ALGORITHM = `export class Algorithm extends BaseAlgorithm {
  private hueOffset = 0

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
  }

  runCycle(_elapsedMillis: number, elapsedSeconds: number): boolean {
    this.hueOffset = (elapsedSeconds * 0.1) % 1
    for (let i = 0; i < this.pixels.length; i++) {
      const hue = (this.hueOffset + i / this.pixels.length) % 1
      this.pixels[i].set(hue, 1, 0.8)
    }
    return super.runCycle(_elapsedMillis, elapsedSeconds)
  }
}
`

const EDITOR_OPTIONS = {
    minimap: { enabled: false },
    fontSize: 13,
    scrollBeyondLastLine: false,
    tabSize: 2,
}

const runner = new AlgorithmRunner()

type Tab = 'config' | 'algorithm'

export const PlaygroundPage: FC = () => {
    const theme = useTheme()
    const [algorithmNames, setAlgorithmNames] = useState<string[]>([])
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('')
    const [numLeds, setNumLeds] = useState(60)
    const [pixels, setPixels] = useState<Pixel[]>([])
    const [error, setError] = useState<string | null>(null)
    const [running, setRunning] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('config')
    const [optionsSchema, setOptionsSchema] = useState<OptionsSchema | null>(null)
    const [settings, setSettings] = useState<Record<string, unknown>>({})
    const [settingsOpen, setSettingsOpen] = useState(false)

    const configEditorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const algorithmEditorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const monacoReady = useRef(false)
    const configDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        getAlgorithmNames()
            .then(names => setAlgorithmNames(names))
            .catch(() => setAlgorithmNames([]))
    }, [])

    useEffect(() => () => { runner.stop() }, [])

    const setupMonaco = useCallback((_editor: MonacoEditor.IStandaloneCodeEditor, monaco: Parameters<OnMount>[1]) => {
        if (monacoReady.current) return
        monacoReady.current = true
        monaco.languages.typescript.typescriptDefaults.addExtraLib(MONACO_TYPES, 'file:///algorithm-runtime.d.ts')
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            noLib: true,
            allowNonTsExtensions: true,
        })
    }, [])

    const handleConfigMount: OnMount = useCallback((editor, monaco) => {
        configEditorRef.current = editor
        setupMonaco(editor, monaco)
        editor.onDidChangeModelContent(() => {
            if (configDebounce.current) clearTimeout(configDebounce.current)
            configDebounce.current = setTimeout(() => {
                const parsed = parseConfigSource(editor.getValue())
                if (!parsed) return
                const schema = parsed as OptionsSchema
                setOptionsSchema(schema)
                setSettings(prev => {
                    const defaults = (schema.default ?? {}) as Record<string, unknown>
                    const props = schema.properties ?? {}
                    // Keep existing values, add missing keys from defaults, drop removed keys
                    const next: Record<string, unknown> = {}
                    for (const key of Object.keys(props)) {
                        next[key] = key in prev ? prev[key] : defaults[key]
                    }
                    return next
                })
            }, 400)
        })
    }, [setupMonaco])

    const handleAlgorithmMount: OnMount = useCallback((editor, monaco) => {
        algorithmEditorRef.current = editor
        setupMonaco(editor, monaco)
    }, [setupMonaco])

    const handleTabChange = useCallback((tab: Tab) => {
        setActiveTab(tab)
        requestAnimationFrame(() => {
            if (tab === 'config') configEditorRef.current?.layout()
            else algorithmEditorRef.current?.layout()
        })
    }, [])

    const handleAlgorithmSelect = useCallback(async (name: string) => {
        setSelectedAlgorithm(name)
        if (!name) { setOptionsSchema(null); setSettings({}); return }
        try {
            const [source, cfg] = await Promise.all([
                getAlgorithmSource(name),
                getAlgorithmConfig(name),
            ])
            configEditorRef.current?.setValue(source.config)
            algorithmEditorRef.current?.setValue(source.algorithm)
            setOptionsSchema(cfg.options)
            setSettings(cfg.options.default ?? {})
            setError(null)
        } catch {
            setError(`Could not load source for "${name}"`)
        }
    }, [])

    const handleRun = useCallback(() => {
        runner.stop()
        setError(null)
        try {
            const config = configEditorRef.current?.getValue() ?? ''
            const algorithm = algorithmEditorRef.current?.getValue() ?? ''
            const instance = compileAndInstantiate(config + '\n\n' + algorithm, numLeds, settings)
            runner.start(instance, newPixels => setPixels(newPixels))
            setRunning(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
            setRunning(false)
        }
    }, [numLeds, settings])

    const handleStop = useCallback(() => {
        runner.stop()
        setRunning(false)
    }, [])

    const tabStyle = (active: boolean) => ({
        padding: '6px 16px',
        fontSize: '13px',
        fontFamily: 'monospace',
        background: active ? '#1e1e1e' : '#2d2d2d',
        color: active ? '#d4d4d4' : '#888',
        border: 'none',
        borderBottom: active ? '2px solid #007acc' : '2px solid transparent',
        cursor: 'pointer' as const,
    })

    return (
        <div css={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            <h2 css={{ margin: 0, color: theme.colors.text.primary }}>Algorithm Playground</h2>

            <div css={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                <Label css={{ margin: 0 }}>
                    Algorithm
                    <HTMLSelect
                        value={selectedAlgorithm}
                        onChange={e => handleAlgorithmSelect(e.target.value)}
                        options={[
                            { value: '', label: '— select to load —' },
                            ...algorithmNames.map(n => ({ value: n, label: n })),
                        ]}
                    />
                </Label>

                <Label css={{ margin: 0, minWidth: '200px' }}>
                    {`LEDs: ${numLeds}`}
                    <Slider
                        min={10}
                        max={300}
                        stepSize={10}
                        value={numLeds}
                        onChange={setNumLeds}
                        labelStepSize={100}
                    />
                </Label>

                <div css={{ display: 'flex', gap: '8px' }}>
                    <Button intent="success" icon="play" onClick={handleRun} disabled={running}>Run</Button>
                    <Button icon="stop" onClick={handleStop} disabled={!running}>Stop</Button>
                    <Button
                        icon="settings"
                        onClick={() => setSettingsOpen(o => !o)}
                        active={settingsOpen}
                        disabled={!optionsSchema}
                        title="Algorithm settings"
                    />
                </div>
            </div>

            <div css={{ background: '#111', borderRadius: '6px', padding: '8px' }}>
                <StripVisualizer pixels={pixels.length > 0 ? pixels : Array.from({ length: numLeds }, () => new Pixel())} />
            </div>

            <Drawer
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                title="Settings"
                position="right"
                size={DrawerSize.SMALL}
                hasBackdrop={false}
                canOutsideClickClose={false}
            >
                <div css={{ padding: '16px', overflowY: 'auto' }}>
                    {optionsSchema && (
                        <SettingsEditor schema={optionsSchema} values={settings} onChange={setSettings} />
                    )}
                </div>
            </Drawer>

            <div css={{ flex: 1, minHeight: '400px', border: '1px solid #444', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Tab bar */}
                <div css={{ display: 'flex', background: '#2d2d2d', borderBottom: '1px solid #444' }}>
                    <button style={tabStyle(activeTab === 'config')} onClick={() => handleTabChange('config')}>
                        config.ts
                    </button>
                    <button style={tabStyle(activeTab === 'algorithm')} onClick={() => handleTabChange('algorithm')}>
                        algorithm.ts
                    </button>
                </div>

                {/* Both editors always mounted; inactive one hidden so Monaco keeps its layout */}
                <div css={{ flex: 1, position: 'relative' }}>
                    <div css={{ position: 'absolute', inset: 0, display: activeTab === 'config' ? 'flex' : 'none', flexDirection: 'column' }}>
                        <Editor
                            defaultLanguage="typescript"
                            defaultValue={DEFAULT_CONFIG}
                            onMount={handleConfigMount}
                            theme="vs-dark"
                            options={EDITOR_OPTIONS}
                        />
                    </div>
                    <div css={{ position: 'absolute', inset: 0, display: activeTab === 'algorithm' ? 'flex' : 'none', flexDirection: 'column' }}>
                        <Editor
                            defaultLanguage="typescript"
                            defaultValue={DEFAULT_ALGORITHM}
                            onMount={handleAlgorithmMount}
                            theme="vs-dark"
                            options={EDITOR_OPTIONS}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div css={{
                    background: '#3b1111',
                    border: '1px solid #c43434',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    color: '#ff8080',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                }}>
                    {error}
                </div>
            )}
        </div>
    )
}
