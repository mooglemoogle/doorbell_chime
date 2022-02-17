import { Router } from 'express';
import { Request } from 'zeromq';

const sock = new Request();
sock.connect('tcp://localhost:5555');

type CommandResponse = {
    accepted: boolean;
};

const isCommandResponse = (response: string | CommandResponse): response is CommandResponse => {
    return (response as CommandResponse).accepted !== undefined;
};

let sendLock: Promise<CommandResponse | string> = Promise.resolve('');

const sendCommand = async (command: string, options = {}) => {
    const message = { command, ...options };
    sendLock = sendLock.then(async () => {
        await sock.send(JSON.stringify(message));
        const [result] = await sock.receive();
        try {
            const resultObj = JSON.parse(result.toString('utf-8'));
            return resultObj as CommandResponse;
        } catch {
            return result.toString('utf-8');
        }
    });
    return sendLock;
};

const VALID_COMMANDS = ['on', 'off', 'next'];

export default (router: Router) => {
    router.get('/api/actions/get_status', async (req, res) => {
        const result = await sendCommand('get_status');

        if (isCommandResponse(result) && result.accepted) {
            res.status(200);
            res.send(result);
        } else {
            res.status(400);
            res.send(result);
        }
    });
    router.get('/api/actions/get_cycles', async (req, res) => {
        const result = await sendCommand('get_cycles');

        if (isCommandResponse(result) && result.accepted) {
            res.status(200);
            res.send(result);
        } else {
            res.status(400);
            res.send(result);
        }
    });
    router.post('/api/actions/set_brightness/:new_brightness', async (req, res) => {
        const result = await sendCommand('set_brightness', { brightness: req.params.new_brightness });

        if (isCommandResponse(result) && result.accepted) {
            res.status(202);
            res.send(result);
        } else {
            res.status(400);
            res.send(result);
        }
    });
    router.post('/api/actions/set_cycle/:new_cycle', async (req, res) => {
        const result = await sendCommand('set_cycle', { name: req.params.new_cycle });

        if (isCommandResponse(result) && result.accepted) {
            res.status(202);
            res.send(result);
        } else {
            res.status(400);
            res.send(result);
        }
    });
    router.post('/api/actions/:command', async (req, res) => {
        const command = req.params.command.toLowerCase();
        if (VALID_COMMANDS.includes(command)) {
            const result = await sendCommand(command);

            if (isCommandResponse(result) && result.accepted) {
                res.status(202);
                res.send(result);
            } else {
                res.status(400);
                res.send(result);
            }
        } else {
            res.status(404);
            res.send('Command not found');
        }
    });
};
