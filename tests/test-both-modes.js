#!/usr/bin/env node

// Comprehensive test that verifies both local and GitHub modes
import { ComponentDiscovery } from '../build/utils/component-discovery.js';
import { handleGetComponent } from '../build/tools/components/get-component.js';

async function testBothModes() {
  console.log('🔄 Testing Both Local and GitHub Modes\n');
  
  const hasGithubToken = process.env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN.includes('dummy');
  const hasLocalPath = process.env.GLUESTACK_PATH && process.env.GLUESTACK_PATH !== '../gluestack-ui';
  
  if (!hasGithubToken && !hasLocalPath) {
    console.log('⚠️  Neither GITHUB_TOKEN nor valid GLUESTACK_PATH provided');
    console.log('   This test requires at least one mode to be configured');
    console.log('   Set GITHUB_TOKEN=your_token or GLUESTACK_PATH=/path/to/gluestack-ui');
    process.exit(0);
  }
  
  const results = {
    local: null,
    github: null
  };
  
  // Test Local Mode
  if (hasLocalPath) {
    console.log('🏠 Testing Local Mode...');
    try {
      process.env.USE_GITHUB_MODE = 'false';
      delete process.env.GITHUB_TOKEN; // Temporarily remove
      
      const localDiscovery = new ComponentDiscovery(process.env.GLUESTACK_PATH);
      await localDiscovery.initialize();
      
      const localComponents = localDiscovery.getComponents();
      const localMode = localDiscovery.getSourceMode();
      
      console.log(`   📊 Found ${localComponents.length} components`);
      console.log(`   🔧 Source mode: ${localMode}`);
      
      // Test getting a component
      try {
        const testComponent = localComponents.includes('Button') ? 'Button' : localComponents[0];
        const componentResult = await handleGetComponent({ componentName: testComponent });
        const hasLocalIndicator = componentResult.content[0].text.includes('💻 Local');
        
        console.log(`   ✅ Retrieved ${testComponent} (${componentResult.content[0].text.length} chars)`);
        console.log(`   🏷️  Local indicator: ${hasLocalIndicator ? '✅' : '❌'}`);
        
        results.local = {
          componentCount: localComponents.length,
          mode: localMode,
          testComponent,
          success: true,
          hasIndicator: hasLocalIndicator
        };
      } catch (error) {
        console.log(`   ❌ Component retrieval failed: ${error.message}`);
        results.local = { success: false, error: error.message };
      }
    } catch (error) {
      console.log(`   ❌ Local mode failed: ${error.message}`);
      results.local = { success: false, error: error.message };
    }
  } else {
    console.log('🏠 Local Mode: Skipped (no valid GLUESTACK_PATH)');
  }
  
  // Test GitHub Mode
  if (hasGithubToken) {
    console.log('\n📦 Testing GitHub Mode...');
    try {
      // Restore GitHub token and set GitHub mode
      process.env.GITHUB_TOKEN = hasGithubToken;
      process.env.USE_GITHUB_MODE = 'true';
      delete process.env.GLUESTACK_PATH; // Don't use local path
      
      const githubDiscovery = new ComponentDiscovery('');
      await githubDiscovery.initialize();
      
      const githubComponents = githubDiscovery.getComponents();
      const githubMode = githubDiscovery.getSourceMode();
      
      console.log(`   📊 Found ${githubComponents.length} components`);
      console.log(`   🔧 Source mode: ${githubMode}`);
      
      // Test getting a component
      try {
        const testComponent = githubComponents.includes('Button') ? 'Button' : githubComponents[0];
        const componentResult = await handleGetComponent({ componentName: testComponent });
        const hasGithubIndicator = componentResult.content[0].text.includes('📦 GitHub');
        
        console.log(`   ✅ Retrieved ${testComponent} (${componentResult.content[0].text.length} chars)`);
        console.log(`   🏷️  GitHub indicator: ${hasGithubIndicator ? '✅' : '❌'}`);
        
        results.github = {
          componentCount: githubComponents.length,
          mode: githubMode,
          testComponent,
          success: true,
          hasIndicator: hasGithubIndicator
        };
      } catch (error) {
        console.log(`   ❌ Component retrieval failed: ${error.message}`);
        results.github = { success: false, error: error.message };
      }
    } catch (error) {
      console.log(`   ❌ GitHub mode failed: ${error.message}`);
      results.github = { success: false, error: error.message };
    }
  } else {
    console.log('\n📦 GitHub Mode: Skipped (no GITHUB_TOKEN)');
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('==========================================');
  
  if (results.local) {
    if (results.local.success) {
      console.log(`🏠 Local Mode: ✅ SUCCESS`);
      console.log(`   Components: ${results.local.componentCount}`);
      console.log(`   Mode: ${results.local.mode}`);
      console.log(`   Indicators: ${results.local.hasIndicator ? '✅' : '❌'}`);
    } else {
      console.log(`🏠 Local Mode: ❌ FAILED - ${results.local.error}`);
    }
  }
  
  if (results.github) {
    if (results.github.success) {
      console.log(`📦 GitHub Mode: ✅ SUCCESS`);
      console.log(`   Components: ${results.github.componentCount}`);
      console.log(`   Mode: ${results.github.mode}`);
      console.log(`   Indicators: ${results.github.hasIndicator ? '✅' : '❌'}`);
    } else {
      console.log(`📦 GitHub Mode: ❌ FAILED - ${results.github.error}`);
    }
  }
  
  // Comparison if both modes worked
  if (results.local?.success && results.github?.success) {
    console.log('\n🔍 Mode Comparison:');
    console.log(`   Component Count Difference: ${Math.abs(results.local.componentCount - results.github.componentCount)}`);
    console.log(`   Both modes functional: ✅`);
    console.log(`   Visual indicators working: ${results.local.hasIndicator && results.github.hasIndicator ? '✅' : '❌'}`);
  }
  
  const allSuccess = (!results.local || results.local.success) && (!results.github || results.github.success);
  
  if (allSuccess) {
    console.log('\n🎉 ALL TESTS PASSED - Dual Mode Support Working!');
  } else {
    console.log('\n❌ Some tests failed - check configuration');
    process.exit(1);
  }
}

testBothModes();