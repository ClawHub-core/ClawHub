// Simple in-memory database for testing
import { randomUUID } from 'crypto';
import type { Agent, Skill, SkillQueryParams } from '../types.js';

// In-memory storage
const agents = new Map<string, Agent>();
const skills = new Map<string, Skill>();
const agentsByUsername = new Map<string, Agent>();
const agentsByApiKeyHash = new Map<string, Agent>();
const skillsByFullName = new Map<string, Skill>();

export async function initDb(dbPath?: string) {
  console.log('Using simple in-memory database');
  return Promise.resolve();
}

export function getDb() {
  return {};
}

export function saveDb() {
  // No-op for in-memory
}

// Agent operations
export function createAgent(username: string, apiKeyHash: string, nostrPubkey?: string, colonyId?: string): Agent {
  const id = randomUUID();
  const now = new Date().toISOString();
  
  const agent: Agent = {
    id,
    username,
    api_key_hash: apiKeyHash,
    nostr_pubkey: nostrPubkey,
    colony_id: colonyId,
    trust_score: 0,
    created_at: now
  };
  
  agents.set(id, agent);
  agentsByUsername.set(username, agent);
  agentsByApiKeyHash.set(apiKeyHash, agent);
  
  return agent;
}

export function getAgentById(id: string): Agent | undefined {
  return agents.get(id);
}

export function getAgentByUsername(username: string): Agent | undefined {
  return agentsByUsername.get(username);
}

export function getAgentByApiKeyHash(hash: string): Agent | undefined {
  return agentsByApiKeyHash.get(hash);
}

// Skill operations
export function createSkill(data: {
  author_id: string;
  name: string;
  version: string;
  description: string;
  category?: string;
  capabilities?: string[];
  dependencies?: string[];
  interface_type?: string;
  api_base?: string;
  homepage?: string;
  license?: string;
  repo_url?: string;
  skill_md_content?: string;
}): Skill {
  const id = randomUUID();
  const author = getAgentById(data.author_id);
  if (!author) throw new Error('Author not found');
  
  const fullName = `@${author.username}/${data.name}`;
  const now = new Date().toISOString();
  
  const skill: Skill = {
    id,
    author_id: data.author_id,
    name: data.name,
    full_name: fullName,
    version: data.version,
    description: data.description,
    category: data.category,
    capabilities: JSON.stringify(data.capabilities || []),
    dependencies: JSON.stringify(data.dependencies || []),
    interface_type: data.interface_type,
    api_base: data.api_base,
    homepage: data.homepage,
    license: data.license,
    repo_url: data.repo_url,
    skill_md_content: data.skill_md_content,
    nostr_event_id: undefined,
    star_count: 0,
    zap_total_sats: 0,
    score: 0,
    last_activity_at: now,
    created_at: now,
    updated_at: now
  };
  
  skills.set(id, skill);
  skillsByFullName.set(fullName, skill);
  
  return skill;
}

export function getSkillById(id: string): Skill | undefined {
  return skills.get(id);
}

export function getSkillByFullName(fullName: string): Skill | undefined {
  return skillsByFullName.get(fullName);
}

export function updateSkill(id: string, updates: Partial<Skill>): void {
  const skill = getSkillById(id);
  if (!skill) throw new Error('Skill not found');
  
  Object.assign(skill, updates, { updated_at: new Date().toISOString() });
  skills.set(id, skill);
}

export function querySkills(params: SkillQueryParams): Skill[] {
  let results = Array.from(skills.values());
  
  // Apply filters
  if (params.category) {
    results = results.filter(s => s.category === params.category);
  }
  
  if (params.capability) {
    results = results.filter(s => {
      const caps = JSON.parse(s.capabilities || '[]');
      return caps.includes(params.capability);
    });
  }
  
  if (params.author) {
    results = results.filter(s => s.full_name.startsWith(`@${params.author}/`));
  }
  
  if (params.q) {
    const q = params.q.toLowerCase();
    results = results.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.description.toLowerCase().includes(q)
    );
  }
  
  // Sort
  const sortMap = {
    score: (a: Skill, b: Skill) => b.score - a.score,
    recent: (a: Skill, b: Skill) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    stars: (a: Skill, b: Skill) => b.star_count - a.star_count,
    zaps: (a: Skill, b: Skill) => b.zap_total_sats - a.zap_total_sats,
  };
  
  if (params.sort && sortMap[params.sort]) {
    results.sort(sortMap[params.sort]);
  } else {
    results.sort(sortMap.score);
  }
  
  // Pagination
  const offset = params.offset || 0;
  const limit = Math.min(params.limit || 20, 100);
  return results.slice(offset, offset + limit);
}

// Star operations
export function starSkill(skillId: string, agentId: string, zapSats: number = 0): void {
  const skill = getSkillById(skillId);
  if (!skill) throw new Error('Skill not found');
  
  // Simple implementation - just increment counts
  skill.star_count += 1;
  skill.zap_total_sats += zapSats;
  skill.score = skill.star_count + (skill.zap_total_sats / 10);
  skills.set(skillId, skill);
}

export function recalculateSkillScore(skillId: string): void {
  const skill = getSkillById(skillId);
  if (skill) {
    skill.score = skill.star_count + (skill.zap_total_sats / 10);
    skills.set(skillId, skill);
  }
}