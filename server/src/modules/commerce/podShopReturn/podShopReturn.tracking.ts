import { logs } from '@observability/log';
import type { TrackResult } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { PodShopReturnModel, type IPodShopReturn } from './podShopReturn.model';
import { applyPodShopReturnTracking, pullPodShopReturnTracking } from './podShopReturn.pickup';

/**
 * Where ShipRocket's courier webhook and the stale-tracking sweep hand over a
 * pod-shop return's reverse pickup. Arrival at the warehouse tells the buyer.
 */

async function arrived(ret: IPodShopReturn) {
  const { podShopReturnService } = await import('./podShopReturn.service');
  await podShopReturnService.onArrived(ret);
}

export const podShopReturnTracking = {
  /** A webhook for this AWB, if it is a pod-shop return. Answers what it updated, or ''. */
  async webhook(awb: string, t: TrackResult): Promise<string> {
    const ret = await PodShopReturnModel.findOne({ 'pickup.awb': awb });
    if (!ret) return '';
    if (await applyPodShopReturnTracking(ret, t)) await arrived(ret);
    return `pod-shop return ${ret.return_no}`;
  },

  /** Pull every booked pickup the webhook has not touched since `cutoff`. Answers how many were pulled. */
  async sweep(cutoff: Date, limit: number): Promise<number> {
    const returns = await PodShopReturnModel.find({
      'pickup.awb': { $ne: '' },
      'pickup.status': { $in: ['BOOKED', 'PICKUP_SCHEDULED', 'IN_TRANSIT'] },
      $or: [{ 'pickup.last_synced_at': null }, { 'pickup.last_synced_at': { $lt: cutoff } }],
    }).limit(limit);
    let pulled = 0;
    for (const ret of returns) {
      try {
        if (await pullPodShopReturnTracking(ret)) await arrived(ret);
        pulled += 1;
      } catch (error) {
        logs.server.warn('podShopReturn', 'sweep', { error, return_no: ret.return_no });
      }
    }
    return pulled;
  },
};
