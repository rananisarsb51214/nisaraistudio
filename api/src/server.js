import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '1mb' }));

const taskSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  priority: z.number().int().min(0).max(100).default(50)
});

const routes = {
  coding: 'claude', automation: 'gpt', marketing: 'gemini',
  research: 'gemini', low_cost: 'ollama'
};

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'nexus-ai-os-api' }));

app.post('/v1/tasks/plan', (req, res) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid task', details: parsed.error.issues });

  const task = parsed.data;
  const model = routes[task.type] ?? routes.automation;
  const actionId = `act_${crypto.randomUUID()}`;
  const traceId = `trace_${crypto.randomUUID()}`;

  res.status(202).json({
    status: 'PLANNED',
    traceId,
    actionId,
    model,
    controlLoop: ['OBSERVE','ANALYZE','PLAN','SIMULATE','POLICY','AUTHORIZE','LOCK','EXECUTE','VERIFY','AUDIT','LEARN']
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`Nexus API listening on ${port}`));
