import { LightConfig } from "./lightConfig.js";
import { LightStrip } from "./lightStrip.js";
import { Status } from "./status.js";
import { Cycles } from "./cycles.js";
import { Cycle } from "./cycle.js";
import { CommandWatcher, Command } from "./commandWatcher.js";
import { algorithms } from "./algorithms/index.js";
import { BaseAlgorithm } from "./algorithms/_meta/index.js";
import { Algorithm as OffAlgorithm } from "./algorithms/off.js";
import { Algorithm as TransitionAlgorithm } from "./algorithms/transition.js";

const isDevMode = process.env["MODE"] === "DEVELOPMENT";

export class Runner {
    private readonly lightConfig: LightConfig;
    private readonly status: Status;
    private readonly cycles: Cycles;
    private currentCycle: Cycle;
    private cycleIndex = 0;
    private lightStrips: LightStrip[] = [];
    private readonly offAlg: OffAlgorithm;
    private readonly transitionAlg: TransitionAlgorithm;
    private curAlg: BaseAlgorithm;
    private nextAlg: BaseAlgorithm;
    private lastCycleTime = Date.now();
    private lastChangeTime = Date.now();
    private nextCycleLength = Infinity;
    private readonly commandWatcher: CommandWatcher;

    constructor() {
        this.lightConfig = new LightConfig();
        this.status = new Status();
        this.cycles = new Cycles();
        this.currentCycle = this.cycles.getCycle(this.status.getValue("current_cycle"));

        console.log(`status: ${JSON.stringify(this.status.properties)}`);

        this.initializeLightStrips();

        const numPx = this.numPixels();
        this.offAlg = new OffAlgorithm(numPx, {});
        this.transitionAlg = new TransitionAlgorithm(numPx, {
            transition_time: this.transitionTime(),
        });
        this.curAlg = this.offAlg;
        this.nextAlg = this.offAlg;

        this.refreshAlgorithms();
        this.commandWatcher = new CommandWatcher();
    }

    numPixels(): number {
        return this.lightStrips.reduce((acc, strip) => acc + strip.numPixels(), 0);
    }

    brightness(): number {
        return this.status.getValue("brightness");
    }

    transitionTime(): number {
        return this.status.getValue("transition_time");
    }

    refreshRate(): number {
        return this.curAlg.refreshRate();
    }

    private async initializeLightStrips(): Promise<void> {
        const configs = this.lightConfig.lightStrips;
        this.lightStrips = configs.map((cfg, i) => new LightStrip(i, cfg));
        for (const strip of this.lightStrips) await strip.initialize();
    }

    private refreshAlgorithms(): void {
        this.cycleIndex = -1;
        const cycle = this.currentCycle.cycles;
        if (cycle.length === 0 || !this.status.getValue("running")) {
            this.turnOff();
        } else {
            this.nextAlgorithm();
        }
    }

    nextAlgorithm(): void {
        const cycle = this.currentCycle.cycles;
        this.cycleIndex++;
        if (this.cycleIndex >= cycle.length) this.cycleIndex = 0;

        const nextEntry = cycle[this.cycleIndex];
        this.nextCycleLength = nextEntry.seconds_in_cycle;
        const mod = algorithms[nextEntry.algorithm];
        if (!mod) throw new Error(`Unknown algorithm: ${nextEntry.algorithm}`);
        if (isDevMode) {
            console.log(`New Algorithm: ${mod.config.name}`);
        }

        this.nextAlg = new mod.Algorithm(this.numPixels(), nextEntry.options);
        this.startTransition();
    }

    turnOff(): void {
        this.cycleIndex = -1;
        this.nextAlg = this.offAlg;
        this.offAlg.setHueSat(this.curAlg.pixels);
        this.startTransition();
    }

    private startTransition(): void {
        this.transitionAlg.reset(this.curAlg.pixels, this.nextAlg.pixels);
        this.curAlg = this.transitionAlg;
    }

    isOff(): boolean {
        return this.curAlg === this.offAlg;
    }

    isInTransition(): boolean {
        return this.curAlg === this.transitionAlg;
    }

    private applyLights(): void {
        const pixels = this.curAlg.pixels;
        for (const strip of this.lightStrips) {
            strip.applyLights(pixels, this.brightness());
        }
    }

    private changeCycle(cycleName: string): void {
        this.cycleIndex = -1;
        this.currentCycle = this.cycles.getCycle(cycleName);
        if (this.status.getValue("running") && !this.isOff()) {
            this.nextAlgorithm();
        }
    }

    private async onCommands(): Promise<void> {
        // Snapshot the list so we can iterate while markComplete mutates it
        for (const message of [...this.commandWatcher.commandsReceived]) {
            const command = message.command;
            let response: unknown = null;

            if (command === "next") {
                this.nextAlgorithm();
            } else if (command === "off" && !this.isOff()) {
                this.turnOff();
                this.status.setValue("running", false);
            } else if (command === "on" && this.isOff()) {
                this.nextAlgorithm();
                this.status.setValue("running", true);
            } else if (command === "set_brightness") {
                let brightness = parseFloat(message["brightness"] as string);
                brightness = Math.max(0.0, Math.min(1.0, brightness));
                this.status.setValue("brightness", brightness);
            } else if (command === "set_cycle") {
                const cycleName = message["name"] as string;
                this.status.setValue("current_cycle", cycleName);
                this.changeCycle(cycleName);
            } else if (command === "get_status") {
                response = this.status.properties;
            } else if (command === "get_cycles") {
                response = this.cycles.cycleNames;
            }

            await this.commandWatcher.markComplete(message, response);
        }
    }

    async runCycle(): Promise<void> {
        const thisCycleTime = Date.now();
        const sinceLastChange = (thisCycleTime - this.lastChangeTime) / 1000;
        const elapsed = (thisCycleTime - this.lastCycleTime) / 1000;

        this.commandWatcher.checkMessages();
        if (this.commandWatcher.commandsReceived.length > 0) {
            await this.onCommands();
        }

        if (!this.isOff()) {
            const done = this.curAlg.runCycle(elapsed * 1000, elapsed);
            this.applyLights();
            /* if (isDevMode) {
                console.log(`Running cycle. Cur Cycle: ${this.currentCycle.name}`);
                console.log(`Cur Alg: ${this.curAlg.name}`);
                console.log(`Next Alg: ${this.nextAlg.name}`);
            } */

            if (done) {
                if (isDevMode) console.log("Transition complete, moving to next algorithm");
                this.curAlg = this.nextAlg;
                this.lastChangeTime = thisCycleTime;
            } else if (!this.isInTransition() && sinceLastChange > this.nextCycleLength) {
                if (isDevMode) console.log("Cycle time over, starting transition to next algorithm");
                this.nextAlgorithm();
            }
        } else if (isDevMode) {
            // Lights are off — nothing to render
        }

        this.lastCycleTime = thisCycleTime;
    }

    destroy(): void {
        this.commandWatcher.destroy();
    }
}
