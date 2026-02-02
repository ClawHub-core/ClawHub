// Test script to verify skills integration in LiveChat
import { ClawHubLiveChat } from './dist/lib/livechat.js';
import { initDb, createAgent, createSkill } from './dist/lib/simple-db.js';

console.log('🧪 Testing ClawHub LiveChat Skills Integration...\n');

async function runSkillsTest() {
  try {
    // Initialize database
    await initDb();
    console.log('✅ Database initialized');

    // Create test agents with skills
    const agent1 = createAgent('skillweaver', 'hash1', 'nostr1');
    const agent2 = createAgent('api-wizard', 'hash2', 'nostr2');
    console.log('✅ Created test agents:', agent1.username, agent2.username);

    // Create skills for the agents
    const skill1 = createSkill({
      author_id: agent1.id,
      name: 'weather-api',
      version: '1.0.0',
      description: 'Advanced weather data aggregation',
      category: 'utilities',
      capabilities: ['weather', 'api-integration', 'data-processing'],
      dependencies: [],
      interface_type: 'REST',
      api_base: 'https://example.com/api',
      repo_url: 'https://github.com/skillweaver/weather-api'
    });

    const skill2 = createSkill({
      author_id: agent1.id,
      name: 'crypto-tracker',
      version: '2.1.0',
      description: 'Real-time cryptocurrency price monitoring',
      category: 'finance',
      capabilities: ['crypto', 'price-tracking', 'websockets'],
      dependencies: ['weather-api'],
      interface_type: 'WebSocket'
    });

    const skill3 = createSkill({
      author_id: agent2.id,
      name: 'sentiment-analyzer',
      version: '1.5.0',
      description: 'AI-powered sentiment analysis for text',
      category: 'ai',
      capabilities: ['nlp', 'sentiment-analysis', 'machine-learning'],
      dependencies: []
    });

    console.log('✅ Created test skills:');
    console.log(`   - ${skill1.full_name}: ${JSON.parse(skill1.capabilities).join(', ')}`);
    console.log(`   - ${skill2.full_name}: ${JSON.parse(skill2.capabilities).join(', ')}`);
    console.log(`   - ${skill3.full_name}: ${JSON.parse(skill3.capabilities).join(', ')}`);

    // Initialize LiveChat
    const livechat = new ClawHubLiveChat();
    console.log('✅ LiveChat initialized\n');

    // Test: Mock the LiveChat join with skill fetching
    console.log('📋 Test: Agent joining with skills from database');
    
    // Simulate the database query that happens in the route
    const { querySkills } = await import('./dist/lib/simple-db.js');
    const publishedSkills1 = querySkills({ author: agent1.username, limit: 100 });
    const publishedSkills2 = querySkills({ author: agent2.username, limit: 100 });
    
    console.log(`✅ ${agent1.username} has ${publishedSkills1.length} published skills`);
    console.log(`✅ ${agent2.username} has ${publishedSkills2.length} published skills`);

    // Extract capabilities
    const capabilities1 = publishedSkills1.reduce((caps, skill) => {
      const skillCaps = JSON.parse(skill.capabilities || '[]');
      return [...caps, ...skillCaps];
    }, []);
    
    const capabilities2 = publishedSkills2.reduce((caps, skill) => {
      const skillCaps = JSON.parse(skill.capabilities || '[]');
      return [...caps, ...skillCaps];
    }, []);

    // Join chat with real skill data
    const joinResult1 = await livechat.joinChat(agent1.id, {
      username: agent1.username,
      skills: publishedSkills1.map(s => s.name),
      capabilities: [...new Set(capabilities1)]
    });

    const joinResult2 = await livechat.joinChat(agent2.id, {
      username: agent2.username,
      skills: publishedSkills2.map(s => s.name),
      capabilities: [...new Set(capabilities2)]
    });

    console.log(`✅ ${agent1.username} joined with skills:`, joinResult1.agent);
    console.log(`   Skills: ${publishedSkills1.map(s => s.name).join(', ')}`);
    console.log(`   Capabilities: ${[...new Set(capabilities1)].join(', ')}`);

    console.log(`✅ ${agent2.username} joined with skills:`, joinResult2.agent);
    console.log(`   Skills: ${publishedSkills2.map(s => s.name).join(', ')}`);
    console.log(`   Capabilities: ${[...new Set(capabilities2)].join(', ')}`);

    // Test collaboration message with skill metadata
    console.log('\n📋 Test: Collaboration message with skill context');
    await livechat.sendMessage(agent1.id, {
      message: 'Looking for someone to help with machine learning integration for my weather-api skill. Anyone with NLP experience?',
      channel: 'skill-dev',
      metadata: {
        skill: 'weather-api',
        status: 'development',
        needs: ['nlp', 'machine-learning']
      }
    });

    // Test automatic collaboration matching
    console.log('✅ Collaboration request sent with skill context');
    
    // Get stats to show everything is working
    const stats = livechat.getLiveChatStats();
    console.log('\n📊 Final Stats:');
    console.log(`   Total agents: ${stats.totalAgents}`);
    console.log(`   Active agents: ${stats.activeAgents}`);
    console.log(`   Total messages: ${stats.totalMessages}`);
    console.log(`   Skill projects: ${stats.activeSkillProjects}`);

    // Show agent details
    console.log('\n🤖 Connected Agents with Skills:');
    livechat.agents.forEach(agent => {
      console.log(`   ${agent.username}:`);
      console.log(`     Skills: ${agent.skills.join(', ') || 'None'}`);
      console.log(`     Capabilities: ${agent.capabilities.join(', ') || 'None'}`);
      console.log(`     Active channels: ${Array.from(agent.activeChannels).join(', ')}`);
    });

    console.log('\n🎉 Skills integration test passed! Agents now join LiveChat with their published skills and capabilities.');
    console.log('💡 This enables better collaboration matching and skill-specific discussions.\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runSkillsTest();