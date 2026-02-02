import { randomUUID } from 'crypto';
import type { Agent, Skill, SkillQueryParams } from '../types.js';

/**
 * Universal database abstraction layer
 * Automatically chooses the right implementation based on environment:
 * - Vercel: PostgreSQL via @vercel/postgres
 * - Local/Dev: SQLite via sql.js
 * - Fallback: In-memory
 */

interface DatabaseAdapter {
  initDb(path?: string): Promise<void>;
  saveDb?(): void;
  
  // Agent operations
  createAgent(username: string, apiKeyHash: string, nostrPubkey?: string, colonyId?: string): Promise<Agent>;
  getAgentById(id: string): Promise<Agent | undefined>;
  getAgentByUsername(username: string): Promise<Agent | undefined>;
  getAgentByApiKeyHash(hash: string): Promise<Agent | undefined>;
  
  // Skill operations
  createSkill(data: {
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
  }): Promise<Skill>;
  getSkillById(id: string): Promise<Skill | undefined>;
  getSkillByFullName(fullName: string): Promise<Skill | undefined>;
  updateSkill(id: string, updates: Partial<Skill>): Promise<void>;
  querySkills(params: SkillQueryParams): Promise<Skill[]>;
  starSkill(skillId: string, agentId: string, zapSats: number): Promise<void>;
  recalculateSkillScore(skillId: string): Promise<void>;
}

// Database adapter selection
function createDatabaseAdapter(): DatabaseAdapter {
  const isVercel = process.env.VERCEL === '1';
  const hasPostgres = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  console.log(`Database selection: isVercel=${isVercel}, hasPostgres=${!!hasPostgres}`);
  
  if (isVercel && hasPostgres) {
    console.log('Using PostgreSQL adapter for Vercel deployment');
    return createPostgresAdapter();
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('Using SQLite adapter for development');
    return createSQLiteAdapter();
  } else {
    console.log('Using in-memory adapter as fallback');
    return createInMemoryAdapter();
  }
}

// PostgreSQL adapter using Vercel Postgres
function createPostgresAdapter(): DatabaseAdapter {
  let db: any;
  
  return {
    async initDb() {
      try {
        // Dynamic import for Vercel Postgres
        const { sql } = await import('@vercel/postgres');
        db = sql;
        
        // Create tables if they don't exist
        await db`
          CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            api_key_hash TEXT NOT NULL,
            nostr_pubkey TEXT,
            colony_id TEXT,
            trust_score INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;

        await db`
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
            last_activity_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (author_id) REFERENCES agents(id)
          )
        `;

        await db`
          CREATE TABLE IF NOT EXISTS stars (
            id TEXT PRIMARY KEY,
            skill_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            zap_sats INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (skill_id) REFERENCES skills(id),
            FOREIGN KEY (agent_id) REFERENCES agents(id),
            UNIQUE(skill_id, agent_id)
          )
        `;

        // Create indexes
        await db`CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)`;
        await db`CREATE INDEX IF NOT EXISTS idx_skills_score ON skills(score DESC)`;
        await db`CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id)`;
        await db`CREATE INDEX IF NOT EXISTS idx_skills_full_name ON skills(full_name)`;

        console.log('PostgreSQL database initialized successfully');
      } catch (err) {
        console.error('PostgreSQL initialization error:', err);
        throw err;
      }
    },

    async createAgent(username: string, apiKeyHash: string, nostrPubkey?: string, colonyId?: string): Promise<Agent> {
      const id = randomUUID();
      const now = new Date().toISOString();
      
      await db`
        INSERT INTO agents (id, username, api_key_hash, nostr_pubkey, colony_id, created_at) 
        VALUES (${id}, ${username}, ${apiKeyHash}, ${nostrPubkey || null}, ${colonyId || null}, ${now})
      `;
      
      const result = await db`SELECT * FROM agents WHERE id = ${id}`;
      return result.rows[0];
    },

    async getAgentById(id: string): Promise<Agent | undefined> {
      const result = await db`SELECT * FROM agents WHERE id = ${id}`;
      return result.rows[0];
    },

    async getAgentByUsername(username: string): Promise<Agent | undefined> {
      const result = await db`SELECT * FROM agents WHERE username = ${username}`;
      return result.rows[0];
    },

    async getAgentByApiKeyHash(hash: string): Promise<Agent | undefined> {
      const result = await db`SELECT * FROM agents WHERE api_key_hash = ${hash}`;
      return result.rows[0];
    },

    async createSkill(data: {
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
    }): Promise<Skill> {
      const id = randomUUID();
      const author = await this.getAgentById(data.author_id);
      if (!author) throw new Error('Author not found');
      
      const fullName = `@${author.username}/${data.name}`;
      const now = new Date().toISOString();
      
      await db`
        INSERT INTO skills (
          id, author_id, name, full_name, version, description,
          category, capabilities, dependencies, interface_type,
          api_base, homepage, license, repo_url, skill_md_content,
          created_at, updated_at, last_activity_at
        ) VALUES (
          ${id}, ${data.author_id}, ${data.name}, ${fullName}, ${data.version}, ${data.description},
          ${data.category || null}, ${JSON.stringify(data.capabilities || [])}, ${JSON.stringify(data.dependencies || [])}, ${data.interface_type || null},
          ${data.api_base || null}, ${data.homepage || null}, ${data.license || null}, ${data.repo_url || null}, ${data.skill_md_content || null},
          ${now}, ${now}, ${now}
        )
      `;
      
      const result = await db`SELECT * FROM skills WHERE id = ${id}`;
      return result.rows[0];
    },

    async getSkillById(id: string): Promise<Skill | undefined> {
      const result = await db`SELECT * FROM skills WHERE id = ${id}`;
      return result.rows[0];
    },

    async getSkillByFullName(fullName: string): Promise<Skill | undefined> {
      const result = await db`SELECT * FROM skills WHERE full_name = ${fullName}`;
      return result.rows[0];
    },

    async updateSkill(id: string, updates: Partial<Skill>): Promise<void> {
      const skill = await this.getSkillById(id);
      if (!skill) throw new Error('Skill not found');
      
      const now = new Date().toISOString();
      
      // For simplicity, we'll update common fields
      // In production, you'd want dynamic field updates
      if (updates.version) {
        await db`UPDATE skills SET version = ${updates.version}, updated_at = ${now} WHERE id = ${id}`;
      }
      if (updates.description) {
        await db`UPDATE skills SET description = ${updates.description}, updated_at = ${now} WHERE id = ${id}`;
      }
      if (updates.category) {
        await db`UPDATE skills SET category = ${updates.category}, updated_at = ${now} WHERE id = ${id}`;
      }
      if (updates.capabilities) {
        await db`UPDATE skills SET capabilities = ${JSON.stringify(updates.capabilities)}, updated_at = ${now} WHERE id = ${id}`;
      }
      if (updates.skill_md_content) {
        await db`UPDATE skills SET skill_md_content = ${updates.skill_md_content}, updated_at = ${now} WHERE id = ${id}`;
      }
    },

    async querySkills(params: SkillQueryParams): Promise<Skill[]> {
      // Build query conditions
      let result;
      
      if (params.category && params.capability) {
        result = await db`
          SELECT * FROM skills 
          WHERE category = ${params.category} AND capabilities LIKE ${`%"${params.capability}"%`}
          ORDER BY score DESC 
          LIMIT ${Math.min(params.limit || 20, 100)} 
          OFFSET ${params.offset || 0}
        `;
      } else if (params.category) {
        result = await db`
          SELECT * FROM skills 
          WHERE category = ${params.category}
          ORDER BY score DESC 
          LIMIT ${Math.min(params.limit || 20, 100)} 
          OFFSET ${params.offset || 0}
        `;
      } else if (params.capability) {
        result = await db`
          SELECT * FROM skills 
          WHERE capabilities LIKE ${`%"${params.capability}"%`}
          ORDER BY score DESC 
          LIMIT ${Math.min(params.limit || 20, 100)} 
          OFFSET ${params.offset || 0}
        `;
      } else if (params.q) {
        result = await db`
          SELECT * FROM skills 
          WHERE name ILIKE ${`%${params.q}%`} OR description ILIKE ${`%${params.q}%`}
          ORDER BY score DESC 
          LIMIT ${Math.min(params.limit || 20, 100)} 
          OFFSET ${params.offset || 0}
        `;
      } else if (params.author) {
        result = await db`
          SELECT * FROM skills 
          WHERE full_name LIKE ${`@${params.author}/%`}
          ORDER BY score DESC 
          LIMIT ${Math.min(params.limit || 20, 100)} 
          OFFSET ${params.offset || 0}
        `;
      } else {
        // Default: return all skills sorted by score
        result = await db`
          SELECT * FROM skills 
          ORDER BY score DESC 
          LIMIT ${Math.min(params.limit || 20, 100)} 
          OFFSET ${params.offset || 0}
        `;
      }

      return result.rows;
    },

    async starSkill(skillId: string, agentId: string, zapSats: number = 0): Promise<void> {
      const existing = await db`SELECT * FROM stars WHERE skill_id = ${skillId} AND agent_id = ${agentId}`;
      
      if (existing.rows.length > 0) {
        await db`UPDATE stars SET zap_sats = zap_sats + ${zapSats} WHERE skill_id = ${skillId} AND agent_id = ${agentId}`;
      } else {
        await db`
          INSERT INTO stars (id, skill_id, agent_id, zap_sats, created_at) 
          VALUES (${randomUUID()}, ${skillId}, ${agentId}, ${zapSats}, ${new Date().toISOString()})
        `;
      }
      
      await this.recalculateSkillScore(skillId);
    },

    async recalculateSkillScore(skillId: string): Promise<void> {
      const stats = await db`
        SELECT COUNT(*) as star_count, COALESCE(SUM(zap_sats), 0) as zap_total 
        FROM stars WHERE skill_id = ${skillId}
      `;
      
      const { star_count, zap_total } = stats.rows[0];
      const score = parseInt(star_count) + (parseInt(zap_total) / 10);
      
      await db`
        UPDATE skills SET star_count = ${star_count}, zap_total_sats = ${zap_total}, score = ${score} 
        WHERE id = ${skillId}
      `;
    }
  };
}

// SQLite adapter (for development)
function createSQLiteAdapter(): DatabaseAdapter {
  const sqliteDb = require('./db.js');
  
  // Wrap synchronous functions to be async-compatible
  return {
    async initDb(path?: string) { return sqliteDb.initDb(path); },
    saveDb: sqliteDb.saveDb,
    async createAgent(username: string, apiKeyHash: string, nostrPubkey?: string, colonyId?: string) {
      return sqliteDb.createAgent(username, apiKeyHash, nostrPubkey, colonyId);
    },
    async getAgentById(id: string) { return sqliteDb.getAgentById(id); },
    async getAgentByUsername(username: string) { return sqliteDb.getAgentByUsername(username); },
    async getAgentByApiKeyHash(hash: string) { return sqliteDb.getAgentByApiKeyHash(hash); },
    async createSkill(data: any) { return sqliteDb.createSkill(data); },
    async getSkillById(id: string) { return sqliteDb.getSkillById(id); },
    async getSkillByFullName(fullName: string) { return sqliteDb.getSkillByFullName(fullName); },
    async updateSkill(id: string, updates: any) { return sqliteDb.updateSkill(id, updates); },
    async querySkills(params: any) { return sqliteDb.querySkills(params); },
    async starSkill(skillId: string, agentId: string, zapSats: number) { return sqliteDb.starSkill(skillId, agentId, zapSats); },
    async recalculateSkillScore(skillId: string) { return sqliteDb.recalculateSkillScore(skillId); }
  };
}

// In-memory adapter (fallback)
function createInMemoryAdapter(): DatabaseAdapter {
  const memDb = require('./simple-db.js');
  
  // Wrap synchronous functions to be async-compatible
  return {
    async initDb(path?: string) { return memDb.initDb(path); },
    saveDb: memDb.saveDb,
    async createAgent(username: string, apiKeyHash: string, nostrPubkey?: string, colonyId?: string) {
      return memDb.createAgent(username, apiKeyHash, nostrPubkey, colonyId);
    },
    async getAgentById(id: string) { return memDb.getAgentById(id); },
    async getAgentByUsername(username: string) { return memDb.getAgentByUsername(username); },
    async getAgentByApiKeyHash(hash: string) { return memDb.getAgentByApiKeyHash(hash); },
    async createSkill(data: any) { return memDb.createSkill(data); },
    async getSkillById(id: string) { return memDb.getSkillById(id); },
    async getSkillByFullName(fullName: string) { return memDb.getSkillByFullName(fullName); },
    async updateSkill(id: string, updates: any) { return memDb.updateSkill(id, updates); },
    async querySkills(params: any) { return memDb.querySkills(params); },
    async starSkill(skillId: string, agentId: string, zapSats: number) { return memDb.starSkill(skillId, agentId, zapSats); },
    async recalculateSkillScore(skillId: string) { return memDb.recalculateSkillScore(skillId); }
  };
}

// Export the singleton database instance
const database = createDatabaseAdapter();

// Export all database functions
export const initDb = database.initDb.bind(database);
export const saveDb = database.saveDb?.bind(database);

export const createAgent = database.createAgent.bind(database);
export const getAgentById = database.getAgentById.bind(database);
export const getAgentByUsername = database.getAgentByUsername.bind(database);
export const getAgentByApiKeyHash = database.getAgentByApiKeyHash.bind(database);

export const createSkill = database.createSkill.bind(database);
export const getSkillById = database.getSkillById.bind(database);
export const getSkillByFullName = database.getSkillByFullName.bind(database);
export const updateSkill = database.updateSkill.bind(database);
export const querySkills = database.querySkills.bind(database);
export const starSkill = database.starSkill.bind(database);
export const recalculateSkillScore = database.recalculateSkillScore.bind(database);