import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { GoogleAnalyticsSite } from '@duncit/gql-types';

const m = vi.hoisted(() => ({
  save: vi.fn(),
  del: vi.fn(),
  confirm: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useMutation: (doc: { definitions: Array<{ name?: { value: string } }> }) => [
      doc.definitions[0]?.name?.value === 'SaveGoogleAnalyticsSite' ? m.save : m.del,
      { loading: false },
    ],
  };
});
vi.mock('@duncit/dialogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/dialogs')>();
  return {
    ...actual,
    useConfirm: () => m.confirm,
    notifySuccess: m.notifySuccess,
    notifyError: m.notifyError,
  };
});

import GoogleAnalyticsDialog from '../../src/pages/google-analytics/GoogleAnalyticsDialog';
import { useGoogleAnalyticsActions } from '../../src/pages/google-analytics/useGoogleAnalyticsActions';
import {
  blankTag,
  googleAnalyticsSiteSchema,
  toForm,
} from '../../src/pages/google-analytics/google-analytics-site';

const row = (over: Partial<GoogleAnalyticsSite> = {}): GoogleAnalyticsSite =>
  ({
    site: 'MAIN',
    measurement_id: 'G-ABCDEF1234',
    enabled: true,
    ...over,
  }) as GoogleAnalyticsSite;

beforeEach(() => {
  vi.clearAllMocks();
  m.save.mockResolvedValue({});
  m.del.mockResolvedValue({});
});

describe('google-analytics-site types', () => {
  const schema = googleAnalyticsSiteSchema({ measurementIdInvalid: 'bad id' });

  it('upper-cases and trims a pasted measurement id before checking it', () => {
    const parsed = schema.safeParse({ site: 'MAIN', measurement_id: '  g-abcdef1234 ', enabled: true });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.measurement_id).toBe('G-ABCDEF1234');
  });

  it.each(['', 'UA-12345-1', 'G-123', 'G-ABCDEFGHIJKLMNOPQ'])('rejects %j with the supplied message', (id) => {
    const parsed = schema.safeParse({ site: 'MAIN', measurement_id: id, enabled: true });
    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0].message).toBe('bad id');
  });

  it('starts an untagged website switched on with an empty id', () => {
    expect(blankTag('ADS')).toEqual({ site: 'ADS', measurement_id: '', enabled: true });
  });

  it('edits an existing tag as stored, and a tag-less row as a blank one', () => {
    expect(toForm(row({ enabled: false }))).toEqual({ site: 'MAIN', measurement_id: 'G-ABCDEF1234', enabled: false });
    expect(toForm(row({ measurement_id: null, enabled: false }))).toEqual(blankTag('MAIN'));
  });
});

describe('GoogleAnalyticsDialog', () => {
  const state = (over = {}) => ({
    siteOptions: ['MAIN', 'ADS'] as const,
    lockSite: false,
    initial: blankTag('MAIN'),
    ...over,
  });
  const mount = (props: Record<string, unknown> = {}) => {
    const p = {
      state: state(),
      saving: false,
      opError: null,
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      ...props,
    };
    render(<GoogleAnalyticsDialog {...(p as React.ComponentProps<typeof GoogleAnalyticsDialog>)} />);
    return p;
  };
  const idInput = () => screen.getByTestId('google-analytics-site-measurement-id').querySelector('input') as HTMLInputElement;

  it('submits the normalised id for a valid tag', async () => {
    const p = mount();
    fireEvent.change(idInput(), { target: { value: 'g-abcdef1234' } });
    fireEvent.click(screen.getByTestId('google-analytics-site-save'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledTimes(1));
    expect(p.onSubmit.mock.calls[0][0]).toEqual({ site: 'MAIN', measurement_id: 'G-ABCDEF1234', enabled: true });
  });

  it('blocks an invalid id and says why', async () => {
    const p = mount();
    fireEvent.change(idInput(), { target: { value: 'UA-1' } });
    fireEvent.click(screen.getByTestId('google-analytics-site-save'));
    await waitFor(() => expect(idInput()).toHaveAttribute('aria-invalid', 'true'));
    expect(p.onSubmit).not.toHaveBeenCalled();
  });

  it('carries the enabled switch into the saved tag', async () => {
    const p = mount();
    fireEvent.change(idInput(), { target: { value: 'G-ABCDEF1234' } });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByTestId('google-analytics-site-save'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalled());
    expect(p.onSubmit.mock.calls[0][0].enabled).toBe(false);
  });

  it('shows the server error returned by the save', () => {
    mount({ opError: 'Measurement id already used' });
    expect(screen.getByTestId('google-analytics-site-error')).toHaveTextContent('Measurement id already used');
  });

  it('titles and locks the picker differently when editing', () => {
    mount({ state: state({ lockSite: true, siteOptions: ['MAIN'], initial: toForm(row()) }) });
    expect(screen.getByTestId('google-analytics-dialog')).toBeInTheDocument();
    expect(idInput().value).toBe('G-ABCDEF1234');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('useGoogleAnalyticsActions', () => {
  const sites = [
    row({ site: 'MAIN' }),
    row({ site: 'ADS', measurement_id: null, enabled: false }),
    row({ site: 'STATUS', measurement_id: null, enabled: false }),
  ];

  it('offers only untagged websites for a new tag, starting from the first', () => {
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    expect(result.current.canAdd).toBe(true);
    act(() => result.current.openCreate());
    expect(result.current.dialog).toEqual({
      siteOptions: ['ADS', 'STATUS'],
      lockSite: false,
      initial: blankTag('ADS'),
    });
  });

  it('refuses to open the create dialog when every website is tagged', () => {
    const { result } = renderHook(() => useGoogleAnalyticsActions([row()]));
    expect(result.current.canAdd).toBe(false);
    act(() => result.current.openCreate());
    expect(result.current.dialog).toBeNull();
  });

  it('opens an edit locked to the row and closes again', () => {
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    act(() => result.current.openEdit(sites[0]));
    expect(result.current.dialog).toMatchObject({ lockSite: true, siteOptions: ['MAIN'] });
    act(() => result.current.close());
    expect(result.current.dialog).toBeNull();
  });

  it('saves, closes the dialog and confirms', async () => {
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    act(() => result.current.openCreate());
    const input = { site: 'ADS', measurement_id: 'G-ABCDEF1234', enabled: true } as const;
    await act(async () => {
      await result.current.submit(input);
    });
    expect(m.save).toHaveBeenCalledWith({ variables: { input } });
    expect(result.current.dialog).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(m.notifySuccess).toHaveBeenCalled();
  });

  it('keeps the dialog open and shows the server message when saving fails', async () => {
    m.save.mockRejectedValue(new Error('Measurement id already used'));
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    act(() => result.current.openCreate());
    await act(async () => {
      await result.current.submit({ site: 'ADS', measurement_id: 'G-ABCDEF1234', enabled: true });
    });
    expect(result.current.opError).toBe('Measurement id already used');
    expect(result.current.dialog).not.toBeNull();
    expect(m.notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to a generic message for a non-Error rejection', async () => {
    m.save.mockRejectedValue('boom');
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    await act(async () => {
      await result.current.submit({ site: 'ADS', measurement_id: 'G-ABCDEF1234', enabled: true });
    });
    expect(typeof result.current.opError).toBe('string');
    expect(result.current.opError).not.toBe('');
  });

  it('removes a tag only after confirmation', async () => {
    m.confirm.mockResolvedValue(true);
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    await act(async () => {
      await result.current.remove(sites[0]);
    });
    expect(m.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    expect(m.del).toHaveBeenCalledWith({ variables: { site: 'MAIN' } });
    expect(m.notifySuccess).toHaveBeenCalled();
  });

  it('leaves the tag alone when the confirmation is declined', async () => {
    m.confirm.mockResolvedValue(false);
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    await act(async () => {
      await result.current.remove(sites[0]);
    });
    expect(m.del).not.toHaveBeenCalled();
  });

  it('reports a failed removal, with a fallback for non-Error rejections', async () => {
    m.confirm.mockResolvedValue(true);
    m.del.mockRejectedValueOnce(new Error('gone wrong'));
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    await act(async () => {
      await result.current.remove(sites[0]);
    });
    expect(m.notifyError).toHaveBeenLastCalledWith('gone wrong');
    m.del.mockRejectedValueOnce('nope');
    await act(async () => {
      await result.current.remove(sites[0]);
    });
    expect(m.notifyError).toHaveBeenCalledTimes(2);
    expect(m.notifyError.mock.calls[1][0]).not.toBe('nope');
  });

  it('copes with a row whose tag has no id when confirming removal', async () => {
    m.confirm.mockResolvedValue(false);
    const { result } = renderHook(() => useGoogleAnalyticsActions(sites));
    await act(async () => {
      await result.current.remove(sites[1]);
    });
    expect(m.confirm).toHaveBeenCalled();
  });
});
