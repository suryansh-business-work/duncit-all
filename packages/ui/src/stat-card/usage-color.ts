import type { StatCardBarColor } from './types';

/** Color a usage bar by how full it is (tech server StatCard convention). */
export function usageColor(percent: number): StatCardBarColor {
  if (percent >= 90) return 'error';
  if (percent >= 75) return 'warning';
  return 'success';
}
