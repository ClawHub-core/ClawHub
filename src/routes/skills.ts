import { Router } from 'express';
import { createSkill, getSkillByFullName, getSkillById, querySkills, updateSkill, starSkill } from '../lib/simple-db.js';
import { parseSkillMd, fetchSkillMd } from '../lib/parser.js';
import { generateAgentCard, serializeAgentCard } from '../lib/a2a.js';
import { authMiddleware, optionalAuthMiddleware } from '../lib/auth.js';
import type { Agent, SkillQueryParams } from '../types.js';

const router = Router();

const BASE_URL = process.env.BASE_URL || 'https://clawhub.dev';

/**
 * GET /api/v1/skills
 * Query/search skills
 */
router.get('/', optionalAuthMiddleware, (req, res) => {
  try {
    const params: SkillQueryParams = {
      capability: req.query.capability as string,
      category: req.query.category as string,
      author: req.query.author as string,
      q: req.query.q as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sort: req.query.sort as SkillQueryParams['sort'],
    };

    const skills = querySkills(params);
    
    res.json({
      skills: skills.map(s => ({
        id: s.id,
        full_name: s.full_name,
        name: s.name,
        version: s.version,
        description: s.description,
        category: s.category,
        capabilities: JSON.parse(s.capabilities),
        interface: s.interface_type,
        star_count: s.star_count,
        zap_total_sats: s.zap_total_sats,
        score: s.score,
        homepage: s.homepage,
        updated_at: s.updated_at,
      })),
      count: skills.length,
    });
  } catch (err) {
    console.error('Error querying skills:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/skills
 * Publish a new skill (fetch from GitHub repo)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const agent = (req as any).agent as Agent;
    const { repo_url } = req.body;

    if (!repo_url) {
      return res.status(400).json({ error: 'repo_url is required' });
    }

    // Fetch SKILL.md from repo
    const fetchResult = await fetchSkillMd(repo_url);
    if ('error' in fetchResult) {
      return res.status(400).json({ error: fetchResult.error });
    }

    // Parse SKILL.md
    const parseResult = parseSkillMd(fetchResult.raw);
    if (!parseResult.success || !parseResult.metadata) {
      return res.status(400).json({
        error: 'Invalid SKILL.md',
        details: parseResult.errors,
      });
    }

    const meta = parseResult.metadata;
    const fullName = `@${agent.username}/${meta.name}`;

    // Check if skill already exists
    const existing = getSkillByFullName(fullName);
    if (existing) {
      // Update existing skill
      updateSkill(existing.id, {
        version: meta.version,
        description: meta.description,
        category: meta.metadata?.category,
        capabilities: JSON.stringify(meta.capabilities || []),
        dependencies: JSON.stringify(meta.dependencies || []),
        interface_type: meta.interface,
        api_base: meta.metadata?.api_base,
        homepage: meta.homepage,
        license: meta.license,
        repo_url,
        skill_md_content: fetchResult.raw,
      });

      const updated = getSkillById(existing.id)!;
      return res.json({
        message: 'Skill updated',
        skill: formatSkillResponse(updated, agent.username),
      });
    }

    // Create new skill
    const skill = createSkill({
      author_id: agent.id,
      name: meta.name,
      version: meta.version,
      description: meta.description,
      category: meta.metadata?.category,
      capabilities: meta.capabilities,
      dependencies: meta.dependencies,
      interface_type: meta.interface,
      api_base: meta.metadata?.api_base,
      homepage: meta.homepage,
      license: meta.license,
      repo_url,
      skill_md_content: fetchResult.raw,
    });

    res.status(201).json({
      message: 'Skill published',
      skill: formatSkillResponse(skill, agent.username),
    });
  } catch (err) {
    console.error('Error publishing skill:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/skills/:fullName
 * Get a specific skill by @author/name
 */
router.get('/:author/:name', optionalAuthMiddleware, (req, res) => {
  try {
    const fullName = `@${req.params.author}/${req.params.name}`;
    const skill = getSkillByFullName(fullName);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json(formatSkillResponse(skill, req.params.author, true));
  } catch (err) {
    console.error('Error getting skill:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/skills/:author/:name/.well-known/agent-card.json
 * Get A2A Agent Card for a skill
 */
router.get('/:author/:name/.well-known/agent-card.json', (req, res) => {
  try {
    const fullName = `@${req.params.author}/${req.params.name}`;
    const skill = getSkillByFullName(fullName);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Parse stored SKILL.md to get metadata
    if (!skill.skill_md_content) {
      return res.status(404).json({ error: 'Skill metadata not available' });
    }

    const parseResult = parseSkillMd(skill.skill_md_content);
    if (!parseResult.success || !parseResult.metadata) {
      return res.status(500).json({ error: 'Failed to parse skill metadata' });
    }

    const card = generateAgentCard(parseResult.metadata, {
      author: req.params.author,
      baseUrl: BASE_URL,
    });

    res.setHeader('Content-Type', 'application/json');
    res.send(serializeAgentCard(card));
  } catch (err) {
    console.error('Error generating agent card:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/skills/:author/:name/star
 * Star a skill (optionally with zap)
 */
router.post('/:author/:name/star', authMiddleware, (req, res) => {
  try {
    const agent = (req as any).agent as Agent;
    const fullName = `@${req.params.author}/${req.params.name}`;
    const skill = getSkillByFullName(fullName);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const zapSats = parseInt(req.body.zap_sats) || 0;
    starSkill(skill.id, agent.id, zapSats);

    const updated = getSkillById(skill.id)!;
    res.json({
      message: zapSats > 0 ? `Starred with ${zapSats} sats` : 'Starred',
      star_count: updated.star_count,
      zap_total_sats: updated.zap_total_sats,
      score: updated.score,
    });
  } catch (err) {
    console.error('Error starring skill:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function formatSkillResponse(skill: any, author: string, includeContent = false) {
  const response: any = {
    id: skill.id,
    full_name: skill.full_name,
    name: skill.name,
    version: skill.version,
    description: skill.description,
    category: skill.category,
    capabilities: JSON.parse(skill.capabilities || '[]'),
    dependencies: JSON.parse(skill.dependencies || '[]'),
    interface: skill.interface_type,
    api_base: skill.api_base,
    homepage: skill.homepage,
    license: skill.license,
    repo_url: skill.repo_url,
    star_count: skill.star_count,
    zap_total_sats: skill.zap_total_sats,
    score: skill.score,
    created_at: skill.created_at,
    updated_at: skill.updated_at,
    agent_card_url: `${BASE_URL}/api/v1/skills/${author}/${skill.name}/.well-known/agent-card.json`,
  };

  if (includeContent && skill.skill_md_content) {
    response.skill_md = skill.skill_md_content;
  }

  return response;
}

export default router;
