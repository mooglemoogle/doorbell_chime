/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC, useCallback, useState, FormEvent } from 'react';
import { Switch } from '@blueprintjs/core';
import { UpdateStatusCallback } from './App';

interface SystemOnProps {
    isOn: boolean;
    loading: boolean;
    updateLocalStatus: UpdateStatusCallback;
}

export const SystemOn: FC<SystemOnProps> = ({ isOn = false, loading, updateLocalStatus }) => {
    const [fetching, setFetching] = useState(false);

    const toggleLights = useCallback(
        (event: FormEvent<HTMLInputElement>) => {
            const value = event.currentTarget.checked;
            setFetching(true);
            fetch(`/api/actions/${value ? 'on' : 'off'}`, { method: 'POST' }).then(() => {
                updateLocalStatus({ running: value });
                setFetching(false);
            });
        },
        [isOn, updateLocalStatus],
    );
    return (
        <Switch
            large
            disabled={fetching || loading}
            label={'System is'}
            checked={isOn}
            alignIndicator={'right'}
            innerLabel="OFF"
            innerLabelChecked="ON"
            onChange={toggleLights}
        />
    );
};
