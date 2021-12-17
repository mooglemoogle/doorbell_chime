import { Router } from 'express';
import settingsRoutes from './settings';
import actionsRoutes from './actions';

export default () => {
    const router = Router();

    settingsRoutes(router);
    actionsRoutes(router);

    return router;
};
