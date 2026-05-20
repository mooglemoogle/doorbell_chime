import { Router } from 'express';
import { AnimationRunner } from '../animation/runner';
import type { Scheduler } from '../scheduler/scheduler';
import logger from '../logger';

const SIMPLE_COMMANDS = ['on', 'off', 'next'] as const;
type SimpleCommand = typeof SIMPLE_COMMANDS[number];

export default (router: Router, getRunner: () => AnimationRunner, scheduler: Scheduler) => {
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
        logger.info('Command: set_brightness', { brightness: value, ip: req.ip });
        getRunner().setBrightness(value);
        scheduler.notifyManualCommand();
        res.status(202).json({ accepted: true });
    });

    router.post('/api/actions/set_cycle/:new_cycle', (req, res) => {
        logger.info('Command: set_cycle', { cycle: req.params.new_cycle, ip: req.ip });
        getRunner().setCycle(req.params.new_cycle);
        scheduler.notifyManualCommand();
        res.status(202).json({ accepted: true });
    });

    router.post('/api/actions/:command', (req, res) => {
        const command = req.params.command.toLowerCase() as SimpleCommand;
        if (!SIMPLE_COMMANDS.includes(command)) {
            res.status(404).send('Command not found');
            return;
        }
        logger.info(`Command: ${command}`, { ip: req.ip });
        const runner = getRunner();
        if (command === 'on') runner.turnOn();
        else if (command === 'off') runner.turnOffCommand();
        else if (command === 'next') runner.nextAlgorithm();
        scheduler.notifyManualCommand();
        res.status(202).json({ accepted: true });
    });
};
