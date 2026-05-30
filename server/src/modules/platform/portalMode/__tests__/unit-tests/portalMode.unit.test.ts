import { portalModeService } from '../../portalMode.service';
import { portalModeResolvers } from '../../portalMode.resolver';
import { makeContext } from '@test/harness';

describe('portalMode unit', () => {
  it('setMode rejects an unsupported mode', async () => {
    await expect(
      portalModeService.setMode('tech', 'OFFLINE' as any, null)
    ).rejects.toThrow(/unsupported portal mode/i);
  });

  it('setMode rejects an unknown portal key', async () => {
    await expect(
      portalModeService.setMode('does-not-exist', 'LIVE', null)
    ).rejects.toThrow(/unknown portal key/i);
  });

  it('portalModes query is gated to tech-manage roles', async () => {
    await expect(
      (portalModeResolvers.Query as any).portalModes({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('setPortalMode mutation is gated to tech-manage roles', async () => {
    await expect(
      (portalModeResolvers.Mutation as any).setPortalMode({}, { key: 'tech', mode: 'LIVE' }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
