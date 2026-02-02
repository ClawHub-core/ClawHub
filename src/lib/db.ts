import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { Agent, Skill, SkillQueryParams } from '../types.js';

let db: SqlJsDatabase;
let dbPath: string;

export async function initDb(path: string = './clawhub.db') {
  dbPath = path;
  const SQL = await initSqlJs();
  
  // Load existing database if exists
  if (existsSync(path)) {
    const buffer = readFileSync(path);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      api_key_hash TEXT NOT NULL,
      nostr_pubkey TEXT,
      colony_id TEXT,
      trust_score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT UNIQUE NOT NULL,
      version TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      capabilities TEXT DEFAULT '[]',
      dependencies TEXT DEFAULT '[]',
      interface_type TEXT,
      api_base TEXT,
      homepage TEXT,
      license TEXT,
      repo_url TEXT,
      skill_md_content TEXT,
      nostr_event_id TEXT,
      star_count INTEGER DEFAULT 0,
      zap_total_sats INTEGER DEFAULT 0,
      score REAL DEFAULT 0,
      last_activity_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES agents(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stars (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      zap_sats INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (skill_id) REFERENCES skills(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE(skill_id, agent_id)
    )
  `);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_skills_score ON skills(score DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_skills_full_name ON skills(full_name)');

  saveDb();
  return db;
}

export function saveDb() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as T;
  }
  stmt.free();
  return undefined;
}

function queryAll<T>(sql: string, params: any[] = []): T[] {
  const results: T[] = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function run(sql: string, params: any[] = []) {
  db.run(sql, params);
  saveDb();
}

// Agent operations
export function createAgent(username: string, apiKeyHash: string, nostrPubkey?: string, colonyId?: string): Agent {
  const id = randomUUID();
  const now = new Date().toISOString();
  run(
    `INSERT INTO agents (id, username, api_key_hash, nostr_pubkey, colony_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, username, apiKeyHash, nostrPubkey || null, colonyId || null, now]
  );
  return getAgentById(id)!;
}

export function getAgentById(id: string): Agent | undefined {
  return queryOne<Agent>('SELECT * FROM agents WHERE id = ?', [id]);
}

export function getAgentByUsername(username: string): Agent | undefined {
  return queryOne<Agent>('SELECT * FROM agents WHERE username = ?', [username]);
}

export function getAgentByApiKeyHash(hash: string): Agent | undefined {
  return queryOne<Agent>('SELECT * FROM agents WHERE api_key_hash = ?', [hash]);
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
  
  run(
    `INSERT INTO skills (
      id, author_id, name, full_name, version, description,
      category, capabilities, dependencies, interface_type,
      api_base, homepage, license, repo_url, skill_md_content,
      created_at, updated_at, last_activity_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.author_id,
      data.name,
      fullName,
      data.version,
      data.description,
      data.category || null,
      JSON.stringify(data.capabilities || []),
      JSON.stringify(data.dependencies || []),
      data.interface_type || null,
      data.api_base || null,
      data.homepage || null,
      data.license || null,
      data.repo_url || null,
      data.skill_md_content || null,
      now, now, now
    ]
  );
  
  return getSkillById(id)!;
}

export function getSkillById(id: string): Skill | undefined {
  return queryOne<Skill>('SELECT * FROM skills WHERE id = ?', [id]);
}

export function getSkillByFullName(fullName: string): Skill | undefined {
  return queryOne<Skill>('SELECT * FROM skills WHERE full_name = ?', [fullName]);
}

export function updateSkill(id: string, updates: Partial<Skill>): void {
  const skill = getSkillById(id);
  if (!skill) throw new Error('Skill not found');
  
  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return;
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = [...fields.map(f => (updates as any)[f]), new Date().toISOString(), id];
  
  run(`UPDATE skills SET ${setClause}, updated_at = ? WHERE id = ?`, values);
}

export function querySkills(params: SkillQueryParams): Skill[] {
  let sql = 'SELECT * FROM skills WHERE 1=1';
  const values: any[] = [];

  if (params.category) {
    sql += ' AND category = ?';
    values.push(params.category);
  }

  if (params.capability) {
    sql += ' AND capabilities LIKE ?';
    values.push(`%"${params.capability}"%`);
  }

  if (params.author) {
    sql += ' AND full_name LIKE ?';
    values.push(`@${params.author}/%`);
  }

  if (params.q) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    values.push(`%${params.q}%`, `%${params.q}%`);
  }

  // Sorting
  const sortMap: Record<string, string> = {
    score: 'score DESC',
    recent: 'updated_at DESC',
    stars: 'star_count DESC',
    zaps: 'zap_total_sats DESC',
  };
  sql += ` ORDER BY ${sortMap[params.sort || 'score'] || 'score DESC'}`;

  // Pagination
  const limit = Math.min(params.limit || 20, 100);
  const offset = params.offset || 0;
  sql += ` LIMIT ? OFFSET ?`;
  values.push(limit, offset);

  return queryAll<Skill>(sql, values);
}

// Star operations
export function starSkill(skillId: string, agentId: string, zapSats: number = 0): void {
  const existing = queryOne<any>('SELECT * FROM stars WHERE skill_id = ? AND agent_id = ?', [skillId, agentId]);
  
  if (existing) {
    run('UPDATE stars SET zap_sats = zap_sats + ? WHERE skill_id = ? AND agent_id = ?', [zapSats, skillId, agentId]);
  } else {
    run('INSERT INTO stars (id, skill_id, agent_id, zap_sats, created_at) VALUES (?, ?, ?, ?, ?)', 
      [randomUUID(), skillId, agentId, zapSats, new Date().toISOString()]);
  }
  
  recalculateSkillScore(skillId);
}

export function recalculateSkillScore(skillId: string): void {
  const stats = queryOne<{ star_count: number; zap_total: number }>(
    'SELECT COUNT(*) as star_count, COALESCE(SUM(zap_sats), 0) as zap_total FROM stars WHERE skill_id = ?',
    [skillId]
  ) || { star_count: 0, zap_total: 0 };
  
  const score = stats.star_count + (stats.zap_total / 10);
  
  run('UPDATE skills SET star_count = ?, zap_total_sats = ?, score = ? WHERE id = ?',
    [stats.star_count, stats.zap_total, score, skillId]);
}
