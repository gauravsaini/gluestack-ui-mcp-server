# Gluestack UI MCP Server - Complete Usage Guide

## 🚀 Quick Start

### Installation & Setup

```bash
# Install globally
npm install -g gluestack-ui-mcp-server

# Or use directly with npx
npx gluestack-ui-mcp-server --help
```

### Environment Setup

```bash
# Set your Gluestack UI path (required)
export GLUESTACK_PATH="/path/to/your/gluestack-ui"

# Optional: Set log level for debugging
export LOG_LEVEL="debug"

# Run the server
npx gluestack-ui-mcp-server
```

## 🔧 Configuration

### Claude Desktop Configuration

Add to your `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gluestack-ui": {
      "command": "npx",
      "args": ["gluestack-ui-mcp-server", "--gluestack-path", "/path/to/gluestack-ui"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Continue.dev Configuration

Add to your `.continue/config.json`:

```json
{
  "models": [...],
  "context": {
    "mcp": {
      "gluestack-ui": {
        "command": "npx gluestack-ui-mcp-server",
        "args": ["--gluestack-path", "/path/to/gluestack-ui"]
      }
    }
  }
}
```

### Cursor Configuration

```json
{
  "mcp": {
    "servers": {
      "gluestack-ui": {
        "command": "npx",
        "args": ["gluestack-ui-mcp-server"],
        "env": {
          "GLUESTACK_PATH": "/path/to/gluestack-ui"
        }
      }
    }
  }
}
```

## 🛠️ Available Tools

### 1. **`list_components`** - Component Discovery

Lists all 126+ Gluestack UI components with their variants and features.

**Usage:**
```javascript
// No parameters required
{
  "tool": "list_components"
}
```

**Example Response:**
```markdown
# Gluestack UI Components (126 total)

Available components: Accordion, ActionSheet, Alert, AlertDialog, Avatar, Badge...

## Component Variants:
**NATIVEWIND** (60): Accordion, ActionSheet, Alert...
**UNSTYLED** (40): accordion, actionsheet, alert...  
**THEMED** (26): Button, Input, Modal...

## Component Details:
### Button
- **nativewind**: demo, stories, docs
- **unstyled**: basic
- **themed**: basic
```

**Use Cases:**
- 🔍 Discover available components
- 📊 See component coverage across variants
- 🎯 Find components by category/features

---

### 2. **`get_component`** - Source Code Retrieval

Retrieves the complete source code for any component.

**Parameters:**
```typescript
{
  componentName: string,  // Required: "Button", "Input", "Modal"
  variant?: string       // Optional: "nativewind" | "themed" | "unstyled"
}
```

**Usage Examples:**
```javascript
// Get default variant (usually NativeWind)
{
  "tool": "get_component",
  "arguments": {
    "componentName": "Button"
  }
}

// Get specific variant
{
  "tool": "get_component", 
  "arguments": {
    "componentName": "Button",
    "variant": "unstyled"
  }
}
```

**Example Response:**
```tsx
# Button (nativewind)

```tsx
'use client';
import React from 'react';
import { createButton } from '@gluestack-ui/button';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
// ... complete implementation
```

**Use Cases:**
- 📄 Get complete component implementation
- 🔍 Study component architecture and patterns
- 📋 Copy component code for customization
- 🧠 Understand TypeScript interfaces and props

---

### 3. **`get_component_demo`** - Usage Examples

Gets working examples and demos from Storybook.

**Parameters:**
```typescript
{
  componentName: string,  // Required: Component name
  variant?: string       // Optional: Component variant
}
```

**Usage:**
```javascript
{
  "tool": "get_component_demo",
  "arguments": {
    "componentName": "Button",
    "variant": "nativewind"
  }
}
```

**Example Response:**
```tsx
# Button Demo (nativewind)

```tsx
export const ButtonBasic = (props: any) => {
  return (
    <Button {...props}>
      <ButtonText>Hello World</ButtonText>
      <ButtonIcon as={AddIcon} />
    </Button>
  );
};

export const ButtonVariants = () => (
  <>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
  </>
);
```

**Use Cases:**
- 📚 Learn proper component usage patterns
- 🎯 Get working code examples
- 🚀 Rapid prototyping with proven examples
- 📖 Understand component APIs through examples

---

### 4. **`get_component_metadata`** - Detailed Information

Extracts comprehensive metadata including props, dependencies, and examples.

**Parameters:**
```typescript
{
  componentName: string,  // Required: Component name
  variant?: string       // Optional: Variant to analyze
}
```

**Usage:**
```javascript
{
  "tool": "get_component_metadata",
  "arguments": {
    "componentName": "Button"
  }
}
```

**Example Response:**
```markdown
# Button (nativewind) - Metadata

**Description:** A button component that users can tap to trigger an action.
**Features:** demo, stories, documentation

## Props
- **variant** (optional): `"primary" | "secondary" | "danger"`
- **size** (optional): `"sm" | "md" | "lg"`
- **disabled** (optional): `boolean`
- **onPress** (optional): `() => void`

## Dependencies
- `@gluestack-ui/button`
- `@gluestack-ui/nativewind-utils`
- `react-native`

## Available Examples
- ButtonBasic
- ButtonWithIcon
- ButtonVariants
```

**Use Cases:**
- 🔍 Understand component APIs and props
- 📊 Check component dependencies
- 🎯 Find available example variations
- 📚 Get comprehensive component documentation

---

### 5. **`list_component_variants`** - Variant Comparison

Shows all available variants for a specific component with detailed comparison.

**Parameters:**
```typescript
{
  componentName: string  // Required: Component to analyze
}
```

**Usage:**
```javascript
{
  "tool": "list_component_variants",
  "arguments": {
    "componentName": "Button"
  }
}
```

**Example Response:**
```markdown
# Button - Available Variants

## NATIVEWIND
**Path:** `/example/storybook-nativewind/src/components/Button`
**Features:** ✓ Demo, ✓ Stories, ✓ Documentation
**Description:** NativeWind implementation of Button component

## UNSTYLED
**Path:** `/packages/unstyled/button`
**Features:** ✓ Documentation
**Description:** Headless Button component for custom styling

## Recommended Usage

**For most projects:** Use `nativewind` variant - includes Tailwind CSS styling and examples
**For custom styling:** Use `unstyled` variant - headless components with full styling control
```

**Use Cases:**
- 🔄 Compare implementation approaches
- 🎯 Choose the right variant for your needs
- 📊 Understand variant differences and capabilities
- 🚀 Make informed architectural decisions

---

### 6. **`get_directory_structure`** - Repository Navigation

Browse the Gluestack UI repository structure with filtering options.

**Parameters:**
```typescript
{
  path?: string,        // Path within repository (default: root)
  depth?: number,       // Max depth to traverse (default: 3)
  includeFiles?: boolean // Include files in output (default: true)
}
```

**Usage Examples:**
```javascript
// Get full repository structure
{
  "tool": "get_directory_structure"
}

// Browse specific directory
{
  "tool": "get_directory_structure",
  "arguments": {
    "path": "packages/unstyled",
    "depth": 2
  }
}

// Get directory overview only
{
  "tool": "get_directory_structure",
  "arguments": {
    "path": "example/storybook-nativewind/src",
    "includeFiles": false
  }
}
```

**Example Response:**
```markdown
# Gluestack UI Directory Structure
**Base Path:** `/path/to/gluestack-ui`
**Target Path:** `packages/unstyled`

└── 📁 **unstyled** *(40 items)*
    ├── 📁 **button** *(8 items)*
    │   ├── 📄 **package.json** *(json)* - 1.2KB
    │   ├── 📄 **README.md** *(md)* - 3.4KB
    │   └── 📁 **src** *(3 items)*
    ├── 📁 **input** *(6 items)*
    └── 📁 **modal** *(9 items)*

## Summary
- **Directories**: 45
- **Files**: 156  
- **Total Size**: 892.3KB
- **File Types**: ts, tsx, json, md

## Common Paths
- `packages/unstyled` - Headless/unstyled component packages
- `packages/config/src/theme` - Theme configuration and design tokens
```

**Use Cases:**
- 🗂️ Navigate the Gluestack UI repository structure
- 🔍 Find specific component implementations
- 📁 Understand project organization
- 🎯 Locate configuration and theme files

## 🎯 Common Workflows

### Workflow 1: Discover and Implement a Component

```bash
# 1. Find available components
list_components

# 2. Get component details
get_component_metadata(componentName: "Button")

# 3. See usage examples  
get_component_demo(componentName: "Button")

# 4. Get source code
get_component(componentName: "Button", variant: "nativewind")
```

### Workflow 2: Compare Component Variants

```bash
# 1. See all variants for a component
list_component_variants(componentName: "Button")

# 2. Get source for each variant
get_component(componentName: "Button", variant: "nativewind")
get_component(componentName: "Button", variant: "unstyled")

# 3. Compare implementations and choose best fit
```

### Workflow 3: Explore Repository Structure

```bash
# 1. Get high-level repository overview
get_directory_structure(depth: 2, includeFiles: false)

# 2. Dive into specific areas
get_directory_structure(path: "packages/unstyled")
get_directory_structure(path: "example/storybook-nativewind/src/components")
```

### Workflow 4: Build a Complete Component

```bash
# 1. Find similar components for reference
list_components  

# 2. Study implementation patterns
get_component(componentName: "Button")
get_component(componentName: "Input")

# 3. Get metadata for API design
get_component_metadata(componentName: "Button")

# 4. Use demo code as starting point
get_component_demo(componentName: "Button")
```

## 🚨 Troubleshooting

### Common Issues

**1. "Gluestack UI path not found"**
```bash
# Solution: Set the correct path
export GLUESTACK_PATH="/correct/path/to/gluestack-ui"

# Or use command line argument
npx gluestack-ui-mcp-server --gluestack-path /correct/path
```

**2. "Component not found"**
```bash
# Solution: Check available components first
list_components

# Component names are case-sensitive: "Button" not "button"
```

**3. "No variants available"** 
```bash
# Solution: Check what variants exist
list_component_variants(componentName: "YourComponent")
```

**4. "Server startup failed"**
```bash
# Solution: Check logs with debug level
LOG_LEVEL=debug npx gluestack-ui-mcp-server
```

### Debug Mode

```bash
# Enable detailed logging
export LOG_LEVEL="debug"
npx gluestack-ui-mcp-server --gluestack-path /path/to/gluestack-ui
```

### Validate Setup

```bash
# Test server functionality
node -e "
const { ComponentDiscovery } = require('gluestack-ui-mcp-server/build/utils/component-discovery.js');
const discovery = new ComponentDiscovery(process.env.GLUESTACK_PATH || '../gluestack-ui');
discovery.initialize().then(() => {
  console.log('✅ Setup validated successfully!');
  console.log(\`Found \${discovery.getComponents().length} components\`);
}).catch(console.error);
"
```

## 🎉 Success Tips

1. **🎯 Always start with `list_components`** to see what's available
2. **🔄 Use `list_component_variants`** to understand your options  
3. **📚 Check `get_component_demo`** for usage patterns before implementing
4. **🧠 Use `get_component_metadata`** to understand APIs and dependencies
5. **🗂️ Use `get_directory_structure`** to navigate and understand the codebase
6. **🚀 Combine tools** for complete understanding (metadata → demo → source)

## 📈 Performance Notes

- **Component Discovery**: ~2-3 seconds for full repository scan
- **Source Code Retrieval**: Instant for cached components  
- **Directory Structure**: <1 second for reasonable depth/scope
- **Memory Usage**: ~50MB for full component registry

## 🔗 Integration Examples

### With Custom Scripts

```javascript
// Custom script to get all Button-related components
const components = await listComponents();
const buttonComponents = components.filter(name => 
  name.toLowerCase().includes('button')
);

for (const comp of buttonComponents) {
  const source = await getComponent(comp);
  console.log(`${comp}:`, source);
}
```

### With Build Tools

```javascript
// Generate component documentation
const allComponents = await listComponents();
const docs = {};

for (const component of allComponents) {
  docs[component] = {
    metadata: await getComponentMetadata(component),
    demo: await getComponentDemo(component),
    variants: await listComponentVariants(component)
  };
}

fs.writeFileSync('component-docs.json', JSON.stringify(docs, null, 2));
```

This completes the comprehensive usage guide for the Gluestack UI MCP Server! 🚀