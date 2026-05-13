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

describe('marketingCampaignSchema', () => {
  it('rejects invalid MJML', async () => {
    const error = await marketingCampaignSchema
      .validate({ ...valid, mjml: 'plain email' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/mjml/i);
  });

  it('requires a selected dynamic card when card type is set', async () => {
    const error = await marketingCampaignSchema
      .validate({ ...valid, card_type: 'POD', card_ref_id: '' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/select a card/i);
  });
});

describe('toMarketingCampaignInput', () => {
  it('uses send-now when no schedule is provided', () => {
    const input = toMarketingCampaignInput(valid);
    expect(input.send_now).toBe(true);
    expect(input.card_type).toBeUndefined();
  });
});