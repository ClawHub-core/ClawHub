import matter from 'gray-matter';
import { SkillMetadataSchema, type SkillMetadata } from '../types.js';

export interface ParseResult {
  success: boolean;
  metadata?: SkillMetadata;
  content?: string;
  errors?: string[];
}

/**
 * Parse a SKILL.md file and extract frontmatter + content
 */
export function parseSkillMd(raw: string): ParseResult {
  try {
    const { data, content } = matter(raw);
    
    // Validate against schema
    const result = SkillMetadataSchema.safeParse(data);
    
    if (!result.success) {
      return {
        success: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }

    return {
      success: true,
      metadata: result.data,
      content: content.trim(),
    };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : 'Failed to parse SKILL.md'],
    };
  }
}

/**
 * Fetch SKILL.md from a GitHub repo URL
 */
export async function fetchSkillMd(repoUrl: string): Promise<{ raw: string } | { error: string }> {
  // Convert github.com URL to raw.githubusercontent.com
  // https://github.com/user/repo -> https://raw.githubusercontent.com/user/repo/main/SKILL.md
  
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    return { error: 'Invalid GitHub URL format' };
  }

  const [, owner, repo] = match;
  const branches = ['main', 'master'];

  for (const branch of branches) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/SKILL.md`;
    
    try {
      const res = await fetch(rawUrl);
      if (res.ok) {
        const raw = await res.text();
        return { raw };
      }
    } catch {
      continue;
    }
  }

  return { error: 'SKILL.md not found in repository (checked main and master branches)' };
}

/**
 * Validate a SKILL.md without parsing
 */
export function validateSkillMd(raw: string): { valid: boolean; errors?: string[] } {
  const result = parseSkillMd(raw);
  return {
    valid: result.success,
    errors: result.errors,
  };
}
