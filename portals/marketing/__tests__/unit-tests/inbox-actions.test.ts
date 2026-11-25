import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphQLError } from 'graphql';
import { askForDraft, runInboxAction } from '../../src/pages/inbox-page/drawer/inboxActions';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

const refusal = () => new GraphQLError('Meta refused the reply.');

beforeEach(() => dialogsMock.notify.mockReset());

describe('runInboxAction', () => {
  it('hands the answer on and says it worked', async () => {
    const onChanged = vi.fn();
    await expect(runInboxAction(async () => ({ id: 'c1' }), 'Done.', onChanged)).resolves.toBe(true);
    expect(onChanged).toHaveBeenCalledWith({ id: 'c1' });
    expect(dialogsMock.notify).toHaveBeenCalledWith('Done.', 'success');
  });

  it('words the success from the answer when given a function', async () => {
    const onChanged = vi.fn();
    await runInboxAction(async () => ({ merged: true }), (value) => (value.merged ? 'Matched.' : 'Created.'), onChanged);
    expect(dialogsMock.notify).toHaveBeenCalledWith('Matched.', 'success');
  });

  it('says nothing and changes nothing when the answer is empty', async () => {
    const onChanged = vi.fn();
    await expect(runInboxAction(async () => null, 'Done.', onChanged)).resolves.toBe(false);
    await expect(runInboxAction(async () => undefined, 'Done.', onChanged)).resolves.toBe(false);
    expect(onChanged).not.toHaveBeenCalled();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('shows a refusal as the server worded it, and changes nothing', async () => {
    const onChanged = vi.fn();
    await expect(
      runInboxAction(async () => {
        throw refusal();
      }, 'Done.', onChanged)
    ).resolves.toBe(false);
    expect(onChanged).not.toHaveBeenCalled();
    expect(dialogsMock.notify).toHaveBeenCalledWith('Meta refused the reply.', 'error');
  });
});

describe('askForDraft', () => {
  it('returns the draft and says it is ready', async () => {
    await expect(askForDraft(async () => 'Thanks!', 'Draft ready.')).resolves.toBe('Thanks!');
    expect(dialogsMock.notify).toHaveBeenCalledWith('Draft ready.', 'success');
  });

  it('returns null quietly when there is no draft or it is empty', async () => {
    await expect(askForDraft(async () => undefined, 'Draft ready.')).resolves.toBeNull();
    await expect(askForDraft(async () => '', 'Draft ready.')).resolves.toBe('');
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('returns null and shows why when the server refuses', async () => {
    await expect(
      askForDraft(async () => {
        throw refusal();
      }, 'Draft ready.')
    ).resolves.toBeNull();
    expect(dialogsMock.notify).toHaveBeenCalledWith('Meta refused the reply.', 'error');
  });
});
