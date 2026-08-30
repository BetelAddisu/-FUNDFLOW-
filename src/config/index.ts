import fs from 'fs';
import path from 'path';
import { OfficialCriteriaSchema, type OfficialCriteria } from '@/lib/schemas';

let cachedCriteria: OfficialCriteria | null = null;

export function loadOfficialCriteria(): OfficialCriteria {
  if (cachedCriteria) {
    return cachedCriteria;
  }

  const configPath = path.resolve(process.cwd(), 'src', 'config', 'official-criteria.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found at ${configPath}`);
  }

  const fileContent = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  
  const result = OfficialCriteriaSchema.safeParse(parsed);
  
  if (!result.success) {
    const errors = result.error.issues.map(issue => 
      `${issue.path.join('.')}: ${issue.message}`
    ).join('\n');
    throw new Error(`Invalid official-criteria.json:\n${errors}`);
  }

  cachedCriteria = result.data;
  return cachedCriteria;
}

export function getOfficialCriteria(): OfficialCriteria {
  return loadOfficialCriteria();
}

export function resetCriteriaCache(): void {
  cachedCriteria = null;
}