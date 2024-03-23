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
                fontFamily: 'Fira Sans, Helvetica Neue, sans-serif',
            },
        }}
    />
);
