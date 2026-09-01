import { act, renderHook, waitFor } from '@testing-library/react-native';
import { emptyContactDraft } from '@duncit/utils';

import { useCodeRequest, type CodeRequestOutcome } from '@/hooks/useCodeRequest';

const DRAFT = { ...emptyContactDraft(), email: 'riya@duncit.com' };

const outcome = (over: Partial<CodeRequestOutcome> = {}): CodeRequestOutcome => ({
  registered: true,
  sent: true,
  resendAfterSeconds: 30,
  expiresInMinutes: 10,
  testCode: null,
  ...over,
});

const setup = (result: CodeRequestOutcome) => {
  const send = jest.fn<Promise<CodeRequestOutcome>, unknown[]>().mockResolvedValue(result);
  const hook = renderHook(() => useCodeRequest(send, 'Something went wrong'));
  return { send, hook };
};

describe('useCodeRequest', () => {
  it('moves to the code step when a medium carried the code', async () => {
    const { hook } = setup(outcome());

    await act(async () => {
      await hook.result.current.sendCode(DRAFT);
    });

    await waitFor(() => expect(hook.result.current.state.step).toBe('CODE'));
    expect(hook.result.current.notSent).toBe(false);
    expect(hook.result.current.notFound).toBe(false);
  });

  /*
    The bug this guards: an opted-out mailbox, a switched-off template and a
    refused address all come back as a real account whose code went nowhere. The
    screen used to advance anyway and ask for six digits that were never sent.
  */
  it('stays on the channel step and warns when nothing carried the code', async () => {
    const { hook } = setup(outcome({ sent: false }));

    await act(async () => {
      await hook.result.current.sendCode(DRAFT);
    });

    await waitFor(() => expect(hook.result.current.notSent).toBe(true));
    expect(hook.result.current.state.step).toBe('CHANNEL');
  });

  /*
    A stubbed medium reports nothing sent AND hands the code back, which is the
    one case that must still advance — that is the flow working as designed on a
    medium with no transport wired.
  */
  it('still advances when the server hands back a test code', async () => {
    const { hook } = setup(outcome({ sent: false, testCode: '123456' }));

    await act(async () => {
      await hook.result.current.sendCode(DRAFT);
    });

    await waitFor(() => expect(hook.result.current.state.step).toBe('CODE'));
    expect(hook.result.current.testCode).toBe('123456');
    expect(hook.result.current.notSent).toBe(false);
  });

  it('reports an unregistered destination without warning about delivery', async () => {
    const { hook } = setup(outcome({ registered: false, sent: false }));

    await act(async () => {
      await hook.result.current.sendCode(DRAFT);
    });

    await waitFor(() => expect(hook.result.current.notFound).toBe(true));
    expect(hook.result.current.notSent).toBe(false);
    expect(hook.result.current.state.step).toBe('CHANNEL');
  });

  it('clears a delivery warning when the channel changes', async () => {
    const { hook } = setup(outcome({ sent: false }));

    await act(async () => {
      await hook.result.current.sendCode(DRAFT);
    });
    await waitFor(() => expect(hook.result.current.notSent).toBe(true));

    act(() => hook.result.current.setChannel('PHONE'));

    expect(hook.result.current.notSent).toBe(false);
    expect(hook.result.current.state.channel).toBe('PHONE');
  });
});
