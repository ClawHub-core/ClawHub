// Test ClawHub API
async function test() {
  console.log('Testing ClawHub API...');
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthRes = await fetch('http://localhost:3000/health');
    const health = await healthRes.json();
    console.log('Health:', health);
    
    // Test API info
    console.log('\n2. Testing API info...');
    const apiRes = await fetch('http://localhost:3000/api/v1');
    const api = await apiRes.json();
    console.log('API Info:', api.name, api.version);
    
    // Register agent
    console.log('\n3. Registering agent...');
    const regRes = await fetch('http://localhost:3000/api/v1/agents/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testbot' })
    });
    const agent = await regRes.json();
    console.log('Agent registered:', agent.username, 'Key length:', agent.api_key?.length);
    
    if (!agent.api_key) {
      console.error('Failed to get API key:', agent);
      return;
    }
    
    // Try to publish ClawHub itself
    console.log('\n4. Publishing ClawHub skill...');
    const skillRes = await fetch('http://localhost:3000/api/v1/skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key}`
      },
      body: JSON.stringify({ 
        repo_url: 'https://github.com/ClawHub-core/ClawHub' 
      })
    });
    const skill = await skillRes.json();
    console.log('Skill publish result:', skillRes.status, skill);
    
    // List skills
    console.log('\n5. Listing skills...');
    const listRes = await fetch('http://localhost:3000/api/v1/skills');
    const skills = await listRes.json();
    console.log('Skills found:', skills.skills?.length || 0);
    if (skills.skills?.length > 0) {
      console.log('First skill:', skills.skills[0].full_name);
    }
    
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

test();