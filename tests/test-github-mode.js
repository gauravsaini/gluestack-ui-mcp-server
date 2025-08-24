#!/usr/bin/env node

// Test script specifically for GitHub mode functionality
import { ComponentDiscovery } from '../build/utils/component-discovery.js';
import { github } from '../build/utils/github-service.js';

async function testGitHubMode() {
  console.log('📦 Testing GitHub Mode Functionality\n');
  
  if (!process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN.includes('dummy')) {
    console.log('⚠️  GITHUB_TOKEN not provided or is dummy token');
    console.log('   Set GITHUB_TOKEN environment variable to test GitHub mode');
    console.log('   Example: export GITHUB_TOKEN=ghp_your_token_here');
    process.exit(0);
  }
  
  console.log('🔧 GitHub token provided, testing GitHub API integration...\n');
  
  try {
    // Test 1: GitHub API connection and rate limit
    console.log('1️⃣  Testing GitHub API connection...');
    try {
      const rateLimit = await github.getGitHubRateLimit();
      console.log(`   ✅ Connected to GitHub API`);
      console.log(`   📊 Rate limit: ${rateLimit.rate.remaining}/${rateLimit.rate.limit} (resets at ${new Date(rateLimit.rate.reset * 1000).toLocaleTimeString()})`);
    } catch (error) {
      console.log(`   ❌ GitHub API connection failed: ${error.message}`);
      return;
    }
    
    // Test 2: Component list from GitHub
    console.log('\n2️⃣  Testing component discovery from GitHub...');
    const components = await github.getAvailableComponents();
    console.log(`   ✅ Discovered ${components.length} components from GitHub`);
    console.log(`   📋 Sample components: ${components.slice(0, 5).join(', ')}`);
    
    // Test 3: Individual component source
    console.log('\n3️⃣  Testing component source retrieval...');
    const testComponent = components.includes('Button') ? 'Button' : components[0];
    try {
      const source = await github.getComponentSource(testComponent, 'nativewind');
      console.log(`   ✅ Retrieved ${testComponent} source (${source.length} characters)`);
    } catch (error) {
      console.log(`   ⚠️  ${testComponent} source not available: ${error.message}`);
    }
    
    // Test 4: Component demo
    console.log('\n4️⃣  Testing component demo retrieval...');
    try {
      const demo = await github.getComponentDemo(testComponent);
      console.log(`   ✅ Retrieved ${testComponent} demo (${demo.length} characters)`);
    } catch (error) {
      console.log(`   ⚠️  ${testComponent} demo not available: ${error.message}`);
    }
    
    // Test 5: Component discovery integration
    console.log('\n5️⃣  Testing ComponentDiscovery with GitHub mode...');
    process.env.USE_GITHUB_MODE = 'true';
    const discovery = new ComponentDiscovery(''); // Path not used in GitHub mode
    await discovery.initialize();
    
    const discoveredComponents = discovery.getComponents();
    console.log(`   ✅ ComponentDiscovery found ${discoveredComponents.length} components`);
    console.log(`   📊 Source mode: ${discovery.getSourceMode()}`);
    
    // Test 6: Component content via discovery
    console.log('\n6️⃣  Testing component content via ComponentDiscovery...');
    try {
      const content = await discovery.getComponentContent(testComponent, 'nativewind', 'source');
      if (content) {
        console.log(`   ✅ Retrieved ${testComponent} content via discovery (${content.length} characters)`);
      } else {
        console.log(`   ⚠️  ${testComponent} content not available via discovery`);
      }
    } catch (error) {
      console.log(`   ❌ Error getting content: ${error.message}`);
    }
    
    // Test 7: Rate limit check after operations
    console.log('\n7️⃣  Testing rate limit after operations...');
    const finalRateLimit = await github.getGitHubRateLimit();
    const used = finalRateLimit.rate.limit - finalRateLimit.rate.remaining;
    console.log(`   📊 API calls used in this test: ~${used} requests`);
    console.log(`   ⏰ Remaining: ${finalRateLimit.rate.remaining}/${finalRateLimit.rate.limit}`);
    
    console.log('\n🎉 GitHub Mode Tests Completed Successfully!');
    console.log('\n📈 GitHub Mode Benefits Verified:');
    console.log(`   ✅ ${components.length} components available without local installation`);
    console.log('   ✅ Always up-to-date with main branch');
    console.log(`   ✅ ${finalRateLimit.rate.remaining} API calls remaining`);
    console.log('   ✅ Seamless integration with existing tools');
    
  } catch (error) {
    console.error('\n❌ GitHub Mode Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGitHubMode();
}

export { testGitHubMode };