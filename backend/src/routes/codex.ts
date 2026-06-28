import { Router } from 'express';
import { translateMessage, getAllBases } from '../services/codexService.js';
import { universeService } from '../services/universeService.js';

export const codexRouter = Router();

codexRouter.post('/translate', (req, res) => {
  const { text, target_base } = req.body;

  if (!text || !target_base) {
    res.status(400).json({ error: 'Missing required fields: text, target_base' });
    return;
  }

  if (target_base < 2 || target_base > 36) {
    res.status(400).json({ error: 'target_base must be between 2 and 36' });
    return;
  }

  const result = translateMessage(text, target_base);
  res.json(result);
});

codexRouter.get('/bases', (_req, res) => {
  const planets = universeService.getPlanets();
  res.json(getAllBases(planets));
});
