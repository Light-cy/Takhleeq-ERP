/**
 * Canonical Industries List for Takhleeq ERP
 * Standardized per UX Audit item G-07
 */

export const SHARED_INDUSTRIES = [
  'Artificial Intelligence / Machine Learning',
  'EdTech (Educational Technology)',
  'FinTech (Financial Technology)',
  'HealthTech & BioTech',
  'E-Commerce & Retail',
  'AgriTech (Agricultural Technology)',
  'CleanTech & Sustainability',
  'Logistics & Supply Chain',
  'Cybersecurity & Privacy',
  'SaaS & Enterprise Software',
  'Media, Gaming & Entertainment',
  'Consumer Services & Social',
  'Hardware & IoT',
  'Other / Emerging Sector',
] as const;

export type SharedIndustry = typeof SHARED_INDUSTRIES[number];
