#!/usr/bin/env node

// Test the directory structure tool
import { handleGetDirectoryStructure } from '../build/tools/repository/get-directory-structure.js';

async function testDirectoryStructure() {
  console.log('🗂️  Testing Directory Structure Tool\n');
  
  // Set environment variable
  process.env.GLUESTACK_PATH = '/Users/ektasaini/Desktop/gluestack-mcp/gluestack-ui';
  
  try {
    console.log('📁 Testing root directory structure (depth: 2)...');
    const result1 = await handleGetDirectoryStructure({ depth: 2, includeFiles: false });
    console.log(result1.content[0].text.slice(0, 500) + '...\n');
    
    console.log('📁 Testing packages/unstyled directory...');
    const result2 = await handleGetDirectoryStructure({ 
      path: 'packages/unstyled', 
      depth: 2 
    });
    console.log(result2.content[0].text.slice(0, 800) + '...\n');
    
    console.log('✅ Directory structure tool test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectoryStructure();