import express, { json } from 'express';
import cors from 'cors';
import { StatusCodes } from 'http-status-codes';
import { config } from 'dotenv';
import { resolve } from 'path';

config();

import routes from './routes/index';
import { StripRegistry } from './strips/registry';
import { StripManager } from './strips/manager';
import { FrameGenerator } from './animation/frameGenerator';
import { AnimationRunner } from './animation/runner';
import { Status } from './status';
import { Cycles } from './cycles';
import { createStripWebSocketServer } from './websocket/server';

console.log(process.env.CYCLES_DIR);
console.log(resolve(__dirname, '../../data/cycles'));
console.log(__dirname);

// Build the dependency graph
const status = new Status();
const cycles = new Cycles(process.env.CYCLES_DIR ?? resolve(__dirname, '../../data/cycles'));
const registry = new StripRegistry();
const manager = new StripManager();
const frameGenerator = new FrameGenerator(registry, manager);

let runner = new AnimationRunner(status, cycles, registry, frameGenerator);

function startRunner(): void {
    if (registry.totalPixels === 0) {
        console.log('No strips registered yet — animation runner standing by');
        return;
    }
    runner.start().catch(err => {
        console.error('Animation runner error:', err);
        process.exit(1);
    });
}

function restartRunner(): void {
    console.log('Strip layout changed — restarting animation runner');
    runner.stop();
    runner = new AnimationRunner(status, cycles, registry, frameGenerator);
    startRunner();
}

// Start the WebSocket server for strip connections
const wsPort = parseInt(process.env.WS_PORT ?? '3002', 10);
createStripWebSocketServer(wsPort, registry, manager, restartRunner);

startRunner();

const app = express();

app.use(
    json(),
    cors({
        origin: process.env.CLIENT_URL,
        optionsSuccessStatus: StatusCodes.OK,
    }),
);

app.use(routes(() => runner, manager));

app.use(express.static(resolve(__dirname, '../../client/dist')));

app.use('*', (_req, res) => {
    res.status(StatusCodes.NOT_FOUND).send('404 Not Found');
});

app.listen(process.env.APP_PORT, () => {
    console.log(`Light Control listening on port ${process.env.APP_PORT}`);
});
