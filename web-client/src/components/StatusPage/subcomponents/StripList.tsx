import { FC, useCallback, useEffect, useState } from 'react';
import { Alert, Button, H4, Tag } from '@blueprintjs/core';
import { useInterval } from '@utils/useInterval';
import { getStrips, removeStrip, disableStrip, enableStrip, Strip } from '@services/strips';

export const StripList: FC = () => {
    const [strips, setStrips] = useState<Strip[]>([]);
    const [removeTarget, setRemoveTarget] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setStrips(await getStrips());
        } catch { /* server not reachable */ }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);
    useInterval(refresh, 5000);

    const handleDisable = useCallback(async (id: string) => {
        await disableStrip(id);
        refresh();
    }, [refresh]);

    const handleEnable = useCallback(async (id: string) => {
        await enableStrip(id);
        refresh();
    }, [refresh]);

    const handleRemoveConfirm = useCallback(async () => {
        if (!removeTarget) return;
        await removeStrip(removeTarget);
        setRemoveTarget(null);
        refresh();
    }, [removeTarget, refresh]);

    if (strips.length === 0) return null;

    return (
        <div>
            <H4 css={{ marginBottom: '12px' }}>Light Strips</H4>
            <div css={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {strips.map(strip => (
                    <div
                        key={strip.stripId}
                        css={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            gap: '12px',
                        }}
                    >
                        <div css={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                            <span css={{ fontWeight: 600, fontFamily: 'monospace' }}>{strip.stripId}</span>
                            <Tag
                                minimal
                                intent={strip.connected ? 'success' : 'none'}
                            >
                                {strip.connected ? 'Connected' : 'Disconnected'}
                            </Tag>
                            {strip.disabled && <Tag minimal intent="warning">Disabled</Tag>}
                            <span css={{ fontSize: '12px', opacity: 0.6 }}>
                                {strip.numPixels}px · offset {strip.pixelOffset} · {strip.bpp}bpp
                            </span>
                        </div>
                        <div css={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <Button
                                small
                                minimal
                                icon={strip.disabled ? 'eye-open' : 'eye-off'}
                                onClick={() => strip.disabled ? handleEnable(strip.stripId) : handleDisable(strip.stripId)}
                            >
                                {strip.disabled ? 'Enable' : 'Disable'}
                            </Button>
                            <Button
                                small
                                minimal
                                intent="danger"
                                icon="trash"
                                onClick={() => setRemoveTarget(strip.stripId)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <Alert
                isOpen={removeTarget !== null}
                intent="danger"
                icon="trash"
                confirmButtonText="Remove"
                cancelButtonText="Cancel"
                onConfirm={handleRemoveConfirm}
                onCancel={() => setRemoveTarget(null)}
            >
                <p>Remove <strong>{removeTarget}</strong> from the strip registry?</p>
                <p css={{ opacity: 0.7, fontSize: '13px' }}>
                    The strip will stop receiving frames. It will be re-added automatically if it reconnects.
                </p>
            </Alert>
        </div>
    );
};
