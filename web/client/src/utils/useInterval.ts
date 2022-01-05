import { useEffect, useRef } from 'react';

type IntervalCallback = () => void;

export const useInterval = (callback: IntervalCallback, delay: number) => {
    const savedCallback = useRef<IntervalCallback>();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            tick();
            const id = setInterval(tick, delay);
            return () => clearInterval(id);
        } else {
            return () => {};
        }
    }, [delay]);
};
