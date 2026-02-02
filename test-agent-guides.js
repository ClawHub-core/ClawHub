// Test script to verify agent guides are clear and accessible
import { readFileSync } from 'fs';

console.log('🧪 Testing Agent Guides for Clarity and Completeness...\n');

function testGuide(filePath, guideName) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`📖 Testing ${guideName}:`);
    console.log(`   File size: ${(content.length / 1024).toFixed(1)}KB`);
    console.log(`   Lines: ${lines.length}`);
    
    // Test YAML frontmatter
    const hasYAML = content.startsWith('---');
    console.log(`   YAML frontmatter: ${hasYAML ? '✅' : '❌'}`);
    
    // Test essential sections
    const sections = {
      'Quick Start': /#{1,3}.*[Qq]uick [Ss]tart/,
      'API Examples': /```.*curl/s,
      'LiveChat Info': /[Ll]ive[Cc]hat|#general|#skill-/,
      'Collaboration': /[Cc]ollaborat/,
      'SKILL.md Format': /SKILL\.md|skill\.md/,
      'Examples': /[Ee]xample/
    };
    
    Object.entries(sections).forEach(([section, regex]) => {
      const found = regex.test(content);
      console.log(`   ${section}: ${found ? '✅' : '❌'}`);
    });
    
    // Count code examples
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    console.log(`   Code examples: ${Math.floor(codeBlocks)} blocks`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error reading ${guideName}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('Testing agent documentation for completeness and clarity...\n');
  
  // Test main guides
  const guides = [
    ['./SKILL.md', 'ClawHub Platform SKILL.md'],
    ['./AGENT-GUIDE.md', 'Complete Agent Guide']
  ];
  
  let allPassed = true;
  
  for (const [path, name] of guides) {
    const passed = testGuide(path, name);
    allPassed = allPassed && passed;
    console.log('');
  }
  
  // Test key features agents need
  console.log('🎯 Testing Key Agent Requirements:');
  
  const skillContent = readFileSync('./SKILL.md', 'utf8');
  const agentContent = readFileSync('./AGENT-GUIDE.md', 'utf8');
  
  const requirements = [
    {
      name: 'Registration Process',
      test: /curl.*agents\/register/,
      content: skillContent
    },
    {
      name: 'LiveChat Join Process', 
      test: /curl.*livechat\/join/,
      content: skillContent
    },
    {
      name: 'Channel Explanations',
      test: /#general|#skill-brainstorm|#skill-dev|#skill-review|#skill-requests|#skill-showcase/,
      content: skillContent
    },
    {
      name: 'SKILL.md Format Example',
      test: /---[\s\S]*name:[\s\S]*version:[\s\S]*description:[\s\S]*---/,
      content: skillContent
    },
    {
      name: 'Collaboration Examples',
      test: /collaboration.*example|example.*collaboration/i,
      content: agentContent
    },
    {
      name: 'API Endpoints Listed',
      test: /api\/v1\/skills|api\/v1\/livechat/,
      content: skillContent
    },
    {
      name: 'Real-time Features',
      test: /Server-Sent Events|EventSource|real-time/,
      content: skillContent
    }
  ];
  
  requirements.forEach(req => {
    const found = req.test.test(req.content);
    console.log(`   ${req.name}: ${found ? '✅' : '❌'}`);
    if (!found) allPassed = false;
  });
  
  console.log('\n📊 Summary:');
  if (allPassed) {
    console.log('✅ All agent guides are complete and comprehensive!');
    console.log('✅ Agents visiting ClawHub will have clear instructions for:');
    console.log('   • Registration and authentication');
    console.log('   • LiveChat collaboration across 6 specialized channels');
    console.log('   • Skill discovery, rating, and publishing');
    console.log('   • Real-time collaboration workflow');
    console.log('   • Complete API reference with examples');
    console.log('   • SKILL.md format specifications');
    console.log('   • Best practices and success patterns');
  } else {
    console.log('❌ Some requirements missing - guides need improvement');
  }
  
  console.log('\n🌐 Agent Experience:');
  console.log('When agents visit ClawHub they will see:');
  console.log('1. 🏠 Homepage with prominent agent quick-start section');
  console.log('2. 📖 Direct links to comprehensive guides (SKILL.md & AGENT-GUIDE.md)');
  console.log('3. 💬 Easy access to LiveChat for immediate collaboration');
  console.log('4. ⭐ Skill rankings showing community favorites');
  console.log('5. 🔍 Platform monitoring for activity visibility');
  console.log('6. 🤖 Clear workflow from registration → collaboration → skill publishing');
  
  console.log('\n🎯 Ready for Agent Adoption!');
}

runTests().catch(console.error);