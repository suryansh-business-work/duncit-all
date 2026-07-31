import { describe, expect, it } from 'vitest';
import {
  blankMarketingCampaignValues,
  marketingCampaignSchema,
  toMarketingCampaignInput,
} from './marketing-campaign.form';

const valid = {
  ...blankMarketingCampaignValues(),
  name: 'Weekend launch',
  subject: 'New pods are live',
};

const messages = (result: ReturnType<typeof marketingCampaignSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('marketingCampaignSchema', () => {
  it('rejects invalid MJML', () => {
    const result = marketingCampaignSchema.safeParse({ ...valid, mjml: 'plain email' });
    expect(messages(result)).toMatch(/mjml/i);
  });

});

describe('toMarketingCampaignInput', () => {
  it('uses send-now when no schedule is provided', () => {
    const input = toMarketingCampaignInput(valid);
    expect(input.send_now).toBe(true);
  });
});
