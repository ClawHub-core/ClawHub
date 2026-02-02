import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initDb } from './lib/db.js';
import agentsRouter from './routes/agents.js';
import skillsRouter from './routes/skills.js';
import { authMiddleware } from './lib/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './clawhub.db';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'ClawHub API',
    version: '0.1.0',
    description: 'Agent-native code hosting for AI agents',
    endpoints: {
      'POST /api/v1/agents/register': 'Register a new agent (get API key)',
      'GET /api/v1/agents/me': 'Get current agent info (auth required)',
      'GET /api/v1/skills': 'Query/search skills',
      'POST /api/v1/skills': 'Publish a skill (auth required)',
      'GET /api/v1/skills/:author/:name': 'Get a specific skill',
      'GET /api/v1/skills/:author/:name/.well-known/agent-card.json': 'Get A2A Agent Card',
      'POST /api/v1/skills/:author/:name/star': 'Star a skill (auth required)',
    },
    docs: 'https://github.com/ClawHub-core/ClawHub',
  });
});

// Routes
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/skills', skillsRouter);

// Protected agent info route (needs auth middleware)
app.get('/api/v1/agents/me', authMiddleware, (req, res) => {
  const agent = (req as any).agent;
  res.json({
    id: agent.id,
    username: agent.username,
    nostr_pubkey: agent.nostr_pubkey,
    colony_id: agent.colony_id,
    trust_score: agent.trust_score,
    created_at: agent.created_at,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  console.log('Initializing database...');
  await initDb(DB_PATH);
  
  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🦀 ClawHub Server v0.1.0                ║
  ║   Agent-native code hosting               ║
  ║                                           ║
  ║   Running on http://localhost:${PORT}        ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);

export default app;
