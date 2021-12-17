/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC, useCallback, useState, useEffect } from 'react';
import { FormGroup, Slider } from '@blueprintjs/core';

const formatLabel = (value: number) => {
    return `${value}%`;
};

const formatValue = (value: number) => {
    return (value / 100.0).toFixed(2);
};

export const Brightness: FC = () => {
    const [brightness, setBrightness] = useState(0.0);
    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        fetch('/api/settings/brightness')
            .then(response => response.json())
            .then(({ brightness }) => {
                setHasFetched(true);
                setBrightness(brightness);
            });
    }, []);
    const updateLocalBrightness = useCallback((value: number) => {
        setBrightness(parseFloat(formatValue(value)));
    }, []);
    const updateBrightness = useCallback(
        (value: number) => {
            setHasFetched(false);
            fetch(`/api/settings/brightness/${brightness.toFixed(2)}`, { method: 'POST' }).then(() => {
                setHasFetched(true);
            });
        },
        [brightness],
    );
    return (
        <FormGroup label="Brightness">
            <Slider
                disabled={!hasFetched}
                min={0}
                max={100}
                stepSize={1}
                labelStepSize={20}
                labelRenderer={formatLabel}
                value={parseInt((brightness * 100).toFixed(0))}
                onChange={updateLocalBrightness}
                onRelease={updateBrightness}
            />
        </FormGroup>
    );
};
