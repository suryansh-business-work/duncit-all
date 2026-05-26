export interface ProductRow {
  id: string;
  name: string;
  price: number;
  commission_percent: number;
}

export interface PodProfitInputs {
  pod_cost: number;
  gst_percent: number;
  platform_fee_percent: number;
  host_percent: number;
  host_duncit_cut_percent: number;
  products: ProductRow[];
}

export interface PodProfitResults {
  gst_amount: number;
  platform_fee_amount: number;
  host_amount_gross: number;
  duncit_cut_from_host: number;
  host_amount_net: number;
  product_revenue_total: number;
  product_commission_total: number;
  duncit_profit_total: number;
  effective_duncit_margin_percent: number;
}

export const DEFAULT_INPUTS: PodProfitInputs = {
  pod_cost: 1000,
  gst_percent: 18,
  platform_fee_percent: 10,
  host_percent: 60,
  host_duncit_cut_percent: 10,
  products: [],
};

let counter = 0;
export const newProduct = (): ProductRow => {
  counter += 1;
  return {
    id: `p_${Date.now()}_${counter}`,
    name: `Product ${counter}`,
    price: 0,
    commission_percent: 10,
  };
};

export const formatRupees = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
