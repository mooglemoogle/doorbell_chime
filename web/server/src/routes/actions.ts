import { Router } from 'express';
import { AnimationRunner } from '../animation/runner';

const SIMPLE_COMMANDS = ['on', 'off', 'next'] as const;
type SimpleCommand = typeof SIMPLE_COMMANDS[number];

export default (router: Router, getRunner: () => AnimationRunner) => {
    router.get('/api/actions/get_status', (_req, res) => {
        res.status(200).json({ accepted: true, response: getRunner().getStatus() });
    });

    router.get('/api/actions/get_cycles', (_req, res) => {
        res.status(200).json({ accepted: true, response: getRunner().getCycleNames() });
    });

    router.post('/api/actions/set_brightness/:new_brightness', (req, res) => {
        const value = parseFloat(req.params.new_brightness);
        if (isNaN(value)) {
            res.status(400).json({ accepted: false, message: 'brightness must be a number' });
            return;
        }
        getRunner().setBrightness(value);
        res.status(202).json({ accepted: true });
    });

    router.post('/api/actions/set_cycle/:new_cycle', (req, res) => {
        getRunner().setCycle(req.params.new_cycle);
        res.status(202).json({ accepted: true });
    });

    router.post('/api/actions/:command', (req, res) => {
        const command = req.params.command.toLowerCase() as SimpleCommand;
        if (!SIMPLE_COMMANDS.includes(command)) {
            res.status(404).send('Command not found');
            return;
        }
        const runner = getRunner();
        if (command === 'on') runner.turnOn();
        else if (command === 'off') runner.turnOffCommand();
        else if (command === 'next') runner.nextAlgorithm();
        res.status(202).json({ accepted: true });
    });
};
