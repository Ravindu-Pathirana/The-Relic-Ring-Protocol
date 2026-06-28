import { Router } from 'express';
import { sendPacket, getHistory } from '../services/packetService.js';

export const packetsRouter = Router();

packetsRouter.post('/send', (req, res) => {
  const { origin_id, destination_id, payload } = req.body;

  if (!origin_id || !destination_id || !payload) {
    res.status(400).json({ error: 'Missing required fields: origin_id, destination_id, payload' });
    return;
  }

  const packet = sendPacket(origin_id, destination_id, payload);
  res.json(packet);
});

packetsRouter.get('/history', (_req, res) => {
  res.json(getHistory());
});
