import { Router } from 'express';
import { Request } from 'zeromq';

const sock = new Request();
sock.connect('tcp://localhost:5555');

const sendCommand = async (command: string, options = {}) => {
    const message = { command, ...options };
    await sock.send(JSON.stringify(message));
    const [result] = await sock.receive();
    try {
        const resultObj = JSON.parse(result.toString('utf-8'));
        return resultObj;
    } catch {
        return result.toString('utf-8');
    }
};

const VALID_COMMANDS = ['on', 'off', 'next'];

export default (router: Router) => {
    router.get('/api/actions/get_status', async (req, res) => {
        const result = await sendCommand('get_status');

        if (result.accepted) {
            res.status(200);
            res.send(result);
        } else {
            res.status(400);
            res.send(result);
        }
    });
    router.get('/api/actions/get_cycles', async (req, res) => {
        const result = await sendCommand('get_cycles');

        if (result.accepted) {
            res.status(200);
            res.send(result);
        } else {
            res.status(400);
            res.send(result);
        }
    });
    router.post('/api/actions/set_brightness/:new_brightness', async (req, res) => {
        const result = await sendCommand('set_brightness', { brightness: req.params.new_brightness });

        if (result.accepted) {
            res.status(202);
            res.send(result);
        } else {
            res.status(400);
            res.send(result);
        }
    });
    router.post('/api/actions/set_cycle/:new_cycle', async (req, res) => {
        const result = await sendCommand('set_cycle', { name: req.params.new_cycle });

        if (result.accepted) {
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

            if (result.accepted) {
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
