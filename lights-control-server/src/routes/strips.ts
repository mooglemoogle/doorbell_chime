import { Router } from 'express';
import { StripManager } from '../strips/manager';
import { StripRegistry } from '../strips/registry';

export default (router: Router, manager: StripManager, registry: StripRegistry, restartRunner: () => void) => {
    router.get('/api/strips', (_req, res) => {
        const connected = manager.getConnected();
        const strips = registry.strips.map(strip => {
            const conn = connected.find(c => c.stripId === strip.stripId);
            return {
                stripId: strip.stripId,
                numPixels: strip.numPixels,
                pixelOffset: strip.pixelOffset,
                bpp: strip.bpp,
                physical: strip.physical,
                connected: !!conn,
                disabled: manager.isDisabled(strip.stripId),
                bufferedFrames: conn?.bufferedFrames ?? 0,
                lastSeen: conn?.lastSeen ?? null,
            };
        });
        res.status(200).json(strips);
    });

    router.delete('/api/strips/:id', (req, res) => {
        const { id } = req.params;
        manager.disconnect(id);
        const layoutChanged = registry.removeStrip(id);
        if (layoutChanged) restartRunner();
        res.status(200).json({ accepted: true });
    });

    router.post('/api/strips/:id/disable', (req, res) => {
        manager.disable(req.params.id);
        res.status(200).json({ accepted: true });
    });

    router.post('/api/strips/:id/enable', (req, res) => {
        manager.enable(req.params.id);
        res.status(200).json({ accepted: true });
    });
};
