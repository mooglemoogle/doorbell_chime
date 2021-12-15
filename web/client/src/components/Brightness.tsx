/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC, useCallback, useState, useEffect } from 'react';
import { FormGroup, Slider } from '@blueprintjs/core';

const formatLabel = (value: number) => {
    return `${value}%`;
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
    });
    const updateBrightness = useCallback(
        (value: number) => {
            setHasFetched(false);
            fetch(`/api/settings/brightness/${(value / 100.0).toFixed(2)}`, { method: 'POST' }).then(() => {
                setBrightness(value);
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
                value={brightness * 100}
                onRelease={updateBrightness}
            />
        </FormGroup>
    );
};
