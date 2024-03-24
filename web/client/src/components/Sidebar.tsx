import { FC, PropsWithChildren } from 'react';
import { IconName, Icon } from '@blueprintjs/core';
import { useTheme } from '@emotion/react';

interface ButtonProps extends PropsWithChildren {
    icon: IconName;
    onClick?: () => void;
    className?: string;
}

const SidebarButton: FC<ButtonProps> = ({ children, ...props }) => {
    const theme = useTheme();
    return (
        <button
            {...props}
            css={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: theme.components.sidebar.width,
                height: theme.components.sidebar.width,
                backgroundColor: theme.components.sidebar.button.backgroundColor,
                color: theme.components.sidebar.button.color,
                borderRadius: 0,
                border: 'none',
                outlineOffset: '-2px',
                '&:hover': {
                    backgroundColor: theme.components.sidebar.button.hover.backgroundColor,
                },
                '&:active': {
                    backgroundColor: theme.components.sidebar.button.active.backgroundColor,
                },
            }}
        >
            <Icon
                css={{
                    color: theme.components.sidebar.button.color,
                }}
                size={25}
                icon={props.icon}
            />
            {children}
        </button>
    );
};

interface SidebarProps {
    className?: string;
}

export const Sidebar: FC<SidebarProps> = ({ className }) => {
    const theme = useTheme();

    return (
        <div
            className={className}
            css={{
                display: 'flex',
                flexDirection: 'column',
                width: theme.components.sidebar.width,
                backgroundColor: theme.components.sidebar.backgroundColor,
            }}
        >
            <SidebarButton icon="home" />
        </div>
    );
};
