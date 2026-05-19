import { Router } from 'express';
import actionsRoutes from './actions';
import stripsRoutes from './strips';
import algorithmsRoutes from './algorithms';
import cyclesRoutes from './cycles';
import { AnimationRunner } from '../animation/runner';
import { StripManager } from '../strips/manager';
import { StripRegistry } from '../strips/registry';
import { Cycles } from '../cycles';

export default (
    getRunner: () => AnimationRunner,
    manager: StripManager,
    registry: StripRegistry,
    restartRunner: () => void,
    cycles: Cycles,
) => {
    const router = Router();

    actionsRoutes(router, getRunner);
    stripsRoutes(router, manager, registry, restartRunner);
    algorithmsRoutes(router);
    cyclesRoutes(router, cycles);

    return router;
};
