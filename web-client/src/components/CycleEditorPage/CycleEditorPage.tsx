import { FC, useEffect, useState } from 'react';
import { Button, Card, Collapse, FormGroup, H2, HTMLSelect, Icon, InputGroup, NumericInput } from '@blueprintjs/core';
import { useAtomValue, useSetAtom } from 'jotai';

import { CycleNamesAtom, FetchCycleNamesAtom } from '@atoms/cycles';
import { SettingsEditor } from '@components/SettingsEditor/SettingsEditor';
import { fetchCycleDetail, saveCycle, CycleDetail, CycleEntryDetail } from '@services/cycles';
import { getAlgorithmNames, getAlgorithmConfig } from '@services/algorithms';

const SYSTEM_ALGORITHMS = new Set(['off', 'transition', 'blank']);

const formatKey = (key: string) =>
    key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const CycleEditorPage: FC = () => {
    const fetchCycleNames = useSetAtom(FetchCycleNamesAtom);
    const cycleNames = useAtomValue(CycleNamesAtom);

    const [selectedName, setSelectedName] = useState('');
    const [cycleName, setCycleName] = useState('');
    const [entries, setEntries] = useState<CycleEntryDetail[]>([]);
    const [detail, setDetail] = useState<CycleDetail | null>(null);
    const [openSet, setOpenSet] = useState<Set<number>>(new Set([0]));
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const [algorithmKeys, setAlgorithmKeys] = useState<string[]>([]);
    const [addingEntry, setAddingEntry] = useState(false);
    const [newAlgorithmKey, setNewAlgorithmKey] = useState('');
    const [addingInProgress, setAddingInProgress] = useState(false);

    useEffect(() => {
        fetchCycleNames();
        getAlgorithmNames().then(keys => {
            const filtered = keys.filter(k => !SYSTEM_ALGORITHMS.has(k));
            setAlgorithmKeys(filtered);
            if (filtered.length > 0) setNewAlgorithmKey(filtered[0]);
        });
    }, [fetchCycleNames]);

    useEffect(() => {
        if (cycleNames.length > 0 && !selectedName) {
            setSelectedName(cycleNames[0]);
        }
    }, [cycleNames, selectedName]);

    useEffect(() => {
        if (!selectedName) return;
        setSaveStatus('idle');
        setAddingEntry(false);
        fetchCycleDetail(selectedName).then(d => {
            setDetail(d);
            setCycleName(d.name);
            setEntries(d.cycles);
            setOpenSet(new Set([0]));
        });
    }, [selectedName]);

    const toggleOpen = (i: number) => {
        setOpenSet(prev => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });
    };

    const handleEntryChange = (index: number, changes: Partial<CycleEntryDetail>) => {
        setEntries(prev => prev.map((e, i) => (i === index ? { ...e, ...changes } : e)));
        setSaveStatus('idle');
    };

    const handleRemoveEntry = (index: number) => {
        setEntries(prev => prev.filter((_, i) => i !== index));
        setOpenSet(prev => {
            const next = new Set<number>();
            prev.forEach(i => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
            return next;
        });
        setSaveStatus('idle');
    };

    const handleAddEntry = async () => {
        setAddingInProgress(true);
        try {
            const config = await getAlgorithmConfig(newAlgorithmKey);
            const newEntry: CycleEntryDetail = {
                algorithm: newAlgorithmKey,
                seconds_in_cycle: 300,
                options: (config.options.default as Record<string, unknown>) ?? {},
                algorithmConfig: config,
            };
            setEntries(prev => {
                const next = [...prev, newEntry];
                setOpenSet(s => new Set([...s, next.length - 1]));
                return next;
            });
            setAddingEntry(false);
            setSaveStatus('idle');
        } finally {
            setAddingInProgress(false);
        }
    };

    const handleSave = async () => {
        if (!detail) return;
        setSaving(true);
        setSaveStatus('idle');
        try {
            await saveCycle({ ...detail, name: cycleName, cycles: entries });
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
            <div css={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                <FormGroup label="Cycle" css={{ marginBottom: 0 }}>
                    <HTMLSelect value={selectedName} onChange={e => setSelectedName(e.currentTarget.value)}>
                        {cycleNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </HTMLSelect>
                </FormGroup>
                <FormGroup label="Display Name" css={{ marginBottom: 0 }}>
                    <InputGroup
                        value={cycleName}
                        disabled={!detail}
                        onChange={e => { setCycleName(e.currentTarget.value); setSaveStatus('idle'); }}
                    />
                </FormGroup>
                <Button intent="primary" loading={saving} disabled={!detail} onClick={handleSave}>
                    Save
                </Button>
                {saveStatus === 'success' && <span css={{ color: '#3dcc91', fontSize: '13px' }}>Saved</span>}
                {saveStatus === 'error' && <span css={{ color: '#ff7373', fontSize: '13px' }}>Error saving</span>}
            </div>
            <div css={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.map((entry, i) => {
                    const isOpen = openSet.has(i);
                    const fallbackName = entry.algorithmConfig?.name ?? formatKey(entry.algorithm);
                    return (
                        <Card key={i} css={{ padding: 0 }}>
                            <div
                                role="button"
                                onClick={() => toggleOpen(i)}
                                css={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                            >
                                <Icon icon={isOpen ? 'chevron-down' : 'chevron-right'} />
                                {entry.display_name
                                    ? <><span css={{ fontWeight: 600 }}>{entry.display_name}</span>
                                        <span css={{ color: '#888' }}>({fallbackName})</span></>
                                    : <span css={{ fontWeight: 600 }}>{fallbackName}</span>
                                }
                                <span css={{ color: '#888', fontSize: '13px', marginLeft: 'auto' }}>
                                    {entry.seconds_in_cycle}s
                                </span>
                                {entries.length > 1 && (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleRemoveEntry(i); }}
                                        css={{
                                            marginLeft: '8px', width: '20px', height: '20px', padding: 0,
                                            flexShrink: 0, background: 'none', border: '1px solid #555',
                                            borderRadius: '50%', cursor: 'pointer', color: '#aaa',
                                            fontSize: '12px', lineHeight: '18px', textAlign: 'center',
                                            ':hover': { background: '#e06c75', borderColor: '#e06c75', color: '#fff' },
                                        }}
                                    >×</button>
                                )}
                            </div>
                            <Collapse isOpen={isOpen}>
                                <div css={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div css={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
                                        <FormGroup label="Display Name" css={{ marginBottom: 0, flex: 1 }}>
                                            <InputGroup
                                                value={entry.display_name ?? ''}
                                                placeholder={fallbackName}
                                                onChange={e => handleEntryChange(i, {
                                                    display_name: e.currentTarget.value || undefined,
                                                })}
                                            />
                                        </FormGroup>
                                        <FormGroup label="Duration (s)" css={{ marginBottom: 0 }}>
                                            <NumericInput
                                                value={entry.seconds_in_cycle}
                                                min={1}
                                                stepSize={10}
                                                minorStepSize={1}
                                                buttonPosition="none"
                                                onValueChange={v => handleEntryChange(i, { seconds_in_cycle: v })}
                                            />
                                        </FormGroup>
                                    </div>
                                    {entry.algorithmConfig ? (
                                        <SettingsEditor
                                            schema={entry.algorithmConfig.options}
                                            values={entry.options}
                                            onChange={v => handleEntryChange(i, { options: v })}
                                        />
                                    ) : (
                                        <span css={{ color: '#888', fontSize: '13px' }}>No configurable settings</span>
                                    )}
                                </div>
                            </Collapse>
                        </Card>
                    );
                })}

                {addingEntry ? (
                    <div css={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 4px' }}>
                        <HTMLSelect
                            value={newAlgorithmKey}
                            onChange={e => setNewAlgorithmKey(e.currentTarget.value)}
                        >
                            {algorithmKeys.map(key => (
                                <option key={key} value={key}>{formatKey(key)}</option>
                            ))}
                        </HTMLSelect>
                        <Button
                            intent="primary"
                            loading={addingInProgress}
                            onClick={handleAddEntry}
                        >
                            Add
                        </Button>
                        <Button variant="minimal" onClick={() => setAddingEntry(false)}>Cancel</Button>
                    </div>
                ) : (
                    <Button
                        variant="minimal"
                        icon="plus"
                        disabled={!detail}
                        onClick={() => setAddingEntry(true)}
                        css={{ alignSelf: 'flex-start' }}
                    >
                        Add Algorithm
                    </Button>
                )}
            </div>
        </div>
    );
};
