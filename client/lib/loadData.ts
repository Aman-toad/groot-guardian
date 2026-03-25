import fs from 'fs/promises';
import path from 'path';

export interface DeforestationData {
  VH_baseline: number;
  VH_current: number;
  VH_delta: number;
  VV_baseline: number;
  VV_current: number;
  VV_delta: number;
  lat: number;
  lng: number;
  VVVH_ratio: number;
  VV_norm: number;
  VH_norm: number;
  delta_mag: number;
  deforestation: 0 | 1;
  confidence: number;
}

export async function loadDeforestationData(): Promise<DeforestationData[]> {
  // Check both possible directories based on the project structure
  const possiblePaths = [
    path.join(process.cwd(), '..', 'data', 'processed', 'json'),
    path.join(process.cwd(), '..', 'data', 'processed'),
    path.join(process.cwd(), 'data', 'processed', 'json'),
    path.join(process.cwd(), 'data', 'processed')
  ];

  let targetDir = '';
  for (const p of possiblePaths) {
    try {
      const stats = await fs.stat(p);
      if (stats.isDirectory()) {
        targetDir = p;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!targetDir) {
    console.warn('Could not find data directory containing JSON processed data.');
    return [];
  }

  try {
    const files = await fs.readdir(targetDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    let allData: DeforestationData[] = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(targetDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      try {
        const parsed = JSON.parse(content);
        // Ensure it's an array
        const items = Array.isArray(parsed) ? parsed : [parsed];
        allData = allData.concat(items);
      } catch (err) {
        console.error(`Error parsing JSON file ${file}:`, err);
      }
    }
    
    return allData;
  } catch (err) {
    console.error(`Error reading directory ${targetDir}:`, err);
    return [];
  }
}
