declare module '@emotion/react' {
    export interface Theme {
        colors: BaseColors;
        components: ComponentTheme;
    }
}

import { Theme } from '@emotion/react';

export type AppTheme = Theme | ((theme: Theme) => Theme);

export interface BaseColors {
    primary: {
        light: string;
        main: string;
        dark: string;
    };
    secondary: {
        light: string;
        main: string;
        dark: string;
    };
    tertiary: {
        light: string;
        main: string;
        dark: string;
    };
    background: string;
    common: {
        black: string;
        white: string;
    };
    text: {
        primary: string;
        secondary: string;

        onContrast: string;
        onContrastSecondary: string;
    };
}

export interface ComponentTheme {
    sidebar: any;
}
