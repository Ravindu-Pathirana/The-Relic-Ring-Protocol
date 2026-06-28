import { Router } from 'express';
import { universeService } from '../services/universeService.js';

export const universeRouter = Router();

universeRouter.get('/', (_req, res) => {
  res.json(universeService.getConfig());
});

universeRouter.get('/metadata', (_req, res) => {
  res.json(universeService.getMetadata());
});

universeRouter.get('/planets', (_req, res) => {
  res.json(universeService.getPlanets());
});

universeRouter.get('/planets/:id', (req, res) => {
  const planet = universeService.getPlanetById(req.params.id);
  if (!planet) {
    res.status(404).json({ error: `Planet '${req.params.id}' not found` });
    return;
  }
  res.json(planet);
});
