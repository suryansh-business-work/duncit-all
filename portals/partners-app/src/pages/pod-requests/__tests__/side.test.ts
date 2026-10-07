import { describe, expect, it } from 'vitest';
import { nearbySearchPath, podRequestPath, podRequestsPath, studioPodsPath } from '../side';

describe('pod request paths', () => {
  it('puts each studio under its own console section', () => {
    expect(podRequestsPath('VENUE')).toBe('/venues/pod-requests');
    expect(podRequestsPath('HOST')).toBe('/host/pod-requests');
  });

  it('opens one request beneath its studio list', () => {
    expect(podRequestPath('VENUE', 'req-9')).toBe('/venues/pod-requests/req-9');
    expect(podRequestPath('HOST', 'req-9')).toBe('/host/pod-requests/req-9');
  });

  it('sends a venue owner to the host search and a host to the venue search', () => {
    expect(nearbySearchPath('VENUE')).toBe('/venues/nearby-hosts');
    expect(nearbySearchPath('HOST')).toBe('/host/nearby-venues');
  });

  it("lands View pod on the studio's own pod list", () => {
    expect(studioPodsPath('VENUE')).toBe('/venues/pods');
    expect(studioPodsPath('HOST')).toBe('/host/pods');
  });
});
