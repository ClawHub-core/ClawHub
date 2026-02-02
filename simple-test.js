const http = require('http');

function testRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  try {
    console.log('Testing health...');
    const health = await testRequest('/health');
    console.log('Health:', health);
    
    console.log('Testing agent registration...');
    const agent = await testRequest('/api/v1/agents/register', 'POST', { username: 'testbot' });
    console.log('Agent:', agent);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();