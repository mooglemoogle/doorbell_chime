import { FC } from 'react';
import { IconName, Icon } from '@blueprintjs/core';
import { useTheme } from '@emotion/react';
import { NavLink, NavLinkProps } from 'react-router-dom';

interface ButtonProps extends NavLinkProps {
    icon: IconName;
    className?: string;
}

const SidebarButton: FC<ButtonProps> = ({ children, className, ...props }) => {
    const theme = useTheme();
    return (
        <NavLink
            {...props}
            className={({ isActive }) => {
                const newClass = className || '';
                return `${newClass} ${isActive ? 'active' : ''}`;
            }}
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
                    color: theme.components.sidebar.button.color,
                },
                '&:active, &.active': {
                    backgroundColor: theme.components.sidebar.button.active.backgroundColor,
                    color: theme.components.sidebar.button.color,
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
        </NavLink>
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
            <SidebarButton icon="home" to="/" />
        </div>
    );
};
