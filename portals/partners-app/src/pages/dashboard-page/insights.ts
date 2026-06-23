export interface DashPod {
  pod_date_time?: string | null;
  pod_amount?: number | null;
  pod_attendees?: string[] | null;
}

export interface MonthPoint {
  label: string;
  earning: number;
  pods: number;
}

/** Real pod earnings per month for the trailing `monthsBack` months, derived
 *  from the partner's own host pods (amount × attendees, by pod date). */
export function monthlyPodEarnings(pods: DashPod[], monthsBack = 6, now: Date = new Date()): MonthPoint[] {
  const buckets: MonthPoint[] = [];
  const indexByKey = new Map<string, number>();
  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    indexByKey.set(`${date.getFullYear()}-${date.getMonth()}`, buckets.length);
    buckets.push({ label: date.toLocaleString('en-US', { month: 'short' }), earning: 0, pods: 0 });
  }
  for (const pod of pods) {
    if (!pod.pod_date_time) continue;
    const date = new Date(pod.pod_date_time);
    if (Number.isNaN(date.getTime())) continue;
    const index = indexByKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (index === undefined) continue;
    buckets[index].earning += Number(pod.pod_amount || 0) * (pod.pod_attendees?.length ?? 0);
    buckets[index].pods += 1;
  }
  return buckets;
}
