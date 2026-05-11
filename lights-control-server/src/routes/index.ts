import { Router } from 'express';
import actionsRoutes from './actions';
import stripsRoutes from './strips';
import { AnimationRunner } from '../animation/runner';
import { StripManager } from '../strips/manager';

export default (getRunner: () => AnimationRunner, manager: StripManager) => {
    const router = Router();

    actionsRoutes(router, getRunner);
    stripsRoutes(router, manager);

    return router;
};
