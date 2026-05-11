import { Global } from '@emotion/react';

export const GlobalStyles = () => (
    <Global
        styles={{
            'html, body': {
                overflowX: 'hidden',
            },
            body: {
                margin: 0,
                padding: 0,
                width: '100vw',
                height: '100vh',
                fontFamily: 'Fira Sans, Helvetica Neue, sans-serif',
            },
            '#root': {
                width: '100%',
                height: '100%',
            },
        }}
    />
);
