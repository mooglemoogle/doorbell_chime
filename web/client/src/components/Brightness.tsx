/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC, useCallback, useState, useEffect } from 'react';
import { FormGroup, Slider } from '@blueprintjs/core';
import { UpdateStatusCallback } from './App';

const formatLabel = (value: number) => {
    return `${value}%`;
};

const formatValue = (value: number) => {
    return (value / 100.0).toFixed(2);
};

interface BrightnessProps {
    brightness: number;
    loading: boolean;
    updateLocalStatus: UpdateStatusCallback;
}

export const Brightness: FC<BrightnessProps> = ({ brightness, loading, updateLocalStatus }) => {
    const [localBrightness, setBrightness] = useState(brightness);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        setBrightness(brightness);
    }, [brightness]);
    const updateLocalBrightness = useCallback((value: number) => {
        setBrightness(parseFloat(formatValue(value)));
    }, []);
    const updateBrightness = useCallback(
        (value: number) => {
            setFetching(true);
            fetch(`/api/actions/set_brightness/${localBrightness.toFixed(2)}`, { method: 'POST' }).then(() => {
                setFetching(false);
                updateLocalStatus({ brightness: localBrightness });
            });
        },
        [localBrightness, updateLocalStatus],
    );
    return (
        <FormGroup label="Brightness">
            <Slider
                disabled={fetching || loading}
                min={0}
                max={100}
                stepSize={1}
                labelStepSize={20}
                labelRenderer={formatLabel}
                value={parseInt((localBrightness * 100).toFixed(0))}
                onChange={updateLocalBrightness}
                onRelease={updateBrightness}
            />
        </FormGroup>
    );
};
