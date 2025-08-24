import { readdir, stat, readFile } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { logDebug, logError, logInfo } from './logger.js';
import { github } from './github-service.js';

export interface GluestackComponent {
  name: string;
  path: string;
  variant: 'nativewind' | 'themed' | 'unstyled';
  hasDemo: boolean;
  hasStories: boolean;
  hasDocs: boolean;
  metadata?: {
    description?: string;
    props?: string[];
    dependencies?: string[];
  };
}

export class ComponentDiscovery {
  private components: Map<string, GluestackComponent[]> = new Map();
  private isInitialized = false;
  private useGitHubMode: boolean;

  constructor(private gluestackPath: string) {
    this.useGitHubMode = process.env.USE_GITHUB_MODE === 'true';
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logInfo(`Initializing component discovery in ${this.useGitHubMode ? 'GitHub' : 'local'} mode...`);
    
    try {
      if (this.useGitHubMode) {
        await this.discoverComponentsFromGitHub();
      } else {
        await this.discoverComponents();
      }
      this.isInitialized = true;
      logInfo(`Discovered ${this.getTotalComponentCount()} components across all variants`);
    } catch (error) {
      logError("Failed to initialize component discovery", error);
      throw error;
    }
  }

  async discoverComponents(): Promise<void> {
    // Discover NativeWind components from examples
    await this.discoverNativeWindComponents();
    
    // Discover NativeWind core components (the actual implementations)
    await this.discoverNativeWindCoreComponents();
    
    // Discover core components from packages
    await this.discoverPackageComponents();
    
    // Discover theme-based components (sub-components and variants)
    await this.discoverThemeComponents();
  }

  private async discoverNativeWindComponents(): Promise<void> {
    const nativewindPath = join(this.gluestackPath, 'example/storybook-nativewind/src/components');
    
    try {
      await stat(nativewindPath);
    } catch {
      logDebug("NativeWind components path not found, skipping");
      return;
    }

    logDebug("Discovering NativeWind example components...");
    const componentDirs = await this.getDirectories(nativewindPath);

    for (const componentName of componentDirs) {
      if (componentName.startsWith('.') || componentName === 'docs-components' || componentName === 'hooks') continue;

      const componentPath = join(nativewindPath, componentName);
      const component = await this.analyzeNativeWindComponent(componentName, componentPath);
      
      if (component) {
        this.addComponent(componentName, component);
      }
    }
  }

  private async discoverNativeWindCoreComponents(): Promise<void> {
    const coreComponentsPath = join(this.gluestackPath, 'example/storybook-nativewind/src/core-components/nativewind');
    
    try {
      await stat(coreComponentsPath);
    } catch {
      logDebug("NativeWind core components path not found, skipping");
      return;
    }

    logDebug("Discovering NativeWind core components...");
    const componentDirs = await this.getDirectories(coreComponentsPath);

    for (const componentName of componentDirs) {
      if (componentName.startsWith('.') || componentName === 'gluestack-ui-provider') continue;

      const componentPath = join(coreComponentsPath, componentName);
      
      // Convert kebab-case to PascalCase for consistency
      const normalizedName = this.kebabToPascalCase(componentName);
      
      const component = await this.analyzeCoreComponent(normalizedName, componentPath, 'nativewind');
      
      if (component) {
        this.addComponent(normalizedName, component);
      }
    }
  }

  private async discoverPackageComponents(): Promise<void> {
    const packagesPath = join(this.gluestackPath, 'packages');
    
    try {
      await stat(packagesPath);
    } catch {
      logDebug("Packages path not found, skipping");
      return;
    }

    // Discover themed components
    await this.discoverThemedComponents(packagesPath);
    
    // Discover unstyled components  
    await this.discoverUnstyledComponents(packagesPath);
  }

  private async discoverThemedComponents(packagesPath: string): Promise<void> {
    const themedPath = join(packagesPath, 'themed/src');
    
    try {
      await stat(themedPath);
      logDebug("Discovering themed components...");
      
      const indexFile = join(themedPath, 'index.ts');
      try {
        const indexContent = await readFile(indexFile, 'utf-8');
        const exportMatches = indexContent.match(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g);
        
        if (exportMatches) {
          for (const exportMatch of exportMatches) {
            const pathMatch = exportMatch.match(/['"]([^'"]+)['"]/);
            if (pathMatch) {
              const componentPath = pathMatch[1];
              if (componentPath) {
                const componentName = componentPath.split('/').pop() || 'Unknown';
                
                const component: GluestackComponent = {
                  name: componentName,
                  path: join(themedPath, componentPath),
                  variant: 'themed',
                  hasDemo: false,
                  hasStories: false,
                  hasDocs: await this.hasReadme(join(themedPath, componentPath))
                };
                
                this.addComponent(componentName, component);
              }
            }
          }
        }
      } catch (error) {
        logError("Failed to parse themed index.ts", error);
      }
    } catch {
      logDebug("Themed components path not found, skipping");
    }
  }

  private async discoverUnstyledComponents(packagesPath: string): Promise<void> {
    const unstyledPath = join(packagesPath, 'unstyled');
    
    try {
      await stat(unstyledPath);
      logDebug("Discovering unstyled components...");
      
      const componentDirs = await this.getDirectories(unstyledPath);
      
      for (const componentName of componentDirs) {
        if (componentName.startsWith('.') || componentName === 'node_modules') continue;
        
        const componentPath = join(unstyledPath, componentName);
        const component = await this.analyzeUnstyledComponent(componentName, componentPath);
        
        if (component) {
          this.addComponent(componentName, component);
        }
      }
    } catch {
      logDebug("Unstyled components path not found, skipping");
    }
  }

  private async analyzeNativeWindComponent(name: string, path: string): Promise<GluestackComponent | null> {
    try {
      const files = await readdir(path);
      
      return {
        name,
        path,
        variant: 'nativewind',
        hasDemo: files.some(f => f.endsWith('.tsx') && !f.endsWith('.stories.tsx')),
        hasStories: files.some(f => f.endsWith('.stories.tsx')),
        hasDocs: files.some(f => f.endsWith('.mdx'))
      };
    } catch (error) {
      logError(`Failed to analyze NativeWind component ${name}`, error);
      return null;
    }
  }

  private async analyzeUnstyledComponent(name: string, path: string): Promise<GluestackComponent | null> {
    try {
      const packageJsonPath = join(path, 'package.json');
      
      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
        
        return {
          name,
          path,
          variant: 'unstyled',
          hasDemo: false,
          hasStories: false,
          hasDocs: await this.hasReadme(path),
          metadata: {
            description: packageJson.description,
            dependencies: Object.keys(packageJson.dependencies || {})
          }
        };
      } catch {
        return null;
      }
    } catch (error) {
      logError(`Failed to analyze unstyled component ${name}`, error);
      return null;
    }
  }

  private async hasReadme(path: string): Promise<boolean> {
    try {
      await stat(join(path, 'README.md'));
      return true;
    } catch {
      return false;
    }
  }

  private async getDirectories(path: string): Promise<string[]> {
    try {
      const items = await readdir(path);
      const directories: string[] = [];
      
      for (const item of items) {
        const itemPath = join(path, item);
        const stats = await stat(itemPath);
        if (stats.isDirectory()) {
          directories.push(item);
        }
      }
      
      return directories;
    } catch (error) {
      logError(`Failed to read directories from ${path}`, error);
      return [];
    }
  }

  private addComponent(name: string, component: GluestackComponent): void {
    if (!this.components.has(name)) {
      this.components.set(name, []);
    }
    
    // Check for duplicates based on variant and path similarity
    const existingVariants = this.components.get(name)!;
    const isDuplicate = existingVariants.some(existing => 
      existing.variant === component.variant && 
      (existing.path === component.path || 
       this.pathsAreSimilar(existing.path, component.path) ||
       this.componentsAreSame(existing, component))
    );
    
    if (!isDuplicate) {
      this.components.get(name)!.push(component);
    } else {
      // If duplicate but new one has more features, replace it
      const existingIndex = existingVariants.findIndex(existing => 
        existing.variant === component.variant && 
        (existing.path === component.path || this.pathsAreSimilar(existing.path, component.path))
      );
      
      if (existingIndex !== -1) {
        const existing = existingVariants[existingIndex];
        if (existing && this.componentHasMoreFeatures(component, existing)) {
          existingVariants[existingIndex] = component;
        }
      }
    }
  }

  getComponents(): string[] {
    return Array.from(this.components.keys()).sort();
  }

  getComponent(name: string, variant?: string): GluestackComponent | null {
    const variants = this.components.get(name);
    if (!variants || variants.length === 0) return null;

    if (variant) {
      return variants.find(c => c.variant === variant) || null;
    }

    // Return NativeWind variant by default, then themed, then unstyled
    return variants.find(c => c.variant === 'nativewind') ||
           variants.find(c => c.variant === 'themed') ||
           variants[0] ||
           null;
  }

  getComponentVariants(name: string): GluestackComponent[] {
    return this.components.get(name) || [];
  }

  getAllComponents(): GluestackComponent[] {
    return Array.from(this.components.values()).flat();
  }

  private async discoverThemeComponents(): Promise<void> {
    const themePath = join(this.gluestackPath, 'packages/config/src/theme');
    
    try {
      await stat(themePath);
    } catch {
      logDebug("Theme components path not found, skipping");
      return;
    }

    logDebug("Discovering theme-based components...");
    
    try {
      const themeFiles = await readdir(themePath);
      const componentThemes = new Set<string>();
      
      for (const file of themeFiles) {
        if (file.endsWith('.ts') && file !== 'index.ts') {
          const componentName = file.replace('.ts', '');
          
          // Extract base component name (e.g., "Button" from "ButtonText", "ButtonIcon", etc.)
          const baseComponent = this.extractBaseComponentName(componentName);
          componentThemes.add(baseComponent);
        }
      }
      
      // Create themed components for all theme-based components
      for (const componentName of componentThemes) {
        if (!this.components.has(componentName)) {
          const component: GluestackComponent = {
            name: componentName,
            path: join(themePath, `${componentName}.ts`),
            variant: 'themed',
            hasDemo: false,
            hasStories: false,
            hasDocs: false,
            metadata: {
              description: `Themed variant of ${componentName} component with Gluestack design tokens`
            }
          };
          
          this.addComponent(componentName, component);
        }
      }
      
    } catch (error) {
      logError("Failed to discover theme components", error);
    }
  }

  private kebabToPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private extractBaseComponentName(componentName: string): string {
    // Common patterns in Gluestack UI theme names
    const suffixes = [
      'Content', 'Header', 'Footer', 'Body', 'Title', 'Text', 'Icon', 'Backdrop',
      'Trigger', 'Item', 'Label', 'Group', 'Track', 'Thumb', 'FilledTrack',
      'Indicator', 'Badge', 'Image', 'FallbackText', 'CloseButton', 'Arrow',
      'DragIndicator', 'Separator', 'ScrollView', 'FlatList', 'SectionList',
      'VirtualizedList', 'ActionSheet', 'HSpacer', 'VSpacer', 'Spinner',
      'Field', 'Slot', 'Input', 'Error', 'ErrorIcon', 'ErrorText', 'Helper',
      'HelperText', 'LabelText', 'AccessoryView'
    ];
    
    for (const suffix of suffixes) {
      if (componentName.endsWith(suffix) && componentName !== suffix) {
        return componentName.slice(0, -suffix.length);
      }
    }
    
    return componentName;
  }

  private async analyzeCoreComponent(name: string, path: string, variant: string): Promise<GluestackComponent | null> {
    try {
      const hasIndex = await this.hasFile(path, 'index.tsx');
      const hasWebIndex = await this.hasFile(path, 'index.web.tsx');
      const hasStyles = await this.hasFile(path, 'styles.tsx');
      
      if (hasIndex) {
        return {
          name,
          path,
          variant: variant as 'nativewind' | 'themed' | 'unstyled',
          hasDemo: false,
          hasStories: false,
          hasDocs: hasStyles, // Components with styles usually have more documentation
          metadata: {
            description: `${variant} implementation of ${name} component`,
            dependencies: await this.extractDependenciesFromCore(path)
          }
        };
      }
      
      return null;
    } catch (error) {
      logError(`Failed to analyze core component ${name}`, error);
      return null;
    }
  }

  private async hasFile(dir: string, filename: string): Promise<boolean> {
    try {
      await stat(join(dir, filename));
      return true;
    } catch {
      return false;
    }
  }

  private async extractDependenciesFromCore(componentPath: string): Promise<string[]> {
    try {
      const indexFile = join(componentPath, 'index.tsx');
      const content = await readFile(indexFile, 'utf-8');
      
      const imports: string[] = [];
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"];?/g;
      
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath && importPath.startsWith('@gluestack-ui')) {
          imports.push(importPath);
        }
      }
      
      return [...new Set(imports)];
    } catch {
      return [];
    }
  }

  private pathsAreSimilar(path1: string, path2: string): boolean {
    // Consider paths similar if they point to the same component type
    const basename1 = path1.split('/').pop() || '';
    const basename2 = path2.split('/').pop() || '';
    
    // Same directory names or both are index files
    return basename1 === basename2 || 
           (basename1.includes('index.') && basename2.includes('index.'));
  }

  private componentsAreSame(comp1: GluestackComponent, comp2: GluestackComponent): boolean {
    return comp1.name === comp2.name && 
           comp1.variant === comp2.variant;
  }

  private componentHasMoreFeatures(comp1: GluestackComponent, comp2: GluestackComponent): boolean {
    const score1 = (comp1.hasDemo ? 1 : 0) + (comp1.hasStories ? 1 : 0) + (comp1.hasDocs ? 1 : 0);
    const score2 = (comp2.hasDemo ? 1 : 0) + (comp2.hasStories ? 1 : 0) + (comp2.hasDocs ? 1 : 0);
    return score1 > score2;
  }

  private getTotalComponentCount(): number {
    return Array.from(this.components.values()).reduce((total, variants) => total + variants.length, 0);
  }

  private async discoverComponentsFromGitHub(): Promise<void> {
    logInfo("Discovering components from GitHub...");
    
    try {
      const components = await github.getAvailableComponents();
      
      for (const componentName of components) {
        // Create variants for each component found
        const variants = ['nativewind', 'themed', 'unstyled'] as const;
        
        for (const variant of variants) {
          const component: GluestackComponent = {
            name: componentName,
            path: `github:${variant}:${componentName}`, // Virtual path for GitHub components
            variant,
            hasDemo: false, // Will be determined when needed
            hasStories: false,
            hasDocs: false,
            metadata: {
              description: `${variant} variant of ${componentName} component from GitHub`,
              dependencies: []
            }
          };
          
          this.addComponent(componentName, component);
          logDebug(`Added GitHub component: ${componentName} (${variant})`);
        }
      }
    } catch (error) {
      logError("Failed to discover components from GitHub", error);
      throw error;
    }
  }

  async getComponentContent(name: string, variant?: string, type: 'source' | 'demo' = 'source'): Promise<string | null> {
    if (!this.useGitHubMode) {
      return this.getLocalComponentContent(name, variant, type);
    }

    try {
      const targetVariant = variant || 'nativewind';
      
      if (type === 'demo') {
        return await github.getComponentDemo(name);
      } else {
        return await github.getComponentSource(name, targetVariant);
      }
    } catch (error) {
      logError(`Failed to get ${type} content for ${name} from GitHub`, error);
      return null;
    }
  }

  private async getLocalComponentContent(name: string, variant?: string, type: 'source' | 'demo' = 'source'): Promise<string | null> {
    const component = this.getComponent(name, variant);
    if (!component) return null;

    try {
      const possibleFiles = type === 'demo' 
        ? [`${name}.stories.tsx`, 'demo.tsx', `${name}.tsx`]
        : ['index.tsx', `${name}.tsx`];

      for (const file of possibleFiles) {
        try {
          const filePath = join(component.path, file);
          const content = await readFile(filePath, 'utf-8');
          return content;
        } catch {
          continue;
        }
      }
    } catch (error) {
      logError(`Failed to read ${type} content for ${name}`, error);
    }
    
    return null;
  }

  getSourceMode(): 'local' | 'github' {
    return this.useGitHubMode ? 'github' : 'local';
  }

  async getRateLimitInfo(): Promise<any> {
    if (this.useGitHubMode) {
      try {
        return await github.getGitHubRateLimit();
      } catch (error) {
        logError('Failed to get rate limit info', error);
        return null;
      }
    }
    return null;
  }
}