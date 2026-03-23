import { BaseAlgorithm, AlgorithmConfig } from "./_meta/index.js";

export interface AlgorithmModule {
    Algorithm: new (numPixels: number, settings: Record<string, unknown>) => BaseAlgorithm;
    config: AlgorithmConfig;
}

import { Algorithm as OffAlgorithm, config as offConfig } from "./off.js";
import { Algorithm as TransitionAlgorithm, config as transitionConfig } from "./transition.js";
import { Algorithm as BlankAlgorithm, config as blankConfig } from "./blank.js";
import { Algorithm as WhiteAlgorithm, config as whiteConfig } from "./white.js";
import { Algorithm as SingleColorAlgorithm, config as singleColorConfig } from "./singleColor.js";
import { Algorithm as KittAlgorithm, config as kittConfig } from "./kitt.js";
import { Algorithm as RainbowAlgorithm } from "./rainbow/rainbow.js";
import { config as rainbowConfig } from "./rainbow/config.js";
import { Algorithm as TwinklesAlgorithm } from "./twinkles/twinkles.js";
import { config as twinklesConfig } from "./twinkles/config.js";
import { Algorithm as LightningAlgorithm } from "./lightning/lightning.js";
import { config as lightningConfig } from "./lightning/config.js";
import { Algorithm as MarchAlgorithm } from "./march/march.js";
import { config as marchConfig } from "./march/config.js";
import { Algorithm as PulseSwitchAlgorithm } from "./pulseSwitch/pulseSwitch.js";
import { config as pulseSwitchConfig } from "./pulseSwitch/config.js";
import { Algorithm as SplitRainbowAlgorithm } from "./splitRainbow/splitRainbow.js";
import { config as splitRainbowConfig } from "./splitRainbow/config.js";
import { Algorithm as TwoColorWaveAlgorithm } from "./twoColorWave/wave.js";
import { config as twoColorWaveConfig } from "./twoColorWave/config.js";
import { Algorithm as FlagWaveAlgorithm } from "./flagWave/flagWave.js";
import { config as flagWaveConfig } from "./flagWave/config.js";

export const algorithms: Record<string, AlgorithmModule> = {
    off: { Algorithm: OffAlgorithm, config: offConfig },
    transition: { Algorithm: TransitionAlgorithm, config: transitionConfig },
    white: { Algorithm: WhiteAlgorithm, config: whiteConfig },
    blank: { Algorithm: BlankAlgorithm, config: blankConfig },
    single_color: { Algorithm: SingleColorAlgorithm, config: singleColorConfig },
    kitt: { Algorithm: KittAlgorithm, config: kittConfig },
    rainbow: { Algorithm: RainbowAlgorithm, config: rainbowConfig },
    twinkles: { Algorithm: TwinklesAlgorithm, config: twinklesConfig },
    lightning: { Algorithm: LightningAlgorithm, config: lightningConfig },
    march: { Algorithm: MarchAlgorithm, config: marchConfig },
    pulse_switch: { Algorithm: PulseSwitchAlgorithm, config: pulseSwitchConfig },
    split_rainbow: { Algorithm: SplitRainbowAlgorithm, config: splitRainbowConfig },
    two_color_wave: { Algorithm: TwoColorWaveAlgorithm, config: twoColorWaveConfig },
    flag_wave: { Algorithm: FlagWaveAlgorithm, config: flagWaveConfig },
};
