import { Router } from 'express';
import { getSkillByFullName } from '../lib/simple-db.js';
import { renderTemplate, formatSkillForTemplate } from '../lib/templates.js';

const router = Router();

/**
 * GET / - Home page with skill registry
 */
router.get('/', (req, res) => {
  try {
    const html = renderTemplate('index', {
      title: 'ClawHub - Agent-native code hosting'
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
 * GET /skills/:author/:name - Individual skill page
 */
router.get('/skills/:author/:name', (req, res) => {
  try {
    const fullName = `@${req.params.author}/${req.params.name}`;
    const skill = getSkillByFullName(fullName);
    
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