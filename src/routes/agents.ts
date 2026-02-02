import { Router } from 'express';
import { createAgent, getAgentByUsername } from '../lib/db.js';
import { generateApiKey, hashApiKey } from '../lib/auth.js';
import type { RegisterAgentRequest } from '../types.js';

const router = Router();

/**
 * POST /api/v1/agents/register
 * Register a new agent - agent-native auth (no OAuth)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, nostr_pubkey, colony_id } = req.body as RegisterAgentRequest;

    // Validate username
    if (!username || !/^[a-z0-9_-]{3,32}$/.test(username)) {
      return res.status(400).json({
        error: 'Invalid username. Must be 3-32 chars, lowercase alphanumeric with hyphens/underscores.',
      });
    }

    // Check if username exists
    const existing = getAgentByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Create agent
    const agent = createAgent(username, apiKeyHash, nostr_pubkey, colony_id);

    // Return with API key (only time it's shown)
    res.status(201).json({
      id: agent.id,
      username: agent.username,
      api_key: apiKey,
      created_at: agent.created_at,
      message: 'Save this API key - it will not be shown again.',
    });
  } catch (err) {
    console.error('Error registering agent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/me
 * Get current agent info (requires auth)
 */
router.get('/me', (req, res) => {
  const agent = (req as any).agent;
  if (!agent) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json({
    id: agent.id,
    username: agent.username,
    nostr_pubkey: agent.nostr_pubkey,
    colony_id: agent.colony_id,
    trust_score: agent.trust_score,
    created_at: agent.created_at,
  });
});

export default router;
