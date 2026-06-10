import { describe, expect, it } from 'vitest';
import { hostReleaseSchema, mediaTextToInput, venueReleaseSchema } from './complete-pod.form';

describe('complete pod release schemas', () => {
  it('requires bill upload for venue billing', async () => {
    const error = await venueReleaseSchema
      .validate({ amount_requested: 1000, bill_url: '', notes: '' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/bill/i);
  });

  it('requires party media for host release', async () => {
    const error = await hostReleaseSchema
      .validate({ host_user_id: 'u1', amount_requested: 500, evidence_media_text: '', notes: '' }, { abortEarly: false })
      .catch((validationError) => validationError);
    expect(error.errors.join(' ')).toMatch(/party media/i);
  });

  it('maps videos in evidence media', () => {
    expect(mediaTextToInput('https://cdn.test/party.mp4')[0].type).toBe('VIDEO');
  });
});