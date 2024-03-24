import { ThemeProvider } from '@emotion/react';
import { FC, PropsWithChildren } from 'react';

import { baseTheme } from './baseTheme';

export const CustomThemeProvider: FC<PropsWithChildren> = ({ children }) => {
    return (
        <ThemeProvider theme={baseTheme}>
            <ThemeProvider theme={{}}>{children}</ThemeProvider>
        </ThemeProvider>
    );
};
