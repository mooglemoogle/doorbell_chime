import { FC, useCallback, useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { FormGroup, Slider } from '@blueprintjs/core';

import { BrightnessStatus } from '@app/atoms/status';
import { useUpdateStatus } from '@app/atoms/utilities';

const formatLabel = (value: number) => {
    return `${value}%`;
};

const formatValue = (value: number) => {
    return (value / 100.0).toFixed(2);
};

interface BrightnessProps {
    loading: boolean;
}

export const Brightness: FC<BrightnessProps> = ({ loading }) => {
    const brightness = useAtomValue(BrightnessStatus);
    const [updating, setBrightness] = useUpdateStatus(BrightnessStatus);
    const [localBrightness, setLocalBrightness] = useState(brightness);

    useEffect(() => {
        setLocalBrightness(brightness);
    }, [brightness]);
    const updateLocalBrightness = useCallback((value: number) => {
        setLocalBrightness(parseFloat(formatValue(value)));
    }, []);
    const updateBrightness = useCallback((_value: number) => setBrightness(localBrightness), [localBrightness]);
    return (
        <FormGroup label="Brightness">
            <Slider
                disabled={updating || loading}
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
