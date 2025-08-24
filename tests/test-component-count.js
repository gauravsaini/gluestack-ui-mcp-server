#!/usr/bin/env node

// Test script to check component discovery count
import { ComponentDiscovery } from '../build/utils/component-discovery.js';

async function testComponentDiscovery() {
  console.log('🔍 Testing enhanced component discovery...\n');
  
  // Test both modes if possible
  const hasGithubToken = process.env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN.includes('dummy');
  const hasLocalPath = process.env.GLUESTACK_PATH && process.env.GLUESTACK_PATH !== '../gluestack-ui';
  
  let gluestackPath = '/Users/ektasaini/Desktop/gluestack-mcp/gluestack-ui';
  
  if (hasGithubToken) {
    console.log('🔧 Using GitHub Mode (token provided)');
    process.env.USE_GITHUB_MODE = 'true';
  } else if (hasLocalPath) {
    console.log('🔧 Using Local Mode (local path provided)');
    gluestackPath = process.env.GLUESTACK_PATH;
  } else {
    console.log('🔧 Using Local Mode (fallback)');
  }
  
  const discovery = new ComponentDiscovery(gluestackPath);
  
  try {
    console.log('⏳ Initializing component discovery...');
    await discovery.initialize();
    
    const components = discovery.getComponents();
    const allComponents = discovery.getAllComponents();
    
    console.log(`\n📊 Discovery Results:`);
    console.log(`   Unique Components: ${components.length}`);
    console.log(`   Total Variants: ${allComponents.length}`);
    
    // Group by variant
    const byVariant = {};
    allComponents.forEach(comp => {
      if (!byVariant[comp.variant]) byVariant[comp.variant] = 0;
      byVariant[comp.variant]++;
    });
    
    console.log(`\n📋 By Variant:`);
    Object.entries(byVariant).forEach(([variant, count]) => {
      console.log(`   ${variant}: ${count} components`);
    });
    
    console.log(`\n🎯 Sample Components:`);
    components.slice(0, 10).forEach(name => {
      const variants = discovery.getComponentVariants(name);
      const variantNames = variants.map(v => v.variant).join(', ');
      console.log(`   ${name} (${variantNames})`);
    });
    
    if (components.length > 10) {
      console.log(`   ... and ${components.length - 10} more`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testComponentDiscovery();