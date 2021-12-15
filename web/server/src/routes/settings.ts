import { LightsSettings } from '@app/types';
import { Router } from 'express';

import { readFile, open } from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(__dirname, '../../../../light-control/config.json');
const ON_VALS = ['true', 'on', 'yes', 't', 'y'];
const OFF_VALS = ['false', 'off', 'no', 'f', 'n'];

const readSettings = () => {
    return readFile(CONFIG_PATH, 'utf-8').then(data => {
        return JSON.parse(data) as LightsSettings;
    });
};

const updateSettings = async (newSettings: Partial<LightsSettings>) => {
    return open(CONFIG_PATH, 'r+').then(async file => {
        const data = await file.readFile('utf-8');
        const settings = JSON.parse(data) as LightsSettings;
        const updated = {
            ...settings,
            ...newSettings,
        };
        await file.truncate();
        return file.write(JSON.stringify(updated, null, 4), 0, 'utf-8');
    });
};

export default (router: Router) => {
    router.get('/api/settings', async (req, res) => {
        const settings = await readSettings();
        res.send(settings);
    });
    router.patch('/api/settings', async (req, res) => {
        const newSettings = req.body as Partial<LightsSettings>;
        updateSettings(newSettings);
    });

    router.get('/api/settings/running', async (req, res) => {
        const settings = await readSettings();
        res.send({ running: settings.running });
    });
    router.post('/api/settings/running/:new_val', (req, res) => {
        const new_val = req.params.new_val.toLocaleLowerCase();
        if (![...ON_VALS, ...OFF_VALS].includes(new_val)) {
            res.status(400);
            res.send({
                message: `Invalid settings val. Expected one of ${ON_VALS.join(', ')}, ${OFF_VALS.join(', ')}`,
            });
            return;
        }
        const on = ON_VALS.includes(new_val);
        updateSettings({ running: on }).then(() => {
            res.sendStatus(200);
        });
    });

    router.get('/api/settings/brightness', async (req, res) => {
        const settings = await readSettings();
        res.send({ brightness: settings.brightness });
    });
    router.post('/api/settings/brightness/:new_val', (req, res) => {
        try {
            const new_val = parseFloat(req.params.new_val);
            if (isNaN(new_val) || new_val > 1.0 || new_val < 0.0) {
                throw new Error();
            }
            updateSettings({ brightness: new_val }).then(() => {
                res.sendStatus(200);
            });
        } catch (e) {
            res.status(400);
            res.send({
                message: `Invalid settings val. Expected a float from 0.0 to 1.0 (inclusive)`,
            });
        }
    });
};
