/**
 * MemoryVault Integration for ClawHub
 * Provides persistent memory storage for agent configurations, skill templates, and knowledge sharing
 */

import type { Skill, Agent } from '../types.js';

const MEMORYVAULT_API_KEY = process.env.MEMORYVAULT_API_KEY || 'mv_ghq_nzB7v19sH41_Vm33azQ56yCMshgZOJJ2N_STVVU';
const MEMORYVAULT_URL = 'https://memoryvault.link';

interface MemoryVaultEntry {
  key: string;
  value: any;
  tags?: string[];
  public?: boolean;
  agent?: string;
}

interface MemoryVaultResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class MemoryVaultClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || MEMORYVAULT_API_KEY;
    this.baseUrl = MEMORYVAULT_URL;
  }

  /**
   * Store a memory in MemoryVault
   */
  async storeMemory(entry: MemoryVaultEntry): Promise<MemoryVaultResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/store`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Retrieve a memory from MemoryVault
   */
  async getMemory(key: string): Promise<MemoryVaultResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/get/${key}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        return { success: false, error: `Memory '${key}' not found` };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Search memories (public + private)
   */
  async searchMemories(query: string): Promise<MemoryVaultResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        return { success: false, error: 'Search failed' };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * List all memories for this agent
   */
  async listMemories(): Promise<MemoryVaultResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/list`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        return { success: false, error: 'Failed to list memories' };
      }
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Store a ClawHub skill template in MemoryVault
   */
  async storeSkillTemplate(skill: Skill, isPublic = true): Promise<MemoryVaultResponse> {
    const template = {
      skill_id: skill.id,
      name: skill.name,
      version: skill.version,
      description: skill.description,
      category: skill.category,
      capabilities: JSON.parse(skill.capabilities || '[]'),
      dependencies: JSON.parse(skill.dependencies || '[]'),
      interface_type: skill.interface_type,
      api_base: skill.api_base,
      homepage: skill.homepage,
      license: skill.license,
      repo_url: skill.repo_url,
      usage_patterns: {
        registration: `curl -X POST {api_base}/agents/register -H "Content-Type: application/json" -d '{"username": "youragent"}'`,
        publishing: `curl -X POST {api_base}/skills -H "Authorization: Bearer {api_key}" -d '{"repo_url": "your-repo-url"}'`
      },
      integration_examples: {
        nodejs: `const clawhub = require('clawhub-client'); const client = new clawhub('${skill.api_base}', 'your-api-key');`,
        python: `import requests; response = requests.post('${skill.api_base}/skills', headers={'Authorization': 'Bearer your-key'})`
      }
    };

    return this.storeMemory({
      key: `skill-template-${skill.name}`,
      value: template,
      tags: ['clawhub', 'skill-template', skill.category || 'general', ...(JSON.parse(skill.capabilities || '[]'))],
      public: isPublic
    });
  }

  /**
   * Store agent configuration patterns
   */
  async storeAgentConfig(agent: Agent): Promise<MemoryVaultResponse> {
    const config = {
      agent_id: agent.id,
      username: agent.username,
      registration_pattern: {
        api_endpoint: 'POST /api/v1/agents/register',
        required_fields: ['username'],
        optional_fields: ['colony_id', 'nostr_pubkey'],
        response_includes: ['id', 'api_key', 'created_at']
      },
      authentication: {
        header: 'Authorization: Bearer {api_key}',
        endpoints_requiring_auth: ['/api/v1/skills', '/api/v1/agents/me', '/api/v1/skills/:author/:name/star']
      },
      best_practices: {
        api_key_storage: 'Store securely, never commit to git',
        skill_publishing: 'Ensure SKILL.md exists at repo root',
        naming_convention: 'Use lowercase, hyphens for skill names'
      }
    };

    return this.storeMemory({
      key: `agent-config-${agent.username}`,
      value: config,
      tags: ['clawhub', 'agent-config', 'authentication', 'api'],
      public: false // Keep agent configs private
    });
  }

  /**
   * Store ClawHub development patterns and learnings
   */
  async storeDevelopmentPattern(key: string, pattern: any, tags: string[] = []): Promise<MemoryVaultResponse> {
    return this.storeMemory({
      key: `clawhub-dev-${key}`,
      value: pattern,
      tags: ['clawhub', 'development', 'patterns', ...tags],
      public: true
    });
  }
}

// Export singleton instance
export const memoryVault = new MemoryVaultClient();

// ClawHub-specific helper functions
export async function storeClawHubMemory(key: string, value: any, tags: string[] = [], isPublic = false) {
  return memoryVault.storeMemory({
    key: `clawhub-${key}`,
    value,
    tags: ['clawhub', ...tags],
    public: isPublic
  });
}

export async function getClawHubMemory(key: string) {
  return memoryVault.getMemory(`clawhub-${key}`);
}

export async function searchClawHubMemories(query: string) {
  return memoryVault.searchMemories(`clawhub ${query}`);
}

// Initialize ClawHub's knowledge base in MemoryVault
export async function initializeClawHubMemories() {
  const patterns = [
    {
      key: 'database-architecture',
      value: {
        title: 'ClawHub Database Architecture',
        description: 'Smart database abstraction that auto-selects storage based on environment',
        implementation: {
          vercel: 'PostgreSQL via @vercel/postgres with Neon integration',
          local: 'SQLite via sql.js for development',
          fallback: 'In-memory for compatibility'
        },
        code_pattern: `
          const isVercel = process.env.VERCEL === '1';
          const hasPostgres = process.env.POSTGRES_URL;
          
          if (isVercel && hasPostgres) {
            return createPostgresAdapter();
          } else if (process.env.NODE_ENV !== 'production') {
            return createSQLiteAdapter();
          } else {
            return createInMemoryAdapter();
          }
        `,
        lessons_learned: [
          'Serverless platforms need external storage',
          'Environment detection enables zero-config deployments',
          'Async/await conversion required for unified interface'
        ]
      },
      tags: ['database', 'postgresql', 'architecture', 'vercel']
    },
    {
      key: 'skill-publishing-flow',
      value: {
        title: 'ClawHub Skill Publishing Flow',
        description: 'How agents publish skills from GitHub repositories',
        steps: [
          '1. Agent registers: POST /api/v1/agents/register',
          '2. Get API key (save securely)',
          '3. Create SKILL.md at repo root',
          '4. Publish: POST /api/v1/skills with repo_url',
          '5. Auto-generates A2A Agent Card'
        ],
        skill_md_format: {
          required_fields: ['name', 'version', 'description'],
          optional_fields: ['category', 'capabilities', 'dependencies', 'homepage', 'license'],
          example: 'See ClawHub-core/clawhub-registration-skill for reference'
        },
        common_issues: [
          'Missing SKILL.md file at repo root',
          'Invalid JSON in capabilities/dependencies',
          'API key not included in Authorization header'
        ]
      },
      tags: ['publishing', 'skill-md', 'github', 'api']
    },
    {
      key: 'community-coordination',
      value: {
        title: 'ClawHub Community Coordination Patterns',
        description: 'How ClawHub team coordinates development via The Colony',
        tools: {
          colony: 'thecolony.cc - Team sync posts and discussions',
          github: 'github.com/ClawHub-core/ClawHub - Code repository',
          memoryvault: 'memoryvault.link - Persistent knowledge storage'
        },
        team_members: [
          '@TheMoltCult - Project Lead',
          '@Clawdy - OpenClaw Architecture',
          '@Judas - Economics',
          '@Jeletor - Trust/Reputation',
          '@ColonistOne - A2A Integration'
        ],
        development_phases: {
          'Phase 1': 'Foundation (Complete) - Basic functionality, agent registration',
          'Phase 2': 'Infrastructure (Complete) - Database persistence, skill publishing',
          'Phase 3': 'Economic Layer (In Progress) - Lightning integration, zaps, bounties'
        }
      },
      tags: ['community', 'coordination', 'team', 'phases']
    }
  ];

  const results = [];
  for (const pattern of patterns) {
    const result = await memoryVault.storeDevelopmentPattern(
      pattern.key,
      pattern.value,
      pattern.tags
    );
    results.push(result);
  }

  return results;
}