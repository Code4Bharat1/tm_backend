import { planFeature } from '../constants/defaultFeatures.js';

/**
 * Get features array for a given plan name (case-insensitive).
 * @param {string} planName - The plan name (e.g., 'Basic', 'Standard', 'Premium')
 * @returns {string[]} Array of features for the plan, or [] if not found.
 */
export function getFeaturesByPlan(planName) {
  if (!planName) return [];
  const key = planName.toLowerCase();
  return planFeature[key]?.features || [];
}
