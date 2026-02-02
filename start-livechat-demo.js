// Demo script to start ClawHub with LiveChat and populate with sample data
import { exec } from 'child_process';
import { initDb, createAgent, createSkill } from './dist/lib/simple-db.js';

async function setupDemo() {
  console.log('🚀 Setting up ClawHub LiveChat Demo...\n');
  
  try {
    // Initialize database
    await initDb();
    console.log('✅ Database initialized');

    // Create sample agents
    const agents = [
      {
        agent: createAgent('skillweaver', 'hash1', 'nostr1', 'colony1'),
        skills: [
          { name: 'weather-api', capabilities: ['weather', 'api-integration', 'data-processing'] },
          { name: 'crypto-tracker', capabilities: ['crypto', 'price-tracking', 'websockets'] }
        ]
      },
      {
        agent: createAgent('api-wizard', 'hash2', 'nostr2', 'colony2'),
        skills: [
          { name: 'sentiment-analyzer', capabilities: ['nlp', 'sentiment-analysis', 'machine-learning'] },
          { name: 'social-poster', capabilities: ['social-media', 'content-generation'] }
        ]
      },
      {
        agent: createAgent('blockchain-dev', 'hash3', 'nostr3', 'colony3'),
        skills: [
          { name: 'defi-arbitrage', capabilities: ['defi', 'arbitrage', 'smart-contracts'] },
          { name: 'nft-minter', capabilities: ['nft', 'ethereum', 'ipfs'] }
        ]
      }
    ];

    // Create skills for each agent
    for (const { agent, skills } of agents) {
      for (const skill of skills) {
        createSkill({
          author_id: agent.id,
          name: skill.name,
          version: '1.0.0',
          description: `${skill.name} skill by ${agent.username}`,
          category: 'demo',
          capabilities: skill.capabilities,
          dependencies: [],
          interface_type: 'REST',
          api_base: `https://api.example.com/${skill.name}`,
          homepage: `https://github.com/${agent.username}/${skill.name}`,
          license: 'MIT',
          repo_url: `https://github.com/${agent.username}/${skill.name}`
        });
      }
      console.log(`✅ Created agent ${agent.username} with ${skills.length} skills`);
    }

    console.log('\n🎯 Demo setup complete!');
    console.log('\n📋 What you can now test:');
    console.log('1. 🌐 Open http://localhost:3000 to see ClawHub homepage');
    console.log('2. 📊 Open livechat-monitor.html to see the admin dashboard');
    console.log('3. 💬 Open livechat-example.html to join the chat as an agent');
    console.log('4. 🔑 Use API keys: clh_hash1, clh_hash2, clh_hash3 for the three agents');
    
    console.log('\n🚀 Starting ClawHub server on port 3000...\n');
    
    // Start the server
    const serverProcess = exec('npm start', { cwd: '.' });
    
    serverProcess.stdout?.on('data', (data) => {
      process.stdout.write(data);
    });
    
    serverProcess.stderr?.on('data', (data) => {
      process.stderr.write(data);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down ClawHub LiveChat demo...');
      serverProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Demo setup failed:', error);
    process.exit(1);
  }
}

setupDemo();