/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC, useCallback, useState, FormEvent } from 'react';
import { FormGroup, HTMLSelect } from '@blueprintjs/core';
import { UpdateStatusCallback } from './App';

interface CycleSelectionProps {
    cycles: string[];
    currentCycle: string;
    loading: boolean;
    updateLocalStatus: UpdateStatusCallback;
}

export const CycleSelection: FC<CycleSelectionProps> = ({ cycles, currentCycle, loading, updateLocalStatus }) => {
    const [fetching, setFetching] = useState(false);

    const updateCurrentCycle = useCallback(
        (event: FormEvent<HTMLSelectElement>) => {
            const value = event.currentTarget.value;
            setFetching(true);
            fetch(`/api/actions/set_cycle/${value}`, { method: 'POST' }).then(() => {
                setFetching(false);
                updateLocalStatus({ current_cycle: value });
            });
        },
        [updateLocalStatus],
    );
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
