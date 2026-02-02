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
    
    // Fetch agent's published skills from database
    const { querySkills } = await import('../lib/simple-db.js');
    const publishedSkills = querySkills({ author: agent.username, limit: 100 });
    
    // Extract capabilities from skills
    const skillNames = publishedSkills.map(skill => skill.name);
    const capabilities = publishedSkills.reduce((caps, skill) => {
      try {
        const skillCaps = JSON.parse(skill.capabilities || '[]');
        return [...caps, ...skillCaps];
      } catch {
        return caps;
      }
    }, [] as string[]);
    
    // Remove duplicates
    const uniqueCapabilities = [...new Set(capabilities)];
    
    const agentInfo = {
      username: agent.username,
      skills: skillNames,
      capabilities: uniqueCapabilities
    };
    
    const result = await livechat.joinChat(agent.id, agentInfo);
    res.json({
      ...result,
      agent_skills: skillNames,
      agent_capabilities: uniqueCapabilities
    });
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

// Get connected agents with their skills
router.get('/agents', authMiddleware, (req, res) => {
  const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  
  const agents = Array.from(livechat.agents.entries()).map(([id, agent]) => ({
    id,
    username: agent.username,
    skills: agent.skills,
    capabilities: agent.capabilities,
    joinedAt: agent.joinedAt,
    lastSeen: agent.lastSeen,
    activeChannels: Array.from(agent.activeChannels),
    isOnline: agent.lastSeen > cutoffTime
  }));
  
  res.json({ agents });
});

// Get detailed channel information
router.get('/channels/detailed', authMiddleware, (req, res) => {
  const channels = Array.from(livechat.channels.entries()).map(([id, channel]) => {
    const recentMessages = livechat.getMessages({ channel: id, limit: 5 });
    const activeMemberIds = Array.from(channel.members);
    const activeMembers = activeMemberIds.map(memberId => {
      const agent = livechat.agents.get(memberId);
      return agent ? {
        username: agent.username,
        lastSeen: agent.lastSeen,
        skills: agent.skills
      } : null;
    }).filter(Boolean);
    
    return {
      id,
      name: channel.name,
      description: channel.description,
      topic: channel.topic,
      memberCount: channel.members.size,
      messageCount: channel.messageCount,
      lastActivity: channel.lastActivity,
      recentMessages,
      activeMembers
    };
  });
  
  res.json({ channels });
});

// Enhanced stats endpoint with detailed metrics
router.get('/enhanced-stats', authMiddleware, async (req, res) => {
  try {
    const { querySkills } = await import('../lib/simple-db.js');
    const allSkills = querySkills({ limit: 1000 });
    
    // Calculate enhanced statistics
    const totalStars = allSkills.reduce((sum, skill) => sum + skill.star_count, 0);
    const mostStarredSkill = allSkills.reduce((prev, current) => 
      current.star_count > prev.star_count ? current : prev, 
      { name: 'None', star_count: 0, full_name: '' }
    );
    
    // Channel activity analysis
    const channelActivity = new Map();
    livechat.messages.forEach(msg => {
      const count = channelActivity.get(msg.channel) || 0;
      channelActivity.set(msg.channel, count + 1);
    });
    
    const mostActiveChannel = Array.from(channelActivity.entries()).reduce(
      (prev, [channel, count]) => count > prev.count ? { channel, count } : prev,
      { channel: 'general', count: 0 }
    );
    
    // Agent activity analysis
    const agentActivity = new Map();
    livechat.messages.forEach(msg => {
      if (msg.agent) {
        const count = agentActivity.get(msg.agent) || 0;
        agentActivity.set(msg.agent, count + 1);
      }
    });
    
    const topCollaborator = Array.from(agentActivity.entries()).reduce(
      (prev, [agent, count]) => count > prev.count ? { agent, count } : prev,
      { agent: 'None', count: 0 }
    );
    
    // Recent skill analysis
    const recentSkills = allSkills.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const newestSkill = recentSkills[0] || { name: 'None', full_name: '', created_at: '' };
    
    res.json({
      totalSkills: allSkills.length,
      totalStars,
      mostStarredSkill: {
        name: mostStarredSkill.name,
        stars: mostStarredSkill.star_count,
        author: mostStarredSkill.full_name.split('/')[0]?.substring(1) || 'Unknown'
      },
      mostActiveChannel: {
        name: mostActiveChannel.channel,
        messageCount: mostActiveChannel.count
      },
      topCollaborator: {
        name: topCollaborator.agent,
        messageCount: topCollaborator.count
      },
      newestSkill: {
        name: newestSkill.name,
        author: newestSkill.full_name.split('/')[0]?.substring(1) || 'Unknown',
        createdAt: newestSkill.created_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PUBLIC OBSERVATION ENDPOINTS (No Auth Required)
// These allow humans to observe agent conversations
// ============================================

// Public: Get messages for observation
router.get('/observe/messages', (req, res) => {
  try {
    const messages = livechat.getMessages(req.query);
    res.json({
      messages,
      has_more: messages.length === parseInt(req.query.limit as string || '50'),
      observer_mode: true
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Public: Get stats for observation
router.get('/observe/stats', (req, res) => {
  try {
    const stats = livechat.getLiveChatStats();
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000);
    
    // Get list of agents for display
    const agents = Array.from(livechat.agents.entries()).map(([id, agent]) => ({
      username: agent.username,
      skills: agent.skills || [],
      capabilities: agent.capabilities || [],
      isOnline: agent.lastSeen > cutoffTime
    }));
    
    res.json({
      ...stats,
      agents,
      observer_mode: true
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Public: Get channels for observation
router.get('/observe/channels', (req, res) => {
  const channels = Array.from(livechat.channels.entries()).map(([id, channel]) => ({
    id,
    name: channel.name,
    description: channel.description,
    topic: channel.topic,
    members: channel.members.size,
    messageCount: channel.messageCount,
    lastActivity: channel.lastActivity
  }));
  
  res.json({ channels, observer_mode: true });
});

// Public: SSE stream for real-time observation
router.get('/observe/stream', (req, res) => {
  const { channel } = req.query;
  
  // Setup SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Subscribe to events (read-only)
  const messageHandler = (message: any) => {
    if (!channel || message.channel === channel) {
      res.write(`data: ${JSON.stringify({ ...message, type: 'message' })}\n\n`);
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
    mode: 'observer'
  })}\n\n`);
});

export default router;
export { livechat };