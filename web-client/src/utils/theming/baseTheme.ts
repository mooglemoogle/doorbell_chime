import tinycolor from 'tinycolor2';

import { AppTheme } from '@app/types/theming';

const baseColors = {
    primary: {
        light: '#d4ddda',
        main: '#9CAFAA',
        dark: '#667f78',
    },
    secondary: {
        light: '#d6dac8',
        main: '#D6DAC8',
        dark: '#a9b18b',
    },
    tertiary: {
        light: '#efbc9b',
        main: '#EFBC9B',
        dark: '#e18143',
    },
    background: '#fefbfa',
    common: {
        black: '#000',
        white: '#fff',
    },
    text: {
        primary: '#2f251e',
        secondary: '#5f4b3e',
        onContrast: '#fefbfa',
        onContrastSecondary: '#fbeee7',
    },
};

export const baseTheme: AppTheme = {
    colors: baseColors,
    components: {
        sidebar: {
            width: '70px',
            backgroundColor: baseColors.primary.main,
            button: {
                color: baseColors.text.onContrast,
                backgroundColor: 'transparent',
                hover: {
                    backgroundColor: tinycolor(baseColors.common.black).setAlpha(0.1).toRgbString(),
                },
                active: {
                    backgroundColor: tinycolor(baseColors.common.black).setAlpha(0.2).toRgbString(),
                },
            },
        },
    },
};
