import { Router } from 'express';
import actionsRoutes from './actions';
import stripsRoutes from './strips';
import algorithmsRoutes from './algorithms';
import cyclesRoutes from './cycles';
import scheduleRoutes from './schedule';
import { AnimationRunner } from '../animation/runner';
import { StripManager } from '../strips/manager';
import { StripRegistry } from '../strips/registry';
import { Cycles } from '../cycles';
import type { SchedulerConfig } from '../scheduler/config';
import type { Scheduler } from '../scheduler/scheduler';

export default (
    getRunner: () => AnimationRunner,
    manager: StripManager,
    registry: StripRegistry,
    restartRunner: () => void,
    cycles: Cycles,
    schedulerConfig: SchedulerConfig,
    scheduler: Scheduler,
) => {
    const router = Router();

    actionsRoutes(router, getRunner, scheduler);
    stripsRoutes(router, manager, registry, restartRunner);
    algorithmsRoutes(router);
    cyclesRoutes(router, cycles);
    scheduleRoutes(router, schedulerConfig, scheduler);

    return router;
};
