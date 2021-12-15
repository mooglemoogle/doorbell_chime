/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC, useCallback, useState, useEffect, FormEvent } from 'react';
import { Switch } from '@blueprintjs/core';

export const SystemOn: FC = () => {
    const [isOn, setIsOn] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        fetch('/api/settings/running')
            .then(response => response.json())
            .then(({ running }) => {
                setHasFetched(true);
                setIsOn(running);
            });
    });
    const toggleLights = useCallback(
        (event: FormEvent<HTMLInputElement>) => {
            const value = event.currentTarget.checked;
            setHasFetched(false);
            fetch(`/api/settings/running/${value}`, { method: 'POST' }).then(() => {
                setIsOn(value);
                setHasFetched(true);
            });
        },
        [isOn],
    );
    return (
        <Switch
            large
            disabled={!hasFetched}
            label={'System is'}
            checked={isOn}
            alignIndicator={'right'}
            innerLabel="OFF"
            innerLabelChecked="ON"
            onChange={toggleLights}
        />
    );
};
