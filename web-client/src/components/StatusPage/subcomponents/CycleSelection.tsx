import { FC, useCallback, useState, FormEvent } from 'react';
import { FormGroup, HTMLSelect } from '@blueprintjs/core';
import { useAtomValue } from 'jotai';

import { CurrentCycleStatus } from '@app/atoms/status';
import { CycleNamesAtom } from '@app/atoms/cycles';

interface CycleSelectionProps {
    loading: boolean;
}

export const CycleSelection: FC<CycleSelectionProps> = ({ loading }) => {
    const [fetching, setFetching] = useState(false);

    const currentCycle = useAtomValue(CurrentCycleStatus);
    const cycles = useAtomValue(CycleNamesAtom);

    const updateCurrentCycle = useCallback((event: FormEvent<HTMLSelectElement>) => {
        const value = event.currentTarget.value;
        setFetching(true);
        fetch(`/api/actions/set_cycle/${value}`, { method: 'POST' }).then(() => {
            setFetching(false);
        });
    }, []);
    return (
        <FormGroup label="Current Cycle">
            <HTMLSelect disabled={fetching || loading} onChange={updateCurrentCycle} value={currentCycle} fill>
                {(cycles || []).map(cycle => (
                    <option key={cycle} value={cycle}>
                        {cycle}
                    </option>
                ))}
            </HTMLSelect>
        </FormGroup>
    );
};
