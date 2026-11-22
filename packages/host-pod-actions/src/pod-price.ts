import type { HostPodTarget } from './types';

/** A free pod carries no pod discount: a FREE type, or no ticket price at all. */
export function isFreePodPrice(pod: Readonly<Pick<HostPodTarget, 'pod_type' | 'pod_amount'>>): boolean {
  return String(pod.pod_type ?? '').includes('FREE') || (Number(pod.pod_amount) || 0) <= 0;
}
