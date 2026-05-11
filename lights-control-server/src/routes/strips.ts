import { Router } from 'express';
import { StripManager } from '../strips/manager';

export default (router: Router, manager: StripManager) => {
    router.get('/api/strips', (_req, res) => {
        const strips = manager.getConnected().map(s => ({
            stripId: s.stripId,
            numPixels: s.meta.numPixels,
            pixelOffset: s.meta.pixelOffset,
            physical: s.meta.physical,
            bufferedFrames: s.bufferedFrames,
            lastSeen: s.lastSeen,
        }));
        res.status(200).json(strips);
    });
};
