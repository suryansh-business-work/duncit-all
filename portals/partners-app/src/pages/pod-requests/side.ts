import type { PodRequestSide } from './queries';

/** Where each studio's Pod Request pages live in the console. */
const BASE: Record<PodRequestSide, string> = { VENUE: '/venues', HOST: '/host' };

export const podRequestsPath = (side: PodRequestSide) => `${BASE[side]}/pod-requests`;
export const podRequestPath = (side: PodRequestSide, id: string) => `${podRequestsPath(side)}/${id}`;
export const nearbySearchPath = (side: PodRequestSide) =>
  side === 'VENUE' ? '/venues/nearby-hosts' : '/host/nearby-venues';
/** The studio's own pod list — where "View pod" lands once the pod exists. */
export const studioPodsPath = (side: PodRequestSide) => `${BASE[side]}/pods`;
