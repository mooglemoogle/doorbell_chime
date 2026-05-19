import { Router } from 'express'
import { Cycles } from '../cycles'
import { algorithms } from '../algorithms/index'
import { CycleEntry } from '../cycle'
import logger from '../logger'

export default (router: Router, cycles: Cycles) => {
  router.get('/api/cycles/:name', (req, res) => {
    const name = decodeURIComponent(req.params.name)
    const cycle = cycles.getCycle(name)

    const enriched = cycle.cycles.map(entry => ({
      ...entry,
      algorithmConfig: algorithms[entry.algorithm]?.config ?? null,
    }))

    res.status(200).json({ accepted: true, response: { name: cycle.name, cycles: enriched } })
  })

  router.put('/api/cycles/:name', (req, res) => {
    const body = req.body as { name: string; cycles: CycleEntry[] }
    if (!body?.name || !Array.isArray(body.cycles)) {
      res.status(400).json({ accepted: false, message: 'Invalid cycle body' })
      return
    }
    logger.info('Saving user cycle', { name: body.name })
    cycles.saveCycle(body)
    res.status(202).json({ accepted: true })
  })
}
