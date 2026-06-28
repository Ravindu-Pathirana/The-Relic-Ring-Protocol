import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { universeRouter } from './routes/universe.js';
import { packetsRouter } from './routes/packets.js';
import { routingRouter } from './routes/routing.js';
import { codexRouter } from './routes/codex.js';
import { networkRouter } from './routes/network.js';
import { universeService } from './services/universeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/universe', universeRouter);
app.use('/api/packets', packetsRouter);
app.use('/api/routing', routingRouter);
app.use('/api/codex', codexRouter);
app.use('/api/network', networkRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

async function start() {
  try {
    universeService.load();
    console.log(`[RRP] Universe loaded: ${universeService.getPlanets().length} planets`);
    app.listen(PORT, () => {
      console.log(`[RRP] Relic Ring Protocol API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[RRP] Failed to start:', err);
    process.exit(1);
  }
}

start();
