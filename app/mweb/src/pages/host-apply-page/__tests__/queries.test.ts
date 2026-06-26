import { describe, expect, it } from 'vitest';
import { applyButtonState, type HostRequestStatus } from '../queries';

const reqWith = (status: HostRequestStatus) => ({ status });

describe('applyButtonState (banner CTA lock)', () => {
  it('lets a host apply when there is no active request', () => {
    expect(applyButtonState(null)).toEqual({ label: 'Apply Now', disabled: false });
    expect(applyButtonState(undefined)).toEqual({ label: 'Apply Now', disabled: false });
  });

  it('locks to a read-only "Applied" while a request is in process', () => {
    expect(applyButtonState(reqWith('REQUESTED'))).toEqual({ label: 'Applied', disabled: true });
    expect(applyButtonState(reqWith('ACKNOWLEDGED'))).toEqual({ label: 'Applied', disabled: true });
  });

  it('reverts to "Apply Now" once the request reaches a terminal state', () => {
    expect(applyButtonState(reqWith('APPROVED'))).toEqual({ label: 'Apply Now', disabled: false });
    expect(applyButtonState(reqWith('REJECTED'))).toEqual({ label: 'Apply Now', disabled: false });
  });
});
