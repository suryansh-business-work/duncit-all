import type { CampaignPreviewCard } from '../queries';

export type CampaignChannel = 'EMAIL' | 'WHATSAPP';
export type CampaignAudience = 'ALL_USERS' | 'NEWSLETTER_SUBSCRIBERS';
export type CampaignCardType = '' | 'POD' | 'CLUB';

export interface MarketingCampaignFormValues {
  name: string;
  channel: CampaignChannel;
  audience: CampaignAudience;
  subject: string;
  mjml: string;
  card_type: CampaignCardType;
  card_ref_id: string;
  scheduled_at: string;
}

export interface MarketingCampaignFormProps {
  initialValues: MarketingCampaignFormValues;
  cards: CampaignPreviewCard[];
  busy: boolean;
  previewLoading: boolean;
  errorMessage?: string | null;
  onValuesChange: (values: MarketingCampaignFormValues) => void;
  onSubmit: (values: MarketingCampaignFormValues) => Promise<void> | void;
}