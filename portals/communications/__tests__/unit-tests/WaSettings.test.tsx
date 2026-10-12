import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  pricing: undefined as unknown,
  media: undefined as unknown,
  pricingLoading: false,
  pricingError: undefined as unknown,
  mediaLoading: false,
  mediaError: undefined as unknown,
  runners: new Map<string, ReturnType<typeof vi.fn>>(),
  refetch: vi.fn(),
  notify: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
const opName = (doc: { definitions: Array<{ name?: { value: string } }> }) =>
  doc.definitions[0].name?.value ?? '';
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (doc: Parameters<typeof opName>[0]) =>
    opName(doc) === 'WaPricing'
      ? {
          data: m.pricing ? { waPricing: m.pricing } : undefined,
          loading: m.pricingLoading,
          error: m.pricingError,
          refetch: m.refetch,
        }
      : {
          data: m.media ? { whatsappDefaultMedia: m.media } : undefined,
          loading: m.mediaLoading,
          error: m.mediaError,
          refetch: m.refetch,
        },
  useMutation: (doc: Parameters<typeof opName>[0]) => {
    const name = opName(doc);
    if (!m.runners.has(name)) m.runners.set(name, vi.fn().mockResolvedValue({ data: {} }));
    return [m.runners.get(name), {}] as const;
  },
}));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notify: m.notify,
  notifyError: m.notifyError,
  notifySuccess: m.notifySuccess,
}));
vi.mock('@duncit/media-picker', () => ({
  SingleImageUploadField: (p: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    helperText?: string;
  }) => (
    <label>
      {p.label}
      <input value={p.value} onChange={(e) => p.onChange(e.target.value)} />
      <span>{p.helperText}</span>
    </label>
  ),
}));

import WaSettings from '../../src/pages/whatsapp-page/wa-settings';

const pricing = {
  marketing_per_msg: 0.785,
  utility_per_msg: 0.145,
  authentication_per_msg: 0.145,
  service_per_msg: 0,
  currency_symbol: '₹',
};

const mount = (over: Record<string, unknown> = {}) => {
  const h = { onAddName: vi.fn().mockResolvedValue(undefined), onDeleteName: vi.fn() };
  renderWithProviders(
    <WaSettings
      names={[
        { id: 'n1', name: 'diwali_camp', description: 'Festival' },
        { id: 'n2', name: 'bare_camp', description: '' },
      ]}
      namesBusy={false}
      {...h}
      {...over}
    />
  );
  return h;
};

beforeEach(() => {
  m.pricing = pricing;
  m.media = { url: '', filename: '', document_url: '', document_filename: '' };
  m.pricingLoading = false;
  m.pricingError = undefined;
  m.mediaLoading = false;
  m.mediaError = undefined;
  m.runners.clear();
  m.refetch.mockReset().mockResolvedValue({});
  m.notify.mockReset();
  m.notifyError.mockReset();
  m.notifySuccess.mockReset();
});

describe('WaSettings - pricing', () => {
  it('shows the saved rates and what 1,000 messages would cost', () => {
    mount();
    expect(screen.getByLabelText(/Marketing — per message/)).toHaveValue('0.785');
    expect(screen.getByText(/Marketing ₹785\.00/)).toBeInTheDocument();
  });

  it('saves edited rates as numbers and reports success', async () => {
    mount();
    fireEvent.change(screen.getByLabelText(/Marketing — per message/), { target: { value: '0.9' } });
    const save = screen.getByRole('button', { name: 'Save rates' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(m.runners.get('UpdateWaPricing')).toHaveBeenCalled());
    expect(m.runners.get('UpdateWaPricing')!.mock.calls[0][0].variables.input).toEqual({
      marketing_per_msg: 0.9,
      utility_per_msg: 0.145,
      authentication_per_msg: 0.145,
      service_per_msg: 0,
      currency_symbol: '₹',
    });
    await waitFor(() =>
      expect(m.notifySuccess).toHaveBeenCalledWith('Rates saved — they apply to sends from now on')
    );
    expect(m.refetch).toHaveBeenCalled();
  });

  it('refuses a negative or blank rate', async () => {
    mount();
    fireEvent.change(screen.getByLabelText(/Utility — per message/), { target: { value: '-1' } });
    expect(await screen.findByText('Utility rate must be zero or more')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save rates' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Utility — per message/), { target: { value: '' } });
    expect(await screen.findByText('Utility rate is required')).toBeInTheDocument();
  });

  it('reports a rejected save', async () => {
    m.runners.set('UpdateWaPricing', vi.fn().mockRejectedValue(new Error('Not allowed')));
    mount();
    fireEvent.change(screen.getByLabelText(/Marketing — per message/), { target: { value: '1' } });
    const save = screen.getByRole('button', { name: 'Save rates' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('Not allowed'));
  });

  it('shows a spinner while loading and an error when the rates cannot be read', () => {
    m.pricing = undefined;
    m.pricingLoading = true;
    const { unmount } = renderWithProviders(
      <WaSettings names={[]} namesBusy={false} onAddName={vi.fn()} onDeleteName={vi.fn()} />
    );
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    unmount();

    m.pricingLoading = false;
    m.pricingError = new Error('Rates down');
    renderWithProviders(
      <WaSettings names={[]} namesBusy={false} onAddName={vi.fn()} onDeleteName={vi.fn()} />
    );
    expect(screen.getByText('Rates down')).toBeInTheDocument();
  });
});

describe('WaSettings - campaign names', () => {
  it('lists saved names and removes one by name', () => {
    const h = mount();
    expect(screen.getByText('Festival')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove diwali_camp' }));
    expect(h.onDeleteName).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
  });

  it('says when nothing is saved yet', () => {
    mount({ names: [] });
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('adds a name and resets the form', async () => {
    const h = mount();
    const name = screen.getByLabelText(/Campaign name/);
    fireEvent.change(name, { target: { value: 'holi_camp' } });
    const add = screen.getByRole('button', { name: 'Add' });
    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);
    await waitFor(() =>
      expect(h.onAddName).toHaveBeenCalledWith({ name: 'holi_camp', description: '' })
    );
    await waitFor(() => expect(name).toHaveValue(''));
  });

  it('keeps Add disabled for a blank name', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});

describe('WaSettings - default media', () => {
  it('warns that scenarios fail until a default exists, once the read has answered', () => {
    mount();
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(2);
  });

  it('saves an image default and refreshes', async () => {
    mount();
    fireEvent.change(screen.getByLabelText(/Header image/), {
      target: { value: 'https://cdn.example.test/default.png' },
    });
    const save = screen.getAllByRole('button', { name: 'Save default' })[0];
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(m.runners.get('SetWhatsappDefaultMedia')).toHaveBeenCalled());
    expect(m.runners.get('SetWhatsappDefaultMedia')!.mock.calls[0][0].variables).toMatchObject({
      kind: 'IMAGE',
      url: 'https://cdn.example.test/default.png',
    });
    await waitFor(() =>
      expect(m.notify).toHaveBeenCalledWith('Default header image saved.', 'success')
    );
    expect(m.refetch).toHaveBeenCalled();
  });

  it('shows the read error', () => {
    m.mediaError = new Error('Media read failed');
    mount();
    expect(screen.getByText('Media read failed')).toBeInTheDocument();
  });

  it('reports a refused document save without refreshing', async () => {
    m.runners.set('SetWhatsappDefaultMedia', vi.fn().mockRejectedValue(new Error('Write refused')));
    mount();
    fireEvent.change(screen.getByLabelText('Header document URL'), {
      target: { value: 'https://cdn.example.test/policy.pdf' },
    });
    const save = screen.getAllByRole('button', { name: 'Save default' })[1];
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Write refused', 'error'));
    expect(m.refetch).not.toHaveBeenCalled();
  });

  it('clears a saved default', async () => {
    m.media = {
      url: 'https://cdn.example.test/default.png',
      filename: '',
      document_url: 'https://cdn.example.test/policy.pdf',
      document_filename: 'policy.pdf',
    };
    mount();
    const clears = screen.getAllByRole('button', { name: 'Clear default' });
    expect(clears).toHaveLength(2);
    fireEvent.click(clears[1]);
    await waitFor(() =>
      expect(m.runners.get('SetWhatsappDefaultMedia')!.mock.calls[0][0].variables).toEqual({
        kind: 'DOCUMENT',
        url: '',
        filename: '',
      })
    );
  });

  it('refuses a document link that is not public', async () => {
    mount();
    fireEvent.change(screen.getByLabelText('Header document URL'), {
      target: { value: '/relative.pdf' },
    });
    expect(
      await screen.findByText('Use a full public link that starts with http:// or https://')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Save default' })[1]).toBeDisabled();
  });
});
