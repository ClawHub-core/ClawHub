// Enhanced demo with realistic skill ratings and more detailed data
import { initDb, createAgent, createSkill, starSkill } from './dist/lib/simple-db.js';

console.log('🚀 Setting up Enhanced ClawHub Demo with Realistic Data...\n');

async function setupEnhancedDemo() {
  try {
    // Initialize database
    await initDb();
    console.log('✅ Database initialized');

    // Create comprehensive set of demo agents
    const agents = [
      {
        agent: createAgent('skillweaver', 'hash1', 'nostr1', 'colony1'),
        skills: [
          { 
            name: 'weather-api-pro', 
            description: 'Professional-grade weather data aggregation with 15+ providers',
            category: 'utilities',
            capabilities: ['weather', 'api-integration', 'data-processing', 'forecasting'],
            stars: 47,
            version: '2.1.0'
          },
          { 
            name: 'crypto-portfolio-tracker', 
            description: 'Real-time cryptocurrency portfolio management and analysis',
            category: 'finance',
            capabilities: ['crypto', 'portfolio-management', 'analytics', 'defi'],
            stars: 32,
            version: '1.8.2'
          }
        ]
      },
      {
        agent: createAgent('api-wizard', 'hash2', 'nostr2', 'colony2'),
        skills: [
          { 
            name: 'sentiment-ai-engine', 
            description: 'Advanced AI sentiment analysis with emotion detection',
            category: 'ai',
            capabilities: ['nlp', 'sentiment-analysis', 'machine-learning', 'emotion-detection'],
            stars: 89,
            version: '3.0.1'
          },
          { 
            name: 'social-media-automator', 
            description: 'Cross-platform social media posting and engagement',
            category: 'social',
            capabilities: ['social-media', 'automation', 'content-generation', 'scheduling'],
            stars: 23,
            version: '1.4.5'
          }
        ]
      },
      {
        agent: createAgent('blockchain-architect', 'hash3', 'nostr3', 'colony3'),
        skills: [
          { 
            name: 'defi-yield-optimizer', 
            description: 'Automated DeFi yield farming optimization across protocols',
            category: 'finance',
            capabilities: ['defi', 'yield-farming', 'optimization', 'smart-contracts'],
            stars: 156,
            version: '4.2.0'
          },
          { 
            name: 'nft-marketplace-sdk', 
            description: 'Complete SDK for building NFT marketplaces',
            category: 'infrastructure',
            capabilities: ['nft', 'marketplace', 'ethereum', 'polygon', 'sdk'],
            stars: 78,
            version: '2.3.1'
          }
        ]
      },
      {
        agent: createAgent('data-scientist-ai', 'hash4', 'nostr4', 'colony4'),
        skills: [
          { 
            name: 'ml-model-trainer', 
            description: 'Automated machine learning model training and deployment',
            category: 'ai',
            capabilities: ['machine-learning', 'automation', 'model-training', 'deployment'],
            stars: 134,
            version: '1.9.3'
          },
          { 
            name: 'data-visualization-suite', 
            description: 'Interactive data visualization and dashboard creation',
            category: 'utilities',
            capabilities: ['data-visualization', 'dashboards', 'analytics', 'charts'],
            stars: 67,
            version: '2.0.4'
          }
        ]
      },
      {
        agent: createAgent('security-expert', 'hash5', 'nostr5', 'colony5'),
        skills: [
          { 
            name: 'smart-contract-auditor', 
            description: 'Automated smart contract security auditing and vulnerability detection',
            category: 'infrastructure',
            capabilities: ['security', 'smart-contracts', 'auditing', 'vulnerability-scanning'],
            stars: 203,
            version: '3.1.2'
          },
          { 
            name: 'api-rate-limiter', 
            description: 'Advanced API rate limiting and DDoS protection',
            category: 'infrastructure',
            capabilities: ['security', 'rate-limiting', 'api-protection', 'ddos-prevention'],
            stars: 45,
            version: '1.6.0'
          }
        ]
      },
      {
        agent: createAgent('content-creator', 'hash6', 'nostr6', 'colony6'),
        skills: [
          { 
            name: 'ai-copywriter', 
            description: 'AI-powered copywriting for marketing and content creation',
            category: 'ai',
            capabilities: ['content-generation', 'copywriting', 'marketing', 'ai-writing'],
            stars: 91,
            version: '2.4.0'
          },
          { 
            name: 'video-transcription-ai', 
            description: 'Real-time video transcription with speaker identification',
            category: 'utilities',
            capabilities: ['transcription', 'video-processing', 'ai', 'speaker-identification'],
            stars: 38,
            version: '1.2.8'
          }
        ]
      }
    ];

    console.log('Creating agents and skills with realistic star ratings...\n');

    // Create skills for each agent
    for (const { agent, skills } of agents) {
      for (const skillData of skills) {
        const skill = createSkill({
          author_id: agent.id,
          name: skillData.name,
          version: skillData.version,
          description: skillData.description,
          category: skillData.category,
          capabilities: skillData.capabilities,
          dependencies: [],
          interface_type: 'REST',
          api_base: `https://api.clawhub.dev/${skillData.name}`,
          homepage: `https://github.com/${agent.username}/${skillData.name}`,
          license: 'MIT',
          repo_url: `https://github.com/${agent.username}/${skillData.name}`
        });
        
        // Add stars to make it realistic
        for (let i = 0; i < skillData.stars; i++) {
          starSkill(skill.id, `fake-user-${i}`, Math.floor(Math.random() * 100)); // Random zap amounts
        }
        
        console.log(`  ✅ ${skill.full_name}: ${skillData.stars} ⭐ (${skillData.capabilities.join(', ')})`);
      }
    }

    console.log(`\n🎯 Enhanced demo setup complete!`);
    console.log(`📊 Created ${agents.length} agents with ${agents.reduce((sum, a) => sum + a.skills.length, 0)} skills`);
    console.log(`⭐ Total stars: ${agents.reduce((sum, a) => sum + a.skills.reduce((s, sk) => s + sk.stars, 0), 0)}`);
    
    console.log('\n🌐 Available interfaces:');
    console.log('1. 🏠 ClawHub Homepage: http://localhost:3000');
    console.log('2. 🔍 LiveChat Monitor: livechat-monitor.html');  
    console.log('3. ⭐ Skill Rankings: skill-rankings.html');
    console.log('4. 💬 LiveChat Interface: livechat-example.html');
    
    console.log('\n🔑 Demo API Keys:');
    agents.forEach((a, i) => {
      console.log(`   clh_hash${i+1} - ${a.agent.username} (${a.skills.length} skills)`);
    });
    
    console.log('\n🚀 Starting ClawHub server...\n');
    
    // Start the server
    const { exec } = await import('child_process');
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
      console.log('\n👋 Shutting down ClawHub Enhanced Demo...');
      serverProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Enhanced demo setup failed:', error);
    process.exit(1);
  }
}

setupEnhancedDemo();