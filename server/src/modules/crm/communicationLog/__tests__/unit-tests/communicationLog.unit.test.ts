import { communicationLogResolvers } from '../../communicationLog.resolver';
import { makeContext } from '@test/harness';

describe('communicationLog unit', () => {
  it('communicationLogs query is gated to CRM read roles', async () => {
    await expect(
      (communicationLogResolvers.Query as any).communicationLogs({}, { filter: {}, page: {} }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
