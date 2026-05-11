import { FC } from 'react';
import { Provider } from 'jotai';

import { GlobalStyles } from '@components/GlobalStyles';
import { Router } from '@components/Router';
import { CustomThemeProvider } from '@utils/theming/theme';

export const App: FC = () => {
    return (
        <>
            <GlobalStyles />
            <Provider>
                <CustomThemeProvider>
                    <Router />
                </CustomThemeProvider>
            </Provider>
        </>
    );
};
