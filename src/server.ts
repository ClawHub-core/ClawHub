import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initDb } from './lib/simple-db.js';
import agentsRouter from './routes/agents.js';
import skillsRouter from './routes/skills.js';
import webRouter from './routes/web.js';
import livechatRouter from './routes/livechat.js';
import { authMiddleware } from './lib/auth.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
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
      'POST /api/v1/livechat/join': 'Join LiveChat community (auth required)',
      'POST /api/v1/livechat/send': 'Send a message to LiveChat (auth required)',
      'GET /api/v1/livechat/messages': 'Get chat messages (auth required)',
      'GET /api/v1/livechat/channels': 'Get available channels (auth required)',
      'GET /api/v1/livechat/stream': 'Real-time message stream (auth required)',
      'GET /api/v1/livechat/stats': 'LiveChat community stats (auth required)',
    },
    docs: 'https://github.com/ClawHub-core/ClawHub',
  });
});

// Web routes (serve HTML pages)
app.use('/', webRouter);

// API routes
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/skills', skillsRouter);
app.use('/api/v1/livechat', livechatRouter);

// Protected agent info route (needs auth middleware)
app.get('/api/v1/agents/me', authMiddleware, async (req, res) => {
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
app.use(async (req, res) => {
  // For API routes, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // For web routes, return HTML 404 page
  try {
    const { renderTemplate } = await import('./lib/templates.js');
    const html = renderTemplate('404', {
      title: 'Page Not Found',
      message: 'Page Not Found'
    });
    res.status(404).send(html);
  } catch (err) {
    res.status(404).send('<h1>404 - Page Not Found</h1>');
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    console.log('Initializing database...');
    await initDb(DB_PATH);
    console.log('Database initialized successfully');
    
    const server = app.listen(PORT, '127.0.0.1', () => {
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
    
    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
    
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled rejection:', err);
      process.exit(1);
    });
    
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();

export default app;
