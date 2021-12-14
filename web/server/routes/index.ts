import { Router } from 'express';
import settingsRoutes from './settings';

export default () => {
    const router = Router();

    settingsRoutes(router);
    
    return router;
}