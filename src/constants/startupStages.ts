import { StartupProgressStage } from '../types/startup.types';

export interface StageConfig {
  key: StartupProgressStage;
  label: string; // e.g. "1. Idea Stage"
  name: string; // e.g. "Idea Stage"
  stepNumber: number;
  desc: string;
}

export const STARTUP_PROGRESS_STAGES: StageConfig[] = [
  {
    key: 'IDEA_STAGE',
    label: '1. Idea Stage',
    name: 'Idea Stage',
    stepNumber: 1,
    desc: 'Initial concept definition and value hypothesis formulation'
  },
  {
    key: 'PROBLEM_DISCOVERY',
    label: '2. Problem Discovery / Validation',
    name: 'Problem Discovery / Validation',
    stepNumber: 2,
    desc: 'Conducting customer interviews and problem-solution validation'
  },
  {
    key: 'MARKET_VALIDATION',
    label: '3. Market Validation',
    name: 'Market Validation',
    stepNumber: 3,
    desc: 'Testing TAM/SAM, competitor benchmark, and go-to-market strategy'
  },
  {
    key: 'POC_MVP',
    label: '4. POC / MVP',
    name: 'POC / MVP',
    stepNumber: 4,
    desc: 'Building and launching Proof of Concept or Minimum Viable Product'
  },
  {
    key: 'POST_REVENUE',
    label: '5. Post Revenue',
    name: 'Post Revenue',
    stepNumber: 5,
    desc: 'Achieved initial paying customers and recurring revenue traction'
  },
  {
    key: 'SCALE_STAGE',
    label: '6. Scale Stage',
    name: 'Scale Stage',
    stepNumber: 6,
    desc: 'Scaling operations, hiring core team, and seeking seed/growth capital'
  }
];

export const getStartupStageInfo = (rawKey: any): StageConfig => {
  const k = String(rawKey || '').toUpperCase().trim();
  const found = STARTUP_PROGRESS_STAGES.find(s => s.key === k);
  if (found) return found;
  
  // fallback mapping
  if (k.includes('PROBLEM')) return STARTUP_PROGRESS_STAGES[1];
  if (k.includes('MARKET')) return STARTUP_PROGRESS_STAGES[2];
  if (k.includes('POC') || k.includes('MVP')) return STARTUP_PROGRESS_STAGES[3];
  if (k.includes('REVENUE')) return STARTUP_PROGRESS_STAGES[4];
  if (k.includes('SCALE')) return STARTUP_PROGRESS_STAGES[5];
  
  return STARTUP_PROGRESS_STAGES[0];
};

export const getStartupStageIndex = (rawKey: any): number => {
  const info = getStartupStageInfo(rawKey);
  return info.stepNumber - 1;
};
