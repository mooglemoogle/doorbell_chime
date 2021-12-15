/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC } from 'react';
import { SystemOn } from './SystemOn';
import { Brightness } from './Brightness';
import { H2 } from '@blueprintjs/core';

export const App: FC = () => {
    return (
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
            <div css={{ gridArea: 'main' }}>
                <H2 css={{ marginBottom: '30px' }}>Lights Control</H2>
                <div css={{ marginBottom: '30px' }}>
                    <SystemOn />
                </div>
                <div css={{ marginBottom: '30px' }}>
                    <Brightness />
                </div>
            </div>
        </div>
    );
};
