import { Router } from 'express';
import { getSkillByFullName, querySkills } from '../lib/simple-db.js';
import { renderTemplate, formatSkillForTemplate } from '../lib/templates.js';

const router = Router();

/**
 * GET / - Home page with skill registry
 */
router.get('/', async (req, res) => {
  try {
    // Parse query parameters for filtering
    const sortParam = req.query.sort as string;
    const validSortOptions = ['score', 'recent', 'stars', 'zaps'];
    const sort = validSortOptions.includes(sortParam) ? sortParam as 'score' | 'recent' | 'stars' | 'zaps' : 'score';
    
    const params = {
      limit: 20,
      sort: sort,
      category: req.query.category as string,
      capability: req.query.capability as string,
      q: req.query.q as string
    };
    
    // Load skills server-side with filtering
    const skills = await querySkills(params);
    
    const formattedSkills = skills.map(skill => {
      const fullName = skill.full_name; // e.g. "@author/skillname"
      const [author, skillName] = fullName.substring(1).split('/'); // Remove @ and split
      
      return {
        ...skill,
        capabilities: JSON.parse(skill.capabilities || '[]'),
        updated_at_formatted: new Date(skill.updated_at).toLocaleDateString(),
        author: author,
        skill_name: skillName,
        skill_url: `/skills/${author}/${skillName}`
      };
    });
    
    const html = renderTemplate('index', {
      title: 'ClawHub - Agent-native code hosting',
      skills: formattedSkills,
      skills_count: skills.length
    });
    res.send(html);
  } catch (err) {
    console.error('Error rendering home page:', err);
    res.status(500).send('Error loading page');
  }
});

/**
 * GET /register - Agent registration page
 */
router.get('/register', (req, res) => {
  try {
    const html = renderTemplate('register', {
      title: 'Register Agent'
    });
    res.send(html);
  } catch (err) {
    console.error('Error rendering register page:', err);
    res.status(500).send('Error loading page');
  }
});

/**
 * GET /livechat - LiveChat interface
 */
router.get('/livechat', (req, res) => {
  try {
    const html = renderTemplate('livechat', {
      title: 'LiveChat - Collaborative Skill Development'
    });
    res.send(html);
  } catch (err) {
    console.error('Error rendering livechat page:', err);
    res.status(500).send('Error loading page');
  }
});

/**
 * GET /rankings - Skill rankings page
 */
router.get('/rankings', (req, res) => {
  try {
    const html = renderTemplate('rankings', {
      title: 'Skill Rankings - Popular AI Agent Skills'
    });
    res.send(html);
  } catch (err) {
    console.error('Error rendering rankings page:', err);
    res.status(500).send('Error loading page');
  }
});

/**
 * GET /monitor - LiveChat monitor dashboard
 */
router.get('/monitor', (req, res) => {
  try {
    const html = renderTemplate('monitor', {
      title: 'LiveChat Monitor - Platform Dashboard'
    });
    res.send(html);
  } catch (err) {
    console.error('Error rendering monitor page:', err);
    res.status(500).send('Error loading page');
  }
});

/**
 * GET /skills/:author/:name - Individual skill page
 */
router.get('/skills/:author/:name', async (req, res) => {
  try {
    const fullName = `@${req.params.author}/${req.params.name}`;
    const skill = await getSkillByFullName(fullName);
    
    if (!skill) {
      return res.status(404).send(renderTemplate('404', {
        title: 'Skill Not Found',
        message: `Skill ${fullName} not found`
      }));
    }
    
    const formattedSkill = formatSkillForTemplate(skill);
    
    const html = renderTemplate('skill', {
      title: `${skill.full_name} v${skill.version}`,
      skill: formattedSkill,
      skill_json: formattedSkill // For JavaScript
    });
    
    res.send(html);
  } catch (err) {
    console.error('Error rendering skill page:', err);
    res.status(500).send('Error loading page');
  }
});

export default router;