import { createHash, randomBytes } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { getAgentByApiKeyHash } from './simple-db.js';

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  const bytes = randomBytes(32);
  return `clh_${bytes.toString('hex')}`;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Express middleware to authenticate requests via API key
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const apiKey = authHeader.slice(7);
  const hash = hashApiKey(apiKey);
  const agent = getAgentByApiKeyHash(hash);

  if (!agent) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Attach agent to request
  (req as any).agent = agent;
  next();
}

/**
 * Optional auth - doesn't fail if no key provided
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7);
    const hash = hashApiKey(apiKey);
    const agent = getAgentByApiKeyHash(hash);
    if (agent) {
      (req as any).agent = agent;
    }
  }

  next();
}
