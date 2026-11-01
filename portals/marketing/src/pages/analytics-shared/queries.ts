import { gql } from '@apollo/client';

/** Marketing › Analytics: the five window reads. Each page asks only for what it draws. */

export interface AnalyticsCount {
  key: string;
  count: number;
}

export interface AnalyticsWindowDays {
  days: string[];
}

export interface AnalyticsOverview {
  window: AnalyticsWindowDays;
  social: { followers: number; follower_growth: number; posts: number; views: number; engagement: number; engagement_rate: number };
  content: { from_duncit: number; from_networks: number; reels_made: number; reels_posted: number; reel_views: number };
  funnel: { new_leads: number; converted: number; promoted: number };
  automation: { runs: number; success_rate: number; cost: number; tokens: number };
  links: { clicks: number; conversions: number; conversion_rate: number; revenue: number };
  daily: { engagement: number[]; new_leads: number[]; clicks: number[] };
}

export const MARKETING_ANALYTICS_OVERVIEW = gql`
  query MarketingAnalyticsOverview($input: MarketingAnalyticsInput!) {
    marketingAnalyticsOverview(input: $input) {
      window { days }
      social { followers follower_growth posts views engagement engagement_rate }
      content { from_duncit from_networks reels_made reels_posted reel_views }
      funnel { new_leads converted promoted }
      automation { runs success_rate cost tokens }
      links { clicks conversions conversion_rate revenue }
      daily { engagement new_leads clicks }
    }
  }
`;

export interface AnalyticsNetwork {
  platform: string;
  followers: number;
  posts: number;
  views: number;
  engagement: number;
  engagement_rate: number;
}

export interface AnalyticsTopPost {
  id: string;
  text: string;
  platform: string;
  account_name: string;
  permalink: string;
  published_at: string;
  views: number;
  engagement: number;
}

export interface AnalyticsSocial {
  window: AnalyticsWindowDays;
  followers: number;
  follower_growth: number;
  posts: number;
  views: number;
  engagement: number;
  engagement_rate: number;
  daily: { engagement: number[]; views: number[] };
  networks: AnalyticsNetwork[];
  accounts: { account_id: string; name: string; growth: number }[];
  top_posts: AnalyticsTopPost[];
}

export const MARKETING_ANALYTICS_SOCIAL = gql`
  query MarketingAnalyticsSocial($input: MarketingAnalyticsInput!) {
    marketingAnalyticsSocial(input: $input) {
      window { days }
      followers
      follower_growth
      posts
      views
      engagement
      engagement_rate
      daily { engagement views }
      networks { platform followers posts views engagement engagement_rate }
      accounts { account_id name growth }
      top_posts { id text platform account_name permalink published_at views engagement }
    }
  }
`;

export interface AnalyticsContent {
  from_duncit: number;
  from_networks: number;
  formats: { format: string; posts: number; views: number; engagement: number }[];
  reels_made: number;
  reels_posted: number;
  reel_views: number;
  reel_engagement: number;
  top_reels: { id: string; name: string; views: number }[];
  by_weekday: number[];
  by_hour: number[];
  best_weekday: number | null;
  best_hour: number | null;
}

export const MARKETING_ANALYTICS_CONTENT = gql`
  query MarketingAnalyticsContent($input: MarketingAnalyticsInput!) {
    marketingAnalyticsContent(input: $input) {
      from_duncit
      from_networks
      formats { format posts views engagement }
      reels_made
      reels_posted
      reel_views
      reel_engagement
      top_reels { id name views }
      by_weekday
      by_hour
      best_weekday
      best_hour
    }
  }
`;

export interface AnalyticsFunnel {
  window: AnalyticsWindowDays;
  new_leads: number;
  by_source: AnalyticsCount[];
  daily_new: number[];
  funnel: { stage: string; reached: number; conversion: number }[];
  converted: number;
  time_in_stage: { stage: string; moves: number; median_hours: number }[];
  promoted: number;
}

export const MARKETING_ANALYTICS_FUNNEL = gql`
  query MarketingAnalyticsFunnel($input: MarketingAnalyticsInput!, $pipeline: MarketingLeadPipeline) {
    marketingAnalyticsFunnel(input: $input, pipeline: $pipeline) {
      window { days }
      new_leads
      by_source { key count }
      daily_new
      funnel { stage reached conversion }
      converted
      time_in_stage { stage moves median_hours }
      promoted
    }
  }
`;

export interface AnalyticsAutomation {
  window: AnalyticsWindowDays;
  runs: number;
  success_rate: number;
  tokens: number;
  cost: number;
  by_workflow: { workflow: string; runs: number; cost: number }[];
  by_status: AnalyticsCount[];
  daily: { runs: number[]; cost: number[] };
  approvals: { waiting: number; decided: number; median_decision_minutes: number };
  agents: { agent_key: string; runs: number; success_rate: number }[];
}

export const MARKETING_ANALYTICS_AUTOMATION = gql`
  query MarketingAnalyticsAutomation($input: MarketingAnalyticsInput!) {
    marketingAnalyticsAutomation(input: $input) {
      window { days }
      runs
      success_rate
      tokens
      cost
      by_workflow { workflow runs cost }
      by_status { key count }
      daily { runs cost }
      approvals { waiting decided median_decision_minutes }
      agents { agent_key runs success_rate }
    }
  }
`;
