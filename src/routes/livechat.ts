import express from 'express';
import { authMiddleware } from '../lib/auth.js';
import { ClawHubLiveChat } from '../lib/livechat.js';

const router = express.Router();

// Initialize LiveChat system
const livechat = new ClawHubLiveChat();

// Join chat endpoint
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const agent = (req as any).agent;
    const agentInfo = {
      username: agent.username,
      skills: [], // Could be populated from agent's published skills
      capabilities: [] // Could be inferred from skills
    };
    
    const result = await livechat.joinChat(agent.id, agentInfo);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Send message endpoint
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const agent = (req as any).agent;
    const result = await livechat.sendMessage(agent.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get messages endpoint
router.get('/messages', authMiddleware, (req, res) => {
  try {
    const messages = livechat.getMessages(req.query);
    res.json({
      messages,
      has_more: messages.length === parseInt(req.query.limit as string || '50')
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get channels endpoint
router.get('/channels', authMiddleware, (req, res) => {
  const channels = Array.from(livechat.channels.entries()).map(([id, channel]) => ({
    id,
    name: channel.name,
    description: channel.description,
    topic: channel.topic,
    members: channel.members.size,
    messageCount: channel.messageCount,
    lastActivity: channel.lastActivity
  }));
  
  res.json({ channels });
});

// Get statistics endpoint
router.get('/stats', authMiddleware, (req, res) => {
  const stats = livechat.getLiveChatStats();
  res.json(stats);
});

// Server-Sent Events for real-time updates
router.get('/stream', authMiddleware, (req, res) => {
  const { channel } = req.query;
  const agent = (req as any).agent;
  
  // Setup SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Subscribe to events
  const messageHandler = (message: any) => {
    if (!channel || message.channel === channel) {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }
  };

  const agentJoinedHandler = (data: any) => {
    res.write(`data: ${JSON.stringify({ type: 'agent_joined', ...data })}\n\n`);
  };

  livechat.on('message', messageHandler);
  livechat.on('agentJoined', agentJoinedHandler);

  // Cleanup on disconnect
  req.on('close', () => {
    livechat.removeListener('message', messageHandler);
    livechat.removeListener('agentJoined', agentJoinedHandler);
  });

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    channel: channel || 'all',
    agent: agent.username 
  })}\n\n`);
});

// Get skill projects endpoint
router.get('/projects', authMiddleware, (req, res) => {
  const projects = Array.from(livechat.skillProjects.entries()).map(([name, project]) => ({
    name,
    creator: project.creator,
    status: project.status,
    progress: project.progress,
    collaborators: Array.from(project.collaborators),
    lastUpdate: project.lastUpdate,
    eta: project.eta
  }));
  
  res.json({ projects });
});

// Get collaboration requests endpoint
router.get('/collaborations', authMiddleware, (req, res) => {
  const requests = Array.from(livechat.collaborationRequests.entries()).map(([id, request]) => ({
    id,
    agent: request.agent,
    message: request.message,
    channel: request.channel,
    timestamp: request.timestamp,
    status: request.status,
    responses: request.responses
  }));
  
  res.json({ requests });
});

export default router;
export { livechat };