import { describe, expect, it } from 'vitest';
import AdsOverview, { MY_ADS_DASHBOARD } from '../../src/pages/dashboard';

describe('dashboard barrel', () => {
  it('re-exports the overview component and the dashboard query', () => {
    expect(typeof AdsOverview).toBe('function');
    expect(MY_ADS_DASHBOARD).toBeTruthy();
    // gql documents carry a `kind` of 'Document'.
    expect((MY_ADS_DASHBOARD as { kind?: string }).kind).toBe('Document');
  });
});
