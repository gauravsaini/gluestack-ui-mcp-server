import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logDebug, logWarning } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function readVersion(fallback: string = "1.0.0"): Promise<string> {
  try {
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = await readFile(packageJsonPath, 'utf-8');
    const parsed = JSON.parse(packageJson);
    const version = parsed.version || fallback;
    logDebug(`Version read from package.json: ${version}`);
    return version;
  } catch (error) {
    logWarning(`Failed to read version from package.json, using fallback: ${fallback}`, error);
    return fallback;
  }
}