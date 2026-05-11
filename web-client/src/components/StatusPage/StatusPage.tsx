import { FC, useCallback, useState } from 'react';
import { H2 } from '@blueprintjs/core';
import { useSetAtom } from 'jotai';
import { SystemOn } from './subcomponents/SystemOn';
import { Brightness } from './subcomponents/Brightness';
import { Command } from './subcomponents/Command';
import { CycleSelection } from './subcomponents/CycleSelection';
import { useInterval } from '@utils/useInterval';
import { FetchStatusAtom } from '@atoms/status';
import { FetchCycleNamesAtom } from '@atoms/cycles';

interface StatusPageProps {
    className?: string;
}

export const StatusPage: FC<StatusPageProps> = ({ className }) => {
    const [loading, setLoading] = useState(false);
    const fetchStatus = useSetAtom(FetchStatusAtom);
    const fetchCycleNames = useSetAtom(FetchCycleNamesAtom);

    const getUpdatedStatus = useCallback(() => {
        setLoading(true);
        const statusFetch = fetchStatus();
        const cyclesFetch = fetchCycleNames();
        Promise.all([statusFetch, cyclesFetch]).then(() => {
            setLoading(false);
        });
    }, []);

    useInterval(getUpdatedStatus, 30000);
    return (
        <div
            className={className}
            css={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                gap: '30px',
            }}
        >
            <H2>Lights Control</H2>
            <div>
                <SystemOn loading={loading} />
            </div>
            <div>
                <Brightness loading={loading} />
            </div>
            <div>
                <CycleSelection loading={loading} />
            </div>
            <div>
                <Command commandName="next" label="Next Pattern" />
            </div>
        </div>
    );
};
