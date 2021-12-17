/** @jsx jsx */
import { jsx } from '@emotion/react';
import { FC, useCallback, useState } from 'react';
import { Button, Intent } from '@blueprintjs/core';

export const Command: FC<{ commandName: string; label: string }> = ({ commandName, label }) => {
    const [isSending, setIsSending] = useState(false);
    const sendCommand = useCallback(() => {
        setIsSending(true);
        fetch(`/api/actions/${commandName}`, { method: 'POST' }).then(response => {
            setIsSending(false);
        });
    }, []);
    return <Button disabled={isSending} text={label} intent={Intent.PRIMARY} onClick={sendCommand} large fill />;
};
