import { useMemo } from 'react';
import type { PodProfitInputs, PodProfitResults } from './types';

const pct = (value: number) => Math.max(0, value) / 100;

/**
 * Calculator math
 * ---------------
 * pod_cost is treated as the GROSS pod price paid by the user. GST is the
 * amount Duncit collects on behalf of the government and is *not* part of
 * Duncit's profit — it is shown separately so finance can reconcile.
 *
 * platform_fee_percent is the slice of pod_cost Duncit keeps as a platform
 * fee, before splitting the remainder with the host.
 *
 * host_percent is the slice of pod_cost paid to the host as their gross
 * earning. Of that gross earning Duncit takes a further cut equal to
 * host_duncit_cut_percent — this is the platform's "host-success" margin.
 *
 * Each product adds product.price × commission% to Duncit's profit.
 *
 * duncit_profit_total = platform_fee_amount
 *                       + duncit_cut_from_host
 *                       + product_commission_total
 */
export function useCalculator(inputs: PodProfitInputs): PodProfitResults {
  return useMemo(() => {
    const podCost = Math.max(0, inputs.pod_cost);
    const gstAmount = podCost * pct(inputs.gst_percent);
    const platformFee = podCost * pct(inputs.platform_fee_percent);
    const hostGross = podCost * pct(inputs.host_percent);
    const duncitCutFromHost = hostGross * pct(inputs.host_duncit_cut_percent);
    const hostNet = hostGross - duncitCutFromHost;

    let productRevenue = 0;
    let productCommission = 0;
    for (const product of inputs.products) {
      const price = Math.max(0, product.price);
      productRevenue += price;
      productCommission += price * pct(product.commission_percent);
    }

    const duncitProfit = platformFee + duncitCutFromHost + productCommission;
    const denom = podCost + productRevenue;
    const margin = denom > 0 ? (duncitProfit / denom) * 100 : 0;

    return {
      gst_amount: gstAmount,
      platform_fee_amount: platformFee,
      host_amount_gross: hostGross,
      duncit_cut_from_host: duncitCutFromHost,
      host_amount_net: hostNet,
      product_revenue_total: productRevenue,
      product_commission_total: productCommission,
      duncit_profit_total: duncitProfit,
      effective_duncit_margin_percent: margin,
    };
  }, [inputs]);
}
