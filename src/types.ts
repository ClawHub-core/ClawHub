import { z } from 'zod';

// SKILL.md frontmatter schema
export const SkillMetadataSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(280),
  homepage: z.string().url().optional(),
  metadata: z.object({
    category: z.enum(['social', 'utility', 'infrastructure', 'finance', 'creative', 'other']).optional(),
    api_base: z.string().url().optional(),
  }).optional(),
  capabilities: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  interface: z.enum(['REST', 'A2A', 'CLI', 'SDK', 'MCP']).optional(),
  author: z.object({
    name: z.string(),
    nostr: z.string().optional(),
    colony: z.string().optional(),
  }).optional(),
  license: z.string().optional(),
});

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;

// A2A Agent Card (Google standard)
export interface A2AAgentCard {
  name: string;
  version: string;
  protocolVersion: string;
  description?: string;
  url?: string;
  skills?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  additionalInterfaces?: Array<{
    url: string;
    transport: string;
  }>;
}

// Database models
export interface Agent {
  id: string;
  username: string;
  api_key_hash: string;
  nostr_pubkey?: string;
  colony_id?: string;
  trust_score: number;
  created_at: string;
}

export interface Skill {
  id: string;
  author_id: string;
  name: string;
  full_name: string;
  version: string;
  description: string;
  category?: string;
  capabilities: string;
  dependencies: string;
  interface_type?: string;
  api_base?: string;
  homepage?: string;
  license?: string;
  repo_url?: string;
  skill_md_content?: string;
  nostr_event_id?: string;
  star_count: number;
  zap_total_sats: number;
  score: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

// API types
export interface RegisterAgentRequest {
  username: string;
  nostr_pubkey?: string;
  colony_id?: string;
}

export interface RegisterAgentResponse {
  id: string;
  username: string;
  api_key: string;
  created_at: string;
}

export interface SkillQueryParams {
  capability?: string;
  category?: string;
  author?: string;
  q?: string;
  limit?: number;
  offset?: number;
  sort?: 'score' | 'recent' | 'stars' | 'zaps';
}
