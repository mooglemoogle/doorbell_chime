import React, { FC } from 'react';
import { useOutlet } from 'react-router-dom';
import { useTheme } from '@emotion/react';

import { Sidebar } from './Menu/Sidebar';
import { MainMenuItem } from '@app/types/UI';

export const MainPage: FC = () => {
    const outlet = useOutlet();
    const theme = useTheme();

    const mainMenuItems: MainMenuItem[] = [
        {
            name: 'Home',
            location: '/',
            icon: 'home',
        },
    ];

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
            <Sidebar css={{ gridArea: 'sidebar' }} menuItems={mainMenuItems} />
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
