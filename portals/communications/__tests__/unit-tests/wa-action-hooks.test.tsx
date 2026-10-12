import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  loading: false,
  impls: new Map<string, (...a: unknown[]) => unknown>(),
  spies: new Map<string, ReturnType<typeof vi.fn>>(),
  notify: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

/** One stable spy per mutation operation name; behaviour is swapped per test. */
const spyFor = (doc: { definitions: Array<{ name?: { value: string } }> }) => {
  const name = doc.definitions[0].name?.value ?? '';
  if (!m.spies.has(name)) {
    m.spies.set(
      name,
      vi.fn().mockImplementation(async (...a: unknown[]) => (m.impls.get(name) ?? (() => ({ data: {} })))(...a))
    );
  }
  return m.spies.get(name)!;
};
const on = (name: string, impl: (...a: unknown[]) => unknown) => m.impls.set(name, impl);
const fail = (message: string) => () => {
  throw new Error(message);
};

vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: () => ({ data: m.data, loading: m.loading, error: m.error }),
  useMutation: (doc: Parameters<typeof spyFor>[0]) => [spyFor(doc), { loading: false }] as const,
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notify: m.notify,
  notifyError: m.notifyError,
  notifySuccess: m.notifySuccess,
}));
vi.mock('@duncit/app-settings', async (io) => ({
  ...(await io<typeof import('@duncit/app-settings')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { useWaCampaignActions } from '../../src/pages/whatsapp-page/useWaCampaignActions';
import { useWhatsappBoard } from '../../src/pages/whatsapp-page/wa-automation/useWhatsappBoard';
import { useAisensyDrafts } from '../../src/pages/whatsapp-page/wa-aisensy/useAisensyDrafts';
import type { WaCampaignRow } from '../../src/pages/whatsapp-page/queries';

beforeEach(() => {
  m.data = undefined;
  m.error = undefined;
  m.loading = false;
  m.impls.clear();
  m.spies.clear();
  m.notify.mockReset();
  m.notifyError.mockReset();
  m.notifySuccess.mockReset();
});

const row = { campaign_id: 'c1', name: 'Diwali' } as unknown as WaCampaignRow;

describe('useWaCampaignActions', () => {
  const mount = () => {
    const onChanged = vi.fn();
    return { onChanged, ...renderHook(() => useWaCampaignActions(onChanged)) };
  };

  it('sends a campaign, tells the operator, and asks the page to refresh', async () => {
    const { result, onChanged } = mount();
    let ok = false;
    await act(async () => {
      ok = await result.current.send({ name: 'x' } as never);
    });
    expect(ok).toBe(true);
    expect(m.spies.get('SendWaCampaign')).toHaveBeenCalledWith({ variables: { input: { name: 'x' } } });
    expect(m.notifySuccess).toHaveBeenCalledWith(expect.stringContaining('Campaign started'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('reports a failed send without refreshing', async () => {
    on('SendWaCampaign', fail('Quota exceeded'));
    const { result, onChanged } = mount();
    let ok = true;
    await act(async () => {
      ok = await result.current.send({} as never);
    });
    expect(ok).toBe(false);
    expect(m.notifyError).toHaveBeenCalledWith('Quota exceeded');
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('cancels and retries by campaign id, naming the row in the confirmation', async () => {
    const { result, onChanged } = mount();
    await act(async () => {
      await result.current.cancel(row);
      await result.current.retry(row);
    });
    expect(m.spies.get('CancelWaCampaign')).toHaveBeenCalledWith({ variables: { campaign_id: 'c1' } });
    expect(m.spies.get('RetryWaCampaign')).toHaveBeenCalledWith({ variables: { campaign_id: 'c1' } });
    expect(m.notifySuccess).toHaveBeenCalledWith(expect.stringContaining('Diwali'));
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('reports a failed cancel and a failed retry', async () => {
    on('CancelWaCampaign', fail('Already sent'));
    on('RetryWaCampaign', fail('Nothing to retry'));
    const { result, onChanged } = mount();
    await act(async () => {
      await result.current.cancel(row);
      await result.current.retry(row);
    });
    expect(m.notifyError).toHaveBeenNthCalledWith(1, 'Already sent');
    expect(m.notifyError).toHaveBeenNthCalledWith(2, 'Nothing to retry');
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('shows the AiSensy message id of a test send, and a failure when it does not go out', async () => {
    on('SendWaTestMessage', () => ({ data: { sendWaTestMessage: { submitted_message_id: 'mid-9' } } }));
    const { result } = mount();
    let ok = false;
    await act(async () => {
      ok = await result.current.testMessage({} as never);
    });
    expect(ok).toBe(true);
    expect(m.notifySuccess).toHaveBeenCalledWith('Test sent — message id mid-9');

    on('SendWaTestMessage', fail('Number not opted in'));
    await act(async () => {
      ok = await result.current.testMessage({} as never);
    });
    expect(ok).toBe(false);
    expect(m.notifyError).toHaveBeenCalledWith('Number not opted in');
  });

  it('still confirms a test send when AiSensy returns no message id', async () => {
    on('SendWaTestMessage', () => ({ data: { sendWaTestMessage: null } }));
    const { result } = mount();
    let ok = false;
    await act(async () => {
      ok = await result.current.testMessage({} as never);
    });
    expect(ok).toBe(true);
    expect(m.notifySuccess).toHaveBeenCalledWith('Test sent — message id ');
  });

  it('deletes a campaign and reports whether it went', async () => {
    const { result, onChanged } = mount();
    let ok = false;
    await act(async () => {
      ok = await result.current.remove(row);
    });
    expect(ok).toBe(true);
    expect(onChanged).toHaveBeenCalledTimes(1);

    on('DeleteWaCampaign', fail('In use'));
    await act(async () => {
      ok = await result.current.remove(row);
    });
    expect(ok).toBe(false);
    expect(m.notifyError).toHaveBeenCalledWith('In use');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('adds and removes campaign names, refreshing only when the server accepted', async () => {
    const { result, onChanged } = mount();
    await act(async () => {
      await result.current.addName({ name: 'diwali', description: '' } as never);
      await result.current.removeName({ id: 'n1', name: 'diwali' } as never);
    });
    expect(m.spies.get('DeleteWaCampaignName')).toHaveBeenCalledWith({ variables: { id: 'n1' } });
    expect(onChanged).toHaveBeenCalledTimes(2);

    on('CreateWaCampaignName', fail('Duplicate'));
    on('DeleteWaCampaignName', fail('Locked'));
    await act(async () => {
      await result.current.addName({ name: 'diwali' } as never);
      await result.current.removeName({ id: 'n1' } as never);
    });
    expect(m.notifyError).toHaveBeenCalledWith('Duplicate');
    expect(m.notifyError).toHaveBeenCalledWith('Locked');
    expect(onChanged).toHaveBeenCalledTimes(2);
  });
});

describe('useWhatsappBoard', () => {
  const board = (tag: string) => ({ rows: [{ event_key: tag }], tag });

  it('reads the board from the query and reports load and failure states', () => {
    m.loading = true;
    const loading = renderHook(() => useWhatsappBoard()).result.current;
    expect(loading.loading).toBe(true);
    expect(loading.board).toBeNull();

    m.loading = false;
    m.error = new Error('down');
    const failed = renderHook(() => useWhatsappBoard()).result.current;
    expect(failed.loadFailed).toBe(true);

    m.error = undefined;
    m.data = { whatsappScenarios: board('read') };
    const ok = renderHook(() => useWhatsappBoard()).result.current;
    expect(ok.board).toEqual(board('read'));
    expect(ok.loading).toBe(false);
    expect(ok.loadFailed).toBe(false);
  });

  it('keeps the board a write answered with, and clears the busy key afterwards', async () => {
    m.data = { whatsappScenarios: board('read') };
    on('SetWhatsappScenarioEnabled', () => ({
      data: { setWhatsappScenarioEnabled: board('toggled') },
    }));
    const { result } = renderHook(() => useWhatsappBoard());
    await act(async () => {
      await result.current.toggle('order_placed', true);
    });
    expect(m.spies.get('SetWhatsappScenarioEnabled')).toHaveBeenCalledWith({
      variables: { event_key: 'order_placed', enabled: true },
    });
    expect(result.current.board).toEqual(board('toggled'));
    expect(result.current.busyKey).toBeNull();
  });

  it('shows the failure and leaves the board alone when a toggle is refused', async () => {
    m.data = { whatsappScenarios: board('read') };
    on('SetWhatsappScenarioEnabled', fail('Blocked'));
    const { result } = renderHook(() => useWhatsappBoard());
    await act(async () => {
      await result.current.toggle('order_placed', false);
    });
    expect(m.notify).toHaveBeenCalledWith('Blocked', 'error');
    expect(result.current.board).toEqual(board('read'));
    expect(result.current.busyKey).toBeNull();
  });

  it('saves media and returns whether it stuck', async () => {
    on('SetWhatsappScenarioMedia', () => ({ data: { setWhatsappScenarioMedia: board('media') } }));
    const { result } = renderHook(() => useWhatsappBoard());
    let ok = false;
    await act(async () => {
      ok = await result.current.saveMedia('k', 'https://cdn.example.test/a.png', 'a.png');
    });
    expect(ok).toBe(true);
    expect(m.spies.get('SetWhatsappScenarioMedia')).toHaveBeenCalledWith({
      variables: { event_key: 'k', url: 'https://cdn.example.test/a.png', filename: 'a.png' },
    });
    expect(m.notify).toHaveBeenCalledWith('adminWhatsapp.mediaSaved', 'success');
    expect(result.current.board).toEqual(board('media'));

    on('SetWhatsappScenarioMedia', fail('Bad URL'));
    await act(async () => {
      ok = await result.current.saveMedia('k', 'x', '');
    });
    expect(ok).toBe(false);
    expect(m.notify).toHaveBeenCalledWith('Bad URL', 'error');
    expect(result.current.savingMedia).toBe(false);
  });

  it('says which step was provisioned, and reports a failure', async () => {
    on('ProvisionWhatsappScenario', () => ({
      data: { provisionWhatsappScenario: board('provisioned') },
    }));
    const { result } = renderHook(() => useWhatsappBoard());
    await act(async () => {
      await result.current.provision({ event_key: 'k', provision_step: 'CAMPAIGN' } as never);
    });
    expect(m.notify).toHaveBeenCalledWith('adminWhatsapp.provisionCampaignDone', 'success');
    await act(async () => {
      await result.current.provision({ event_key: 'k', provision_step: 'TEMPLATE' } as never);
    });
    expect(m.notify).toHaveBeenCalledWith('adminWhatsapp.provisionTemplateDone', 'success');

    on('ProvisionWhatsappScenario', fail('AiSensy refused'));
    await act(async () => {
      await result.current.provision({ event_key: 'k', provision_step: 'TEMPLATE' } as never);
    });
    expect(m.notify).toHaveBeenCalledWith('AiSensy refused', 'error');
    expect(result.current.busyKey).toBeNull();
  });

  it('reconciles the board, and reports a failed reconcile', async () => {
    on('ReconcileWhatsappScenarios', () => ({
      data: { reconcileWhatsappScenarios: board('reconciled') },
    }));
    const { result } = renderHook(() => useWhatsappBoard());
    await act(async () => {
      await result.current.runReconcile();
    });
    expect(result.current.board).toEqual(board('reconciled'));
    expect(m.notify).toHaveBeenCalledWith('adminWhatsapp.reconciled', 'success');

    on('ReconcileWhatsappScenarios', fail('Timeout'));
    await act(async () => {
      await result.current.runReconcile();
    });
    await waitFor(() => expect(result.current.reconciling).toBe(false));
    expect(m.notify).toHaveBeenCalledWith('Timeout', 'error');
  });
});

describe('useWhatsappBoard — a write that answers without a board', () => {
  it('keeps showing the board the query read, for every kind of write', async () => {
    m.data = { whatsappScenarios: { rows: [{ event_key: 'order_placed' }], tag: 'read' } };
    const { result } = renderHook(() => useWhatsappBoard());

    await act(async () => {
      await result.current.toggle('order_placed', true);
      await result.current.saveMedia('order_placed', 'https://cdn.example.test/a.png', 'a.png');
      await result.current.provision({ event_key: 'order_placed', provision_step: 'TEMPLATE' } as never);
      await result.current.runReconcile();
    });

    expect(result.current.board).toEqual({ rows: [{ event_key: 'order_placed' }], tag: 'read' });
    expect(m.notify).toHaveBeenCalledWith('adminWhatsapp.mediaSaved', 'success');
    expect(m.notify).toHaveBeenCalledWith('adminWhatsapp.reconciled', 'success');
    expect(m.notify).not.toHaveBeenCalledWith(expect.anything(), 'error');
  });
});

describe('useAisensyDrafts', () => {
  const mount = () => {
    const onChanged = vi.fn();
    return { onChanged, ...renderHook(() => useAisensyDrafts(onChanged)) };
  };

  it('appends AiSensy note to the submitted message when it sends one', async () => {
    on('CreateAisensyTemplate', () => ({ data: { createAisensyTemplate: { reason: 'Needs review' } } }));
    const { result, onChanged } = mount();
    let ok = false;
    await act(async () => {
      ok = await result.current.submitTemplate({ name: 't' } as never);
    });
    expect(ok).toBe(true);
    expect(m.notifySuccess).toHaveBeenCalledWith('marketingWhatsapp.templateSubmitted Needs review');
    expect(onChanged).toHaveBeenCalled();
  });

  it('shows the plain submitted message when AiSensy sends no note', async () => {
    const { result } = mount();
    await act(async () => {
      await result.current.submitTemplate({ name: 't' } as never);
    });
    expect(m.notifySuccess).toHaveBeenCalledWith('marketingWhatsapp.templateSubmitted');
  });

  it('reports a rejected template, campaign and delete without refreshing', async () => {
    on('CreateAisensyTemplate', fail('Template rejected'));
    on('CreateAisensyCampaign', fail('Campaign rejected'));
    on('DeleteAisensyTemplate', fail('Delete rejected'));
    const { result, onChanged } = mount();
    let a = true;
    let b = true;
    await act(async () => {
      a = await result.current.submitTemplate({} as never);
      b = await result.current.submitCampaign({} as never);
      await result.current.removeTemplate({ id: 't1' } as never);
    });
    expect([a, b]).toEqual([false, false]);
    expect(m.notifyError.mock.calls.map((c) => c[0])).toEqual([
      'Template rejected',
      'Campaign rejected',
      'Delete rejected',
    ]);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('creates a campaign and deletes a template by its AiSensy id', async () => {
    const { result, onChanged } = mount();
    let ok = false;
    await act(async () => {
      ok = await result.current.submitCampaign({ name: 'c' } as never);
      await result.current.removeTemplate({ id: 'tpl-7' } as never);
    });
    expect(ok).toBe(true);
    expect(m.spies.get('DeleteAisensyTemplate')).toHaveBeenCalledWith({
      variables: { template_id: 'tpl-7' },
    });
    expect(m.notifySuccess).toHaveBeenCalledWith('marketingWhatsapp.campaignCreated');
    expect(m.notifySuccess).toHaveBeenCalledWith('marketingWhatsapp.templateDeleted');
    expect(onChanged).toHaveBeenCalledTimes(2);
  });
});
