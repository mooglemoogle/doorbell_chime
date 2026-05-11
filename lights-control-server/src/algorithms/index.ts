import { BaseAlgorithm, AlgorithmConfig } from "./_meta/index";

export interface AlgorithmModule {
    Algorithm: new (numPixels: number, settings: Record<string, unknown>) => BaseAlgorithm;
    config: AlgorithmConfig;
}

import { Algorithm as OffAlgorithm, config as offConfig } from "./off";
import { Algorithm as TransitionAlgorithm, config as transitionConfig } from "./transition";
import { Algorithm as BlankAlgorithm, config as blankConfig } from "./blank";
import { Algorithm as WhiteAlgorithm, config as whiteConfig } from "./white";
import { Algorithm as SingleColorAlgorithm, config as singleColorConfig } from "./singleColor";
import { Algorithm as KittAlgorithm, config as kittConfig } from "./kitt";
import { Algorithm as RainbowAlgorithm } from "./rainbow/rainbow";
import { config as rainbowConfig } from "./rainbow/config";
import { Algorithm as TwinklesAlgorithm } from "./twinkles/twinkles";
import { config as twinklesConfig } from "./twinkles/config";
import { Algorithm as LightningAlgorithm } from "./lightning/lightning";
import { config as lightningConfig } from "./lightning/config";
import { Algorithm as MarchAlgorithm } from "./march/march";
import { config as marchConfig } from "./march/config";
import { Algorithm as PulseSwitchAlgorithm } from "./pulseSwitch/pulseSwitch";
import { config as pulseSwitchConfig } from "./pulseSwitch/config";
import { Algorithm as SplitRainbowAlgorithm } from "./splitRainbow/splitRainbow";
import { config as splitRainbowConfig } from "./splitRainbow/config";
import { Algorithm as TwoColorWaveAlgorithm } from "./twoColorWave/wave";
import { config as twoColorWaveConfig } from "./twoColorWave/config";
import { Algorithm as FlagWaveAlgorithm } from "./flagWave/flagWave";
import { config as flagWaveConfig } from "./flagWave/config";

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
