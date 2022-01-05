/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC, useCallback, useState } from 'react';
import { SystemOn } from './SystemOn';
import { Brightness } from './Brightness';
import { H2 } from '@blueprintjs/core';
import { Command } from './Command';
import { useInterval } from '../utils/useInterval';
import { CycleSelection } from './CycleSelection';

export interface Status {
    brightness: number;
    running: boolean;
    current_cycle: string;
    transition_time: number;
}

interface ActionResponse<T> {
    accepted: boolean;
    response: T;
}

export type UpdateStatusCallback = (newStatus: Partial<Status>) => void;

export const App: FC = () => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<Status>(null);
    const [cycles, setCycles] = useState<string[]>([]);

    const getUpdatedStatus = useCallback(() => {
        setLoading(true);
        const statusFetch = fetch('/api/actions/get_status')
            .then(response => response.json())
            .then((result: ActionResponse<Status>) => {
                setStatus(result.response);
            });
        const cyclesFetch = fetch('/api/actions/get_cycles')
            .then(response => response.json())
            .then((result: ActionResponse<string[]>) => {
                setCycles(result.response);
            });
        Promise.all([statusFetch, cyclesFetch]).then(() => {
            setLoading(false);
        });
    }, []);

    useInterval(getUpdatedStatus, 30000);

    const updateLocalStatus = useCallback(
        (newStatus: Partial<Status>) => {
            setStatus({ ...status, ...newStatus });
        },
        [status],
    );

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
                    <SystemOn loading={loading} isOn={status?.running} updateLocalStatus={updateLocalStatus} />
                </div>
                <div css={{ marginBottom: '30px' }}>
                    <Brightness
                        loading={loading}
                        brightness={status?.brightness}
                        updateLocalStatus={updateLocalStatus}
                    />
                </div>
                <div css={{ marginBottom: '30px' }}>
                    <CycleSelection
                        loading={loading}
                        cycles={cycles}
                        currentCycle={status?.current_cycle}
                        updateLocalStatus={updateLocalStatus}
                    />
                </div>
                <div css={{ marginBottom: '30px' }}>
                    <Command commandName="next" label="Next Pattern" />
                </div>
            </div>
        </div>
    );
};
