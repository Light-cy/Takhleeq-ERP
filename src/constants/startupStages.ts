import { StartupProgressStage } from '../types/startup.types';

export interface StageConfig {
  key: StartupProgressStage;
  label: string; // e.g. "1. Idea"
  name: string; // e.g. "Idea"
  stepNumber: number;
  desc: string;
}

export const STARTUP_PROGRESS_STAGES: StageConfig[] = [
  {
    key: 'IDEA_STAGE',
    label: '1. Idea',
    name: 'Idea',
    stepNumber: 1,
    desc: 'Initial concept definition and value hypothesis formulation'
  },
  {
    key: 'PROBLEM_DISCOVERY',
    label: '2. Problem discovery',
    name: 'Problem discovery',
    stepNumber: 2,
    desc: 'Conducting customer interviews and problem-solution validation'
  },
  {
    key: 'MARKET_VALIDATION',
    label: '3. Market validation',
    name: 'Market validation',
    stepNumber: 3,
    desc: 'Testing TAM/SAM, competitor benchmark, and go-to-market strategy'
  },
  {
    key: 'POC_MVP',
    label: '4. Prototype / MVP',
    name: 'Prototype / MVP',
    stepNumber: 4,
    desc: 'Building and launching Proof of Concept or Minimum Viable Product'
  },
  {
    key: 'POST_REVENUE',
    label: '5. Earning revenue',
    name: 'Earning revenue',
    stepNumber: 5,
    desc: 'Achieved initial paying customers and recurring revenue traction'
  },
  {
    key: 'SCALE_STAGE',
    label: '6. Scaling',
    name: 'Scaling',
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
  if (k.includes('POC') || k.includes('MVP') || k.includes('PROTOTYPE')) return STARTUP_PROGRESS_STAGES[3];
  if (k.includes('REVENUE') || k.includes('EARNING')) return STARTUP_PROGRESS_STAGES[4];
  if (k.includes('SCALE') || k.includes('SCALING')) return STARTUP_PROGRESS_STAGES[5];
  
  return STARTUP_PROGRESS_STAGES[0];
};

export const getStartupStageIndex = (rawKey: any): number => {
  const info = getStartupStageInfo(rawKey);
  return info.stepNumber - 1;
};
