import { useState } from 'react';
import { WritableAtom, useSetAtom } from 'jotai';

export function useUpdateStatus<T>(atom: WritableAtom<null | T, [T], unknown>) {
    const [loading, setLoading] = useState(false);
    const set = useSetAtom(atom);

    const update = async (value: T) => {
        setLoading(true);
        set(value);
        setLoading(false);
    };

    return [loading, update] as [boolean, (value: T) => Promise<void>];
}
