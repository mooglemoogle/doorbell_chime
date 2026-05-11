import { FC, useCallback, FormEvent } from 'react';
import { Switch } from '@blueprintjs/core';
import { useAtomValue } from 'jotai';

import { RunningStatus } from '@app/atoms/status';
import { useUpdateStatus } from '@app/atoms/utilities';

interface SystemOnProps {
    loading: boolean;
}

export const SystemOn: FC<SystemOnProps> = ({ loading }) => {
    const isOn = useAtomValue(RunningStatus);
    const [updating, setRunning] = useUpdateStatus(RunningStatus);

    const toggleLights = useCallback(
        (event: FormEvent<HTMLInputElement>) => {
            const value = event.currentTarget.checked;
            setRunning(value);
        },
        [isOn],
    );
    return (
        <Switch
            large
            disabled={updating || loading}
            label={'System is'}
            checked={isOn}
            alignIndicator={'right'}
            innerLabel="OFF"
            innerLabelChecked="ON"
            onChange={toggleLights}
        />
    );
};
