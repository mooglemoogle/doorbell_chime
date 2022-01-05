import { Router } from 'express';
import actionsRoutes from './actions';

export default () => {
    const router = Router();

    actionsRoutes(router);

    return router;
};
