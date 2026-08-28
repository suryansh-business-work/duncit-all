import { describe, expect, it } from 'vitest';
import { hostPodSection, splitHostPods } from '../src/host-pod-sections';

describe('hostPodSection', () => {
  it('waits on the venue while the request is unanswered', () => {
    expect(hostPodSection('PENDING')).toBe('REQUESTED');
  });

  it('drops a refused pod below Your Pods', () => {
    expect(hostPodSection('DECLINED')).toBe('REJECTED');
  });

  it('keeps everything else in Your Pods — approved, unmanaged, unknown or missing', () => {
    expect(hostPodSection('APPROVED')).toBe('YOURS');
    expect(hostPodSection('NONE')).toBe('YOURS');
    expect(hostPodSection('SOMETHING_NEW')).toBe('YOURS');
    expect(hostPodSection(null)).toBe('YOURS');
    expect(hostPodSection()).toBe('YOURS');
  });
});

describe('splitHostPods', () => {
  const pods = [
    { id: 'DUN-POD-4821', venue_approval_status: 'PENDING' },
    { id: 'DUN-POD-4822', venue_approval_status: 'APPROVED' },
    { id: 'DUN-POD-4823', venue_approval_status: 'DECLINED' },
    { id: 'DUN-POD-4824', venue_approval_status: null },
    { id: 'DUN-POD-4825', venue_approval_status: 'PENDING' },
  ];

  it('puts every pod in exactly one list, keeping the server order inside each', () => {
    const out = splitHostPods(pods);

    expect(out.requested.map((p) => p.id)).toEqual(['DUN-POD-4821', 'DUN-POD-4825']);
    expect(out.rejected.map((p) => p.id)).toEqual(['DUN-POD-4823']);
    expect(out.yours.map((p) => p.id)).toEqual(['DUN-POD-4822', 'DUN-POD-4824']);
    expect(out.requested.length + out.rejected.length + out.yours.length).toBe(pods.length);
  });

  it('answers with three empty lists for a host who runs nothing', () => {
    expect(splitHostPods([])).toEqual({ requested: [], yours: [], rejected: [] });
  });
});
