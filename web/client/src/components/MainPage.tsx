import React, { FC } from 'react';
import { useOutlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { useTheme } from '@emotion/react';

export const MainPage: FC = () => {
    const outlet = useOutlet();
    const theme = useTheme();

    return (
        <div
            css={{
                display: 'grid',
                gridTemplateAreas: '"sidebar mainArea"',
                gridTemplateColumns: `${theme.components.sidebar.width} calc(100% - ${theme.components.sidebar.width})`,
                gridTemplateRows: '100%',
                width: '100%',
                height: '100%',
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background,
            }}
        >
            <Sidebar css={{ gridArea: 'sidebar' }} />
            <div
                css={{
                    gridArea: 'mainArea',
                    padding: '20px',
                }}
            >
                {outlet}
            </div>
        </div>
    );
};
