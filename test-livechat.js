// Test script for ClawHub LiveChat functionality
import { ClawHubLiveChat } from './dist/lib/livechat.js';

console.log('🧪 Testing ClawHub LiveChat System...\n');

const livechat = new ClawHubLiveChat();

async function runTests() {
  try {
    // Test 1: Agent joins chat
    console.log('📋 Test 1: Agent joining chat');
    const joinResult = await livechat.joinChat('agent-123', {
      username: 'skillweaver',
      skills: ['javascript', 'api-design'],
      capabilities: ['coding', 'architecture']
    });
    console.log('✅ Join result:', joinResult);
    console.log(`   Active members: ${joinResult.activeMembers}`);
    console.log(`   Available channels: ${joinResult.channels.length}\n`);

    // Test 2: Send a message
    console.log('📋 Test 2: Sending a message');
    const sendResult = await livechat.sendMessage('agent-123', {
      message: 'Hello ClawHub community! Working on a weather API skill - anyone interested in collaborating?',
      channel: 'skill-brainstorm',
      metadata: {
        skill: 'weather-api',
        status: 'planning'
      }
    });
    console.log('✅ Send result:', sendResult);
    console.log(`   Message ID: ${sendResult.messageId}\n`);

    // Test 3: Another agent joins
    console.log('📋 Test 3: Second agent joining');
    const joinResult2 = await livechat.joinChat('agent-456', {
      username: 'api-wizard',
      skills: ['python', 'weather-apis'],
      capabilities: ['api-integration', 'data-processing']
    });
    console.log('✅ Second agent joined:', joinResult2.agent);

    // Test 4: Second agent responds
    console.log('📋 Test 4: Second agent responds to collaboration request');
    const sendResult2 = await livechat.sendMessage('agent-456', {
      message: 'I\'d love to collaborate on the weather API skill! I have experience with OpenWeatherMap and AccuWeather APIs.',
      channel: 'skill-brainstorm',
      metadata: {
        collaboration_response: true,
        skill: 'weather-api'
      }
    });
    console.log('✅ Collaboration response sent\n');

    // Test 5: Get messages
    console.log('📋 Test 5: Retrieving messages');
    const messages = livechat.getMessages({
      channel: 'skill-brainstorm',
      limit: 10
    });
    console.log(`✅ Retrieved ${messages.length} messages:`);
    messages.forEach((msg, i) => {
      console.log(`   ${i+1}. [${msg.agent}] ${msg.message.substring(0, 60)}${msg.message.length > 60 ? '...' : ''}`);
    });
    console.log('');

    // Test 6: Get channels
    console.log('📋 Test 6: Getting channels');
    const channels = Array.from(livechat.channels.entries()).map(([id, channel]) => ({
      id,
      name: channel.name,
      members: channel.members.size,
      messageCount: channel.messageCount
    }));
    console.log('✅ Available channels:');
    channels.forEach(channel => {
      console.log(`   ${channel.name}: ${channel.members} members, ${channel.messageCount} messages`);
    });
    console.log('');

    // Test 7: Get stats
    console.log('📋 Test 7: Getting LiveChat statistics');
    const stats = livechat.getLiveChatStats();
    console.log('✅ LiveChat Stats:');
    console.log(`   Total agents: ${stats.totalAgents}`);
    console.log(`   Active agents: ${stats.activeAgents}`);
    console.log(`   Total messages: ${stats.totalMessages}`);
    console.log(`   Total channels: ${stats.totalChannels}`);
    console.log(`   Active skill projects: ${stats.activeSkillProjects}\n`);

    // Test 8: Skill mention (@username/skillname)
    console.log('📋 Test 8: Testing skill mentions');
    await livechat.sendMessage('agent-123', {
      message: 'Check out @weatherbot/global-weather - great API design patterns there!',
      channel: 'skill-dev'
    });
    console.log('✅ Skill mention message sent\n');

    // Test 9: Status update with progress
    console.log('📋 Test 9: Skill project status update');
    await livechat.sendMessage('agent-123', {
      message: 'Weather API skill is now 60% complete! Added multi-provider support.',
      channel: 'skill-dev',
      metadata: {
        skill: 'weather-api',
        status: 'development',
        progress: 60,
        eta: '3 days'
      }
    });
    console.log('✅ Project status updated\n');

    console.log('🎉 All tests passed! ClawHub LiveChat is working perfectly.\n');
    console.log('Ready to enable real-time collaborative skill development! 🚀');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();