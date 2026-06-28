import { Router } from 'express';
import { routingService } from '../services/routingService.js';

export const networkRouter = Router();

networkRouter.get('/status', (_req, res) => {
  res.json(routingService.getState());
});

networkRouter.post('/disable-node', (req, res) => {
  const { planet_id } = req.body;
  if (!planet_id) {
    res.status(400).json({ error: 'Missing required field: planet_id' });
    return;
  }
  routingService.disableNode(planet_id);
  res.json({ success: true, state: routingService.getState() });
});

networkRouter.post('/enable-node', (req, res) => {
  const { planet_id } = req.body;
  if (!planet_id) {
    res.status(400).json({ error: 'Missing required field: planet_id' });
    return;
  }
  routingService.enableNode(planet_id);
  res.json({ success: true, state: routingService.getState() });
});

networkRouter.post('/disable-link', (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) {
    res.status(400).json({ error: 'Missing required fields: from, to' });
    return;
  }
  routingService.disableLink(from, to);
  res.json({ success: true, state: routingService.getState() });
});

networkRouter.post('/enable-link', (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) {
    res.status(400).json({ error: 'Missing required fields: from, to' });
    return;
  }
  routingService.enableLink(from, to);
  res.json({ success: true, state: routingService.getState() });
});
