import { crmResolvers } from '../../crm.resolver';
import { makeContext } from '@test/harness';

describe('crm unit', () => {
  it('venueLeads query is gated to CRM roles', async () => {
    await expect(
      (async () => (crmResolvers.Query as any).venueLeads({}, { filter: {} }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('hostLeads query is gated to CRM roles', async () => {
    await expect(
      (async () => (crmResolvers.Query as any).hostLeads({}, { filter: {} }, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });
});
