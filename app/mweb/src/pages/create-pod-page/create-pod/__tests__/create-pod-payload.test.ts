import { describe, expect, it } from 'vitest';

import { buildCreatePodInput } from '../create-pod.payload';
import { blankCreatePodForm } from '../create-pod.types';

describe('buildCreatePodInput — Pod Request link', () => {
  it('sends no Pod Request for an ordinary pod', () => {
    expect(blankCreatePodForm.partner_request_id).toBe('');
    expect(buildCreatePodInput(blankCreatePodForm).partner_request_id).toBeNull();
  });

  it('sends the Pod Request a prefilled pod is published against, alongside its venue and slot', () => {
    const input = buildCreatePodInput({
      ...blankCreatePodForm,
      pod_mode: 'PHYSICAL',
      venue_id: 'venue-1',
      venue_slot_id: 'slot-9',
      partner_request_id: 'req-1',
    });

    expect(input).toMatchObject({ partner_request_id: 'req-1', venue_id: 'venue-1', venue_slot_id: 'slot-9' });
  });
});
