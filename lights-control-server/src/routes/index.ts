import { Router } from 'express';
import actionsRoutes from './actions';
import stripsRoutes from './strips';
import algorithmsRoutes from './algorithms';
import { AnimationRunner } from '../animation/runner';
import { StripManager } from '../strips/manager';
import { StripRegistry } from '../strips/registry';

export default (
    getRunner: () => AnimationRunner,
    manager: StripManager,
    registry: StripRegistry,
    restartRunner: () => void,
) => {
    const router = Router();

    actionsRoutes(router, getRunner);
    stripsRoutes(router, manager, registry, restartRunner);
    algorithmsRoutes(router);

    return router;
};
