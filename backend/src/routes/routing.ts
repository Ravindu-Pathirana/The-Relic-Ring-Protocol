import { Router } from 'express';
import { routingService } from '../services/routingService.js';

export const routingRouter = Router();

routingRouter.get('/route', (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    res.status(400).json({ error: 'Missing query parameters: from, to' });
    return;
  }

  const route = routingService.findRoute(from as string, to as string);
  res.json(route);
});

routingRouter.get('/reachable', (req, res) => {
  const { from } = req.query;

  if (!from) {
    res.status(400).json({ error: 'Missing query parameter: from' });
    return;
  }

  const reachable = routingService.getReachablePlanets(from as string);
  res.json({ from, reachable });
});
