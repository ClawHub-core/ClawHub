import { readFileSync } from 'fs';
import { join } from 'path';

// For CommonJS build, use relative path from dist/lib/
const VIEWS_DIR = join(__dirname, '../views');

/**
 * Simple template engine with basic {{variable}} substitution
 */
export function renderTemplate(templateName: string, data: Record<string, any> = {}): string {
  // Load layout and template
  const layoutPath = join(VIEWS_DIR, 'layout.html');
  const templatePath = join(VIEWS_DIR, `${templateName}.html`);
  
  let layout = readFileSync(layoutPath, 'utf-8');
  let content = readFileSync(templatePath, 'utf-8');
  
  // Process template content first
  content = processTemplate(content, data);
  
  // Insert content into layout
  layout = layout.replace('{{content}}', content);
  
  // Process layout variables
  layout = processTemplate(layout, {
    title: data.title || templateName.charAt(0).toUpperCase() + templateName.slice(1),
    ...data
  });
  
  return layout;
}

function processTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  
  // Simple variable substitution {{variable}}
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const cleanKey = key.trim();
    
    // Handle nested properties like skill.name
    const value = getNestedValue(data, cleanKey);
    return value !== undefined ? String(value) : match;
  });
  
  // Handle conditional blocks {{#if variable}}...{{/if}}
  result = result.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, block) => {
    const cleanCondition = condition.trim();
    const value = getNestedValue(data, cleanCondition);
    return value ? processTemplate(block, data) : '';
  });
  
  // Handle each blocks {{#each array}}...{{/each}}
  result = result.replace(/\{\{#each ([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayKey, block) => {
    const cleanKey = arrayKey.trim();
    const array = getNestedValue(data, cleanKey);
    
    if (!Array.isArray(array)) return '';
    
    return array.map(item => {
      // For primitive arrays, {{this}} refers to the item
      if (typeof item !== 'object') {
        return block.replace(/\{\{this\}\}/g, String(item));
      }
      // For object arrays, merge item properties into template context
      return processTemplate(block, { ...data, ...item, this: item });
    }).join('');
  });
  
  // Handle triple braces for raw JSON {{{variable}}}
  result = result.replace(/\{\{\{([^}]+)\}\}\}/g, (match, key) => {
    const cleanKey = key.trim();
    const value = getNestedValue(data, cleanKey);
    return value !== undefined ? JSON.stringify(value) : match;
  });
  
  return result;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format skill data for template
 */
export function formatSkillForTemplate(skill: any): any {
  return {
    ...skill,
    capabilities: typeof skill.capabilities === 'string' ? 
      JSON.parse(skill.capabilities) : skill.capabilities,
    dependencies: typeof skill.dependencies === 'string' ? 
      JSON.parse(skill.dependencies) : skill.dependencies,
    updated_at: formatDate(skill.updated_at),
    created_at: formatDate(skill.created_at),
    score: parseFloat(skill.score || 0).toFixed(1)
  };
}