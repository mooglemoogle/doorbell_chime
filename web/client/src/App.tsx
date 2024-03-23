import { FC } from 'react';
import { StatusPage } from './components/StatusPage/StatusPage';
import { GlobalStyles } from './components/GlobalStyles';
import { Provider } from 'jotai';

export const App: FC = () => {
    return (
        <>
            <GlobalStyles />
            <Provider>
                <div
                    css={{
                        display: 'grid',
                        gridTemplateRows: '30px auto',
                        gridTemplateColumns: 'auto 350px auto',
                        gridTemplateAreas: `
                        '. . .'
                        '. main .'
                    `,
                    }}
                >
                    <StatusPage css={{ gridArea: 'main' }} />
                </div>
            </Provider>
        </>
    );
};
