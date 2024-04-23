import { FC } from 'react';
import { IconName, Icon } from '@blueprintjs/core';
import { useTheme } from '@emotion/react';
import { NavLink, NavLinkProps } from 'react-router-dom';
import { MainMenuItem } from '@app/types/UI';

interface ButtonProps extends NavLinkProps {
    icon: IconName;
    className?: string;
    name?: string;
}

const SidebarButton: FC<ButtonProps> = ({ name, className, ...props }) => {
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
    menuItems: MainMenuItem[];
}

export const Sidebar: FC<SidebarProps> = ({ className, menuItems }) => {
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
            {menuItems.map(item => (
                <SidebarButton icon={item.icon} to={item.location} name={item.name} />
            ))}
        </div>
    );
};
