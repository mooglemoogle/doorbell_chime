import { Router } from 'express';
import { Request } from 'zeromq';

const sock = new Request();
sock.connect('tcp://localhost:5555');

const sendCommand = async (command: string) => {
    const message = { command };
    await sock.send(JSON.stringify(message));
    const [result] = await sock.receive();
    try {
        const resultObj = JSON.parse(result.toString('utf-8'));
        return resultObj;
    } catch {
        return result.toString('utf-8');
    }
};

export default (router: Router) => {
    router.post('/api/actions/next', async (req, res) => {
        const result = await sendCommand('next');

        if (result.accepted) {
            res.status(202);
            res.send(result);
        } else {
            res.status(400);
            res.send(result);
        }
    });
};
