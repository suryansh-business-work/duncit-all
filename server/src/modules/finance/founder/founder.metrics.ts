/**
 * Founder Dashboard metric catalogue. Single source of truth for every KPI card:
 * its category, label, unit, plain-English definition (the ℹ️ drawer) and formula
 * (the ⚙️ drawer). `computed` metrics are derived from the database by
 * founder.compute.ts; the rest read a founder-entered value from FounderSetting
 * (keyed by the metric `key`). `settingKeys` lists the constants a computed
 * formula needs (also editable in the settings drawer).
 */
export type MetricUnit =
  | 'currency'
  | 'percent'
  | 'number'
  | 'months'
  | 'minutes'
  | 'rating'
  | 'boolean';

export interface MetricDef {
  key: string;
  label: string;
  unit: MetricUnit;
  definition: string;
  formula: string;
  /** true → derived from the DB (founder.compute); false → founder-entered value. */
  computed: boolean;
  /** Constants the formula reads from settings (shown + editable in ⚙️). */
  settingKeys?: string[];
}

export interface MetricCategory {
  key: string;
  label: string;
  icon: string;
  metrics: MetricDef[];
}

const m = (
  key: string,
  label: string,
  unit: MetricUnit,
  definition: string,
  formula: string,
  computed = false,
  settingKeys: string[] = []
): MetricDef => ({ key, label, unit, definition, formula, computed, settingKeys });

export const FOUNDER_CATEGORIES: MetricCategory[] = [
  {
    key: 'revenue',
    label: 'Revenue',
    icon: 'revenue',
    metrics: [
      m('total_revenue', 'Total Revenue', 'currency', 'Gross value of all successful payments in the selected period.', 'Σ amount where status = SUCCESS', true),
      m('mrr', 'Monthly Revenue (MRR)', 'currency', 'Revenue recognised in the most recent calendar month of the range.', 'Σ SUCCESS amount in current month', true),
      m('arr', 'Annual Revenue (ARR)', 'currency', 'Annualised run-rate from the latest month.', 'MRR × 12', true),
      m('todays_revenue', "Today's Revenue", 'currency', 'Successful payments collected today.', 'Σ SUCCESS amount where date = today', true),
      m('revenue_growth_pct', 'Revenue Growth %', 'percent', 'Change vs the previous equal-length period.', '(revenue − prev) / prev × 100', true),
      m('aov', 'Average Order Value (AOV)', 'currency', 'Average value per successful payment.', 'revenue / successful payments', true),
    ],
  },
  {
    key: 'profit',
    label: 'Profit',
    icon: 'profit',
    metrics: [
      m('gross_profit', 'Gross Profit', 'currency', "Duncit's earned margin: platform fees collected (net of GST).", 'Σ platform_fee_amount (SUCCESS)', true),
      m('net_profit', 'Net Profit', 'currency', 'Gross profit minus operating expenses for the period.', 'gross profit − total expenses', true),
      m('profit_margin_pct', 'Profit Margin %', 'percent', 'Net profit as a share of total revenue.', 'net profit / revenue × 100', true),
      m('ebitda', 'EBITDA', 'currency', 'Earnings before interest, tax, depreciation, amortisation (≈ net profit here).', 'gross profit − operating expenses', true),
      m('break_even_status', 'Break-even Status', 'boolean', 'Whether net profit is at or above zero.', 'net profit ≥ 0', true),
    ],
  },
  {
    key: 'expenses',
    label: 'Expenses',
    icon: 'expenses',
    metrics: [
      m('total_expenses', 'Total Expenses', 'currency', 'All recorded expenses in the period.', 'Σ expense.amount', true),
      m('fixed_expenses', 'Fixed Expenses', 'currency', 'Recurring monthly fixed cost (set in settings).', 'fixed_expenses_monthly', false, ['fixed_expenses_monthly']),
      m('variable_expenses', 'Variable Expenses', 'currency', 'Total expenses minus the fixed portion.', 'total expenses − fixed', true, ['fixed_expenses_monthly']),
      m('burn_rate', 'Burn Rate', 'currency', 'Average monthly cash outflow over the range.', 'total expenses / months', true),
      m('cash_flow', 'Cash Flow', 'currency', 'Net cash movement: revenue minus expenses.', 'revenue − expenses', true),
      m('runway_months', 'Runway (Months Left)', 'months', 'How long current cash lasts at the current burn rate.', 'cash_in_bank / burn rate', true, ['cash_in_bank']),
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: 'customers',
    metrics: [
      m('total_customers', 'Total Customers', 'number', 'All registered users.', 'count(users)', true),
      m('active_customers', 'Active Customers', 'number', 'Users with an ACTIVE account status.', 'count(users, status = ACTIVE)', true),
      m('new_customers', 'New Customers', 'number', 'Users who signed up in the period.', 'count(users, created in range)', true),
      m('returning_customers', 'Returning Customers', 'number', 'Customers with more than one purchase.', 'distinct users with ≥2 SUCCESS payments', true),
      m('retention_rate', 'Customer Retention Rate', 'percent', 'Share of customers retained period-over-period.', 'retained / start customers × 100', false),
      m('churn_rate', 'Churn Rate', 'percent', 'Share of customers lost in the period.', 'churned / start customers × 100', false),
      m('csat', 'Customer Satisfaction (CSAT)', 'percent', 'Average satisfaction score from surveys.', 'manual / survey integration', false),
      m('nps', 'Net Promoter Score (NPS)', 'number', 'Promoters % minus detractors %.', '%promoters − %detractors', false),
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: 'sales',
    metrics: [
      m('total_leads', 'Total Leads', 'number', 'All CRM leads (venue + host + ecomm + user).', 'count(leads)', true),
      m('qualified_leads', 'Qualified Leads', 'number', 'Leads marked Qualified/Contacted.', 'count(leads, status = Qualified)', false),
      m('conversion_rate', 'Conversion Rate', 'percent', 'Leads that became paying customers.', 'won / total leads × 100', false),
      m('sales_pipeline', 'Sales Pipeline', 'currency', 'Estimated value of open deals.', 'Σ open deal value', false),
      m('win_rate', 'Win Rate', 'percent', 'Closed-won out of closed deals.', 'won / (won + lost) × 100', false),
      m('lost_deals', 'Lost Deals', 'number', 'Deals marked lost in the period.', 'count(leads, status = Lost)', false),
      m('avg_deal_size', 'Average Deal Size', 'currency', 'Average value of a won deal.', 'won value / won count', false),
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    icon: 'marketing',
    metrics: [
      m('website_visitors', 'Website Visitors', 'number', 'Unique visitors (analytics).', 'distinct visitors', false),
      m('organic_traffic', 'Organic Traffic', 'number', 'Visitors from unpaid sources.', 'manual / analytics', false),
      m('paid_traffic', 'Paid Traffic', 'number', 'Visitors from paid campaigns.', 'manual / analytics', false),
      m('cac', 'CAC (Customer Acquisition Cost)', 'currency', 'Spend to acquire one customer.', 'ad spend / new customers', false, ['ad_spend']),
      m('ltv', 'LTV (Lifetime Value)', 'currency', 'Expected revenue per customer over their lifetime.', 'AOV × purchases × lifespan', false),
      m('roas', 'ROAS', 'number', 'Revenue per rupee of ad spend.', 'revenue from ads / ad spend', false, ['ad_spend']),
      m('roi', 'ROI', 'percent', 'Return on investment.', '(gain − cost) / cost × 100', false),
      m('ctr', 'CTR', 'percent', 'Click-through rate.', 'clicks / impressions × 100', false),
      m('cpc', 'CPC', 'currency', 'Cost per click.', 'ad spend / clicks', false),
      m('cpm', 'CPM', 'currency', 'Cost per 1,000 impressions.', 'ad spend / impressions × 1000', false),
    ],
  },
  {
    key: 'product',
    label: 'Product',
    icon: 'product',
    metrics: [
      m('dau', 'Daily Active Users (DAU)', 'number', 'Distinct users active today.', 'distinct active users (1d)', true),
      m('wau', 'Weekly Active Users (WAU)', 'number', 'Distinct users active in the last 7 days.', 'distinct active users (7d)', true),
      m('mau', 'Monthly Active Users (MAU)', 'number', 'Distinct users active in the last 30 days.', 'distinct active users (30d)', true),
      m('feature_adoption', 'Feature Adoption', 'percent', 'Share of users using a key feature.', 'manual', false),
      m('user_retention', 'User Retention', 'percent', 'Returning active users.', 'manual', false),
      m('session_duration', 'Session Duration', 'minutes', 'Average session length.', 'manual / analytics', false),
      m('crash_rate', 'Crash Rate (App)', 'percent', 'Sessions ending in a crash.', 'crashes / sessions × 100', false),
      m('app_rating', 'App Rating', 'rating', 'Average store rating.', 'manual', false),
    ],
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: 'payments',
    metrics: [
      m('successful_payments', 'Successful Payments', 'number', 'Payments that succeeded.', 'count(status = SUCCESS)', true),
      m('failed_payments', 'Failed Payments', 'number', 'Payments that failed.', 'count(status = FAILED)', true),
      m('pending_payments', 'Pending Payments', 'number', 'Payments awaiting confirmation.', 'count(status = PENDING)', true),
      m('refunds', 'Refunds', 'number', 'Refunded payments.', 'count(status = REFUNDED)', true),
      m('subscription_renewals', 'Subscription Renewals', 'number', 'Recurring renewals in the period.', 'manual', false),
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    icon: 'operations',
    metrics: [
      m('total_orders', 'Total Orders', 'number', 'All pod bookings in the period.', 'count(pod memberships)', true),
      m('completed_orders', 'Completed Orders', 'number', 'Bookings for pods that have finished.', 'count(JOINED, pod past)', true),
      m('pending_orders', 'Pending Orders', 'number', 'Bookings for pods yet to happen.', 'count(JOINED, pod upcoming)', true),
      m('cancelled_orders', 'Cancelled Orders', 'number', 'Bookings backed out.', 'count(status = BACKED_OUT)', true),
      m('avg_fulfillment_time', 'Average Fulfillment Time', 'minutes', 'Average time to fulfil an order.', 'manual', false),
      m('sla_compliance', 'SLA Compliance', 'percent', 'Orders fulfilled within SLA.', 'manual', false),
    ],
  },
  {
    key: 'marketplace',
    label: 'Venue / Marketplace',
    icon: 'marketplace',
    metrics: [
      m('total_venues', 'Total Venues', 'number', 'All venues registered.', 'count(venues)', true),
      m('active_venues', 'Active Venues', 'number', 'Approved + active venues.', 'count(venues, active & APPROVED)', true),
      m('registered_hosts', 'Registered Hosts', 'number', 'All host profiles.', 'count(hosts)', true),
      m('active_hosts', 'Active Hosts', 'number', 'Approved + active hosts.', 'count(hosts, active & APPROVED)', true),
      m('total_pods', 'Total Pods', 'number', 'All pods created.', 'count(pods)', true),
      m('live_pods', 'Live Pods', 'number', 'Active pods scheduled now/upcoming.', 'count(pods, active & upcoming)', true),
      m('completed_pods', 'Completed Pods', 'number', 'Pods whose date has passed.', 'count(pods, date < now)', true),
      m('booking_rate', 'Booking Rate', 'percent', 'Seats booked vs seats offered.', 'bookings / total spots × 100', false),
      m('venue_utilization', 'Venue Utilization %', 'percent', 'How fully venues are used.', 'manual', false),
      m('avg_attendance', 'Average Attendance', 'number', 'Average attendees per pod.', 'attendees / pods', false),
      m('no_show_rate', 'No-show Rate', 'percent', 'Backed-out bookings vs total.', 'BACKED_OUT / total × 100', true),
    ],
  },
  {
    key: 'community',
    label: 'Community',
    icon: 'community',
    metrics: [
      m('total_clubs', 'Total Clubs', 'number', 'All clubs.', 'count(clubs)', true),
      m('active_clubs', 'Active Clubs', 'number', 'Clubs marked active.', 'count(clubs, is_active)', true),
      m('total_members', 'Total Members', 'number', 'All users (community members).', 'count(users)', true),
      m('new_members', 'New Members', 'number', 'Users who joined in the period.', 'count(users, created in range)', true),
      m('stories_posted', 'Stories Posted', 'number', 'Stories posted in the period.', 'count(posts, kind = STORY)', true),
      m('community_engagement', 'Community Engagement', 'percent', 'Members active in community.', 'manual', false),
      m('whatsapp_growth', 'WhatsApp Community Growth', 'percent', 'Growth of linked WhatsApp communities.', 'manual', false),
    ],
  },
  {
    key: 'northstar',
    label: 'North Star Metrics',
    icon: 'northstar',
    metrics: [
      m('north_star_metric', 'North Star Metric', 'number', 'Your single most important metric (set the value).', 'manual', false),
      m('growth_rate', 'Growth Rate', 'percent', 'Revenue growth vs previous period.', 'see Revenue Growth %', true),
      m('active_users', 'Active Users', 'number', 'Monthly active users.', '= MAU', true),
      m('arpu', 'Revenue per User (ARPU)', 'currency', 'Average revenue per active user.', 'revenue / active users', true),
      m('ltv_cac_ratio', 'LTV/CAC Ratio', 'number', 'Lifetime value vs acquisition cost.', 'LTV / CAC', false),
      m('customer_health_score', 'Customer Health Score', 'number', 'Composite health indicator.', 'manual', false),
    ],
  },
];

/** The 12 cards highlighted at the top of the founder dashboard. */
export const FOUNDER_TOP_KEYS = [
  'total_revenue',
  'net_profit',
  'cash_in_bank',
  'burn_rate',
  'runway_months',
  'active_users',
  'new_customers',
  'retention_rate',
  'total_orders',
  'conversion_rate',
  'active_venues',
  'growth_rate',
];

/** Flat lookup of every metric by key. */
export const METRIC_BY_KEY: Record<string, MetricDef & { category: string }> = {};
FOUNDER_CATEGORIES.forEach((cat) => {
  cat.metrics.forEach((metric) => {
    METRIC_BY_KEY[metric.key] = { ...metric, category: cat.key };
  });
});
