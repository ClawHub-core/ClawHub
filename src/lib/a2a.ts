import type { SkillMetadata, A2AAgentCard } from '../types.js';

/**
 * Generate an A2A Agent Card from parsed SKILL.md metadata
 * Following Google's A2A protocol spec
 */
export function generateAgentCard(
  metadata: SkillMetadata,
  options: {
    author: string;
    baseUrl: string;
  }
): A2AAgentCard {
  const fullName = `@${options.author}/${metadata.name}`;
  
  const card: A2AAgentCard = {
    name: metadata.name,
    version: metadata.version,
    protocolVersion: '0.3.0',
    description: metadata.description,
    url: `${options.baseUrl}/skills/${fullName}`,
  };

  // Generate skills array from capabilities
  if (metadata.capabilities?.length) {
    card.skills = metadata.capabilities.map((cap, i) => ({
      id: `${metadata.name}-${cap}`,
      name: `${metadata.name} ${cap}`,
      description: `${metadata.description} (${cap} interface)`,
    }));
  } else {
    // Default skill entry
    card.skills = [{
      id: metadata.name,
      name: metadata.name,
      description: metadata.description,
    }];
  }

  // Add interfaces
  const interfaces: A2AAgentCard['additionalInterfaces'] = [];
  
  if (metadata.metadata?.api_base) {
    interfaces.push({
      url: metadata.metadata.api_base,
      transport: metadata.interface || 'REST',
    });
  }

  if (metadata.homepage) {
    interfaces.push({
      url: metadata.homepage,
      transport: 'HTTP',
    });
  }

  if (interfaces.length > 0) {
    card.additionalInterfaces = interfaces;
  }

  return card;
}

/**
 * Serialize agent card to JSON string
 */
export function serializeAgentCard(card: A2AAgentCard): string {
  return JSON.stringify(card, null, 2);
}
