import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBoard, makeScenario } from '../mocks/whatsapp.mock';
import { renderWithProviders } from '../testkit';

const m = vi.hoisted(() => ({
  hook: {} as Record<string, unknown>,
}));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-stub')).StubTable,
}));
vi.mock('../../src/pages/whatsapp-page/wa-automation/useWhatsappBoard', () => ({
  useWhatsappBoard: () => m.hook,
}));

import WaAutomation from '../../src/pages/whatsapp-page/wa-automation';

const hook = (over: Record<string, unknown> = {}) => ({
  board: makeBoard(),
  loading: false,
  loadFailed: false,
  busyKey: null,
  reconciling: false,
  savingMedia: false,
  toggle: vi.fn(),
  saveMedia: vi.fn().mockResolvedValue(true),
  provision: vi.fn(),
  runReconcile: vi.fn(),
  ...over,
});

beforeEach(() => {
  m.hook = hook();
});

describe('WaAutomation page', () => {
  it('lists the scenarios and says the board is healthy when nothing blocks a send', async () => {
    renderWithProviders(<WaAutomation />);
    expect(await screen.findByTestId('row-order_placed')).toBeInTheDocument();
    expect(screen.getByText('Every scenario is wired and ready to send.')).toBeInTheDocument();
  });

  it('shows the empty text for a board with no scenarios', async () => {
    m.hook = hook({ board: makeBoard({ rows: [] }) });
    renderWithProviders(<WaAutomation />);
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.queryByTestId('row-order_placed')).not.toBeInTheDocument();
  });

  it('warns when WhatsApp is switched off, and not before the board answers', async () => {
    m.hook = hook({ board: null, loading: true });
    const { unmount } = renderWithProviders(<WaAutomation />);
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();

    m.hook = hook({ board: makeBoard({ global_enabled: false }) });
    renderWithProviders(<WaAutomation />);
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
  });

  it('shows the load failure', async () => {
    m.hook = hook({ board: null, loadFailed: true });
    renderWithProviders(<WaAutomation />);
    expect(await screen.findAllByRole('alert')).toHaveLength(1);
  });

  it('shows AiSensy own reason when the catalogue cannot be read', async () => {
    m.hook = hook({
      board: makeBoard({ catalogue_ok: false, catalogue_error: 'Invalid project key' }),
    });
    renderWithProviders(<WaAutomation />);
    expect(await screen.findByText(/Invalid project key/)).toBeInTheDocument();
  });

  it('warns once when media rows would fall through to a default nobody set', async () => {
    m.hook = hook({
      board: makeBoard({
        rows: [makeScenario({
            needs_media: true,
            template_header_format: 'VIDEO',
            blocker: 'Media URL Missing',
          })],
      }),
    });
    renderWithProviders(<WaAutomation />);
    expect(await screen.findAllByRole('alert')).toHaveLength(1);
  });

  it('turns WhatsApp off through the global switch and reconciles on demand', async () => {
    const toggle = vi.fn();
    const runReconcile = vi.fn();
    m.hook = hook({ toggle, runReconcile });
    renderWithProviders(<WaAutomation />);
    await screen.findByTestId('row-order_placed');
    const global = screen.getAllByRole('switch').find((s) => !s.getAttribute('aria-label')?.includes('order_placed'))!;
    fireEvent.click(global);
    expect(toggle).toHaveBeenCalledWith('__global__', false);
    fireEvent.click(screen.getAllByRole('button').find((b) => /reconcile/i.test(b.textContent ?? ''))!);
    expect(runReconcile).toHaveBeenCalled();
  });

  it('opens the media dialog for a row and closes it once the save stuck', async () => {
    const saveMedia = vi.fn().mockResolvedValue(true);
    m.hook = hook({
      saveMedia,
      board: makeBoard({ rows: [makeScenario({ needs_media: true })] }),
    });
    renderWithProviders(<WaAutomation />);
    const row = await screen.findByTestId('row-order_placed');
    fireEvent.click(within(row).getByRole('button', { name: /set|media/i }));
    const dialog = await screen.findByRole('dialog');
    const url = within(dialog).getAllByRole('textbox')[0];
    fireEvent.change(url, { target: { value: 'https://cdn.example.test/a.png' } });
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);
    await waitFor(() =>
      expect(saveMedia).toHaveBeenCalledWith('order_placed', 'https://cdn.example.test/a.png', '')
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the media dialog on Cancel without saving anything', async () => {
    const saveMedia = vi.fn();
    m.hook = hook({ saveMedia, board: makeBoard({ rows: [makeScenario({ needs_media: true })] }) });
    renderWithProviders(<WaAutomation />);
    const row = await screen.findByTestId('row-order_placed');
    fireEvent.click(within(row).getByRole('button', { name: /set|media/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(saveMedia).not.toHaveBeenCalled();
  });

  it('keeps the dialog open when the save did not stick', async () => {
    const saveMedia = vi.fn().mockResolvedValue(false);
    m.hook = hook({ saveMedia, board: makeBoard({ rows: [makeScenario({ needs_media: true })] }) });
    renderWithProviders(<WaAutomation />);
    const row = await screen.findByTestId('row-order_placed');
    fireEvent.click(within(row).getByRole('button', { name: /set|media/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], {
      target: { value: 'https://cdn.example.test/a.png' },
    });
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);
    await waitFor(() => expect(saveMedia).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
