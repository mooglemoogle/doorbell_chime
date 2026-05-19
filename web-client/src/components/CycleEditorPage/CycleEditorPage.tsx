import { FC, useEffect, useState } from 'react';
import { Button, Card, Collapse, FormGroup, H2, HTMLSelect, Icon } from '@blueprintjs/core';
import { useAtomValue, useSetAtom } from 'jotai';

import { CycleNamesAtom, FetchCycleNamesAtom } from '@atoms/cycles';
import { SettingsEditor } from '@components/SettingsEditor/SettingsEditor';
import { fetchCycleDetail, saveCycle, CycleDetail, CycleEntryDetail } from '@services/cycles';

export const CycleEditorPage: FC = () => {
    const fetchCycleNames = useSetAtom(FetchCycleNamesAtom);
    const cycleNames = useAtomValue(CycleNamesAtom);

    const [selectedName, setSelectedName] = useState('');
    const [entries, setEntries] = useState<CycleEntryDetail[]>([]);
    const [detail, setDetail] = useState<CycleDetail | null>(null);
    const [openSet, setOpenSet] = useState<Set<number>>(new Set([0]));
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        fetchCycleNames();
    }, [fetchCycleNames]);

    useEffect(() => {
        if (cycleNames.length > 0 && !selectedName) {
            setSelectedName(cycleNames[0]);
        }
    }, [cycleNames, selectedName]);

    useEffect(() => {
        if (!selectedName) return;
        setSaveStatus('idle');
        fetchCycleDetail(selectedName).then(d => {
            setDetail(d);
            setEntries(d.cycles);
            setOpenSet(new Set([0]));
        });
    }, [selectedName]);

    const toggleOpen = (i: number) => {
        setOpenSet(prev => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
        });
    };

    const handleOptionsChange = (index: number, options: Record<string, unknown>) => {
        setEntries(prev => prev.map((e, i) => i === index ? { ...e, options } : e));
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        if (!detail) return;
        setSaving(true);
        setSaveStatus('idle');
        try {
            await saveCycle({ ...detail, cycles: entries });
            setSaveStatus('success');
        } catch {
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div css={{ display: 'flex', flexDirection: 'column', padding: '20px', gap: '20px' }}>
            <H2>Cycle Editor</H2>
            <div css={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                <FormGroup label="Cycle" css={{ marginBottom: 0 }}>
                    <HTMLSelect
                        value={selectedName}
                        onChange={e => setSelectedName(e.currentTarget.value)}
                    >
                        {cycleNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </HTMLSelect>
                </FormGroup>
                <Button
                    intent="primary"
                    loading={saving}
                    disabled={!detail}
                    onClick={handleSave}
                >
                    Save
                </Button>
                {saveStatus === 'success' && (
                    <span css={{ color: '#3dcc91', fontSize: '13px' }}>Saved</span>
                )}
                {saveStatus === 'error' && (
                    <span css={{ color: '#ff7373', fontSize: '13px' }}>Error saving</span>
                )}
            </div>
            <div css={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.map((entry, i) => {
                    const isOpen = openSet.has(i);
                    const displayName = entry.algorithmConfig?.name ?? entry.algorithm;
                    return (
                        <Card key={i} css={{ padding: 0 }}>
                            <div
                                role="button"
                                onClick={() => toggleOpen(i)}
                                css={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                            >
                                <div css={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon icon={isOpen ? 'chevron-down' : 'chevron-right'} />
                                    <span css={{ fontWeight: 600 }}>{displayName}</span>
                                </div>
                                <span css={{ color: '#888', fontSize: '13px' }}>
                                    {entry.seconds_in_cycle}s
                                </span>
                            </div>
                            <Collapse isOpen={isOpen}>
                                <div css={{ padding: '0 16px 16px' }}>
                                    {entry.algorithmConfig ? (
                                        <SettingsEditor
                                            schema={entry.algorithmConfig.options}
                                            values={entry.options}
                                            onChange={v => handleOptionsChange(i, v)}
                                        />
                                    ) : (
                                        <span css={{ color: '#888', fontSize: '13px' }}>
                                            No configurable settings
                                        </span>
                                    )}
                                </div>
                            </Collapse>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
