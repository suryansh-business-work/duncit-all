/**
 * The request log, pinned to one AI feature for the AI Features logs page.
 *
 * `task` is a base filter: it narrows the page AND the count to that feature,
 * and the grid's own search narrows within it rather than escaping it. Absent
 * or blank, the log is the whole log, as the Logs console has always read it.
 */
import { makeContext } from '@test/harness';
import { OpenAiUsageLogModel } from '../../openaiUsage.model';
import { openAiUsageService } from '../../openaiUsage.service';
import { openAiUsageResolvers } from '../../openaiUsage.resolver';

const seed = () =>
  OpenAiUsageLogModel.create([
    { task: 'moderation.pod', status: 'SUCCESS', detail: 'pod sunset' },
    { task: 'moderation.pod', status: 'FAILED', detail: 'pod sunrise' },
    { task: 'moderation.pod', status: 'SKIPPED', detail: 'pod beach' },
    { task: 'support.assistant', status: 'SUCCESS', detail: 'ticket sunset' },
  ]);

describe('openAiUsageService.logsTable — task filter', () => {
  it('returns only the asked feature’s calls, and counts only those', async () => {
    await seed();

    const page = await openAiUsageService.logsTable(null, 'moderation.pod');

    expect(page.total).toBe(3);
    expect(page.rows.every((row) => row.task === 'moderation.pod')).toBe(true);
  });

  it('lets the grid search narrow within the feature, never outside it', async () => {
    await seed();

    const page = await openAiUsageService.logsTable({ search: 'sunset' }, 'moderation.pod');

    expect(page.total).toBe(1);
    expect(page.rows[0]).toMatchObject({ task: 'moderation.pod', detail: 'pod sunset' });
  });

  it('reads the whole log when no task, or a blank one, is given', async () => {
    await seed();

    await expect(openAiUsageService.logsTable(null)).resolves.toMatchObject({ total: 4 });
    await expect(openAiUsageService.logsTable(null, '')).resolves.toMatchObject({ total: 4 });
    await expect(openAiUsageService.logsTable(null, null)).resolves.toMatchObject({ total: 4 });
  });

  it('returns an empty page for a feature that has never been called', async () => {
    await seed();

    const page = await openAiUsageService.logsTable(null, 'reels.director');

    expect(page).toMatchObject({ total: 0, rows: [] });
  });
});

describe('openAiUsageLogsTable resolver', () => {
  const { Query } = openAiUsageResolvers;

  it.each(['SUPER_ADMIN', 'AI_MANAGER', 'LOGS_MANAGER'])('passes the task through for %s', async (role) => {
    await seed();

    const page = await Query.openAiUsageLogsTable(
      undefined,
      { query: null, task: 'support.assistant' },
      makeContext({ roles: [role] }),
    );

    expect(page.total).toBe(1);
    expect(page.rows[0].task).toBe('support.assistant');
  });

  it('refuses a role outside the AI portal and the Logs console', () => {
    expect(() =>
      Query.openAiUsageLogsTable(undefined, { task: 'moderation.pod' }, makeContext({ roles: ['CITY_ADMIN'] })),
    ).toThrow('Access Denied');
  });
});
