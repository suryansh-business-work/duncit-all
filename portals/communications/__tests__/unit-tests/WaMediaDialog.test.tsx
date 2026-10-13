import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MediaDialog from '../../src/pages/whatsapp-page/wa-automation/MediaDialog';
import GlobalSwitchCard from '../../src/pages/whatsapp-page/wa-automation/GlobalSwitchCard';
import { makeScenario } from '../mocks/whatsapp.mock';
import { renderWithProviders } from '../testkit';

const show = (scenario: ReturnType<typeof makeScenario> | null, over = {}) => {
  const handlers = { onClose: vi.fn(), onSave: vi.fn() };
  renderWithProviders(
    <MediaDialog scenario={scenario} saving={false} {...handlers} {...over} />
  );
  return handlers;
};

describe('MediaDialog', () => {
  it('stays closed without a scenario', () => {
    show(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts from the override, then the campaign asset, and saves the edited pair', async () => {
    const { onSave } = show(
      makeScenario({
        media_url: 'https://cdn.example.test/campaign.png',
        override_media_url: '',
        override_media_filename: 'old.png',
      })
    );
    const dialog = await screen.findByRole('dialog');
    const [url, filename] = within(dialog).getAllByRole('textbox');
    await waitFor(() => expect(url).toHaveValue('https://cdn.example.test/campaign.png'));
    expect(filename).toHaveValue('old.png');

    fireEvent.change(url, { target: { value: ' https://cdn.example.test/new.png ' } });
    fireEvent.change(filename, { target: { value: 'new.png' } });
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('order_placed', 'https://cdn.example.test/new.png', 'new.png')
    );
  });

  it('refuses a relative or non-public URL and does not save', async () => {
    const { onSave } = show(makeScenario());
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: '/uploads/a.png' } });
    fireEvent.click(within(dialog).getAllByRole('button').at(-1)!);
    await waitFor(() => expect(within(dialog).getAllByRole('textbox')[0]).toBeInvalid());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('clears an existing override with an empty pair', async () => {
    const { onSave } = show(
      makeScenario({ override_media_url: 'https://cdn.example.test/o.png', override_media_filename: 'o' })
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear custom asset' }));
    expect(onSave).toHaveBeenCalledWith('order_placed', '', '');
  });

  it('offers no clear when there is no override, and closes on cancel', async () => {
    const { onClose } = show(makeScenario());
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Clear custom asset' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables the save while a write is in flight', async () => {
    show(makeScenario({ override_media_url: 'https://cdn.example.test/o.png' }), { saving: true });
    const dialog = await screen.findByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    expect(buttons.at(-1)).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Clear custom asset' })).toBeDisabled();
  });
});

describe('GlobalSwitchCard', () => {
  const card = (over = {}) => {
    const handlers = { onToggle: vi.fn(), onReconcile: vi.fn() };
    renderWithProviders(
      <GlobalSwitchCard enabled busy={false} reconciling={false} {...handlers} {...over} />
    );
    return handlers;
  };

  it('reports the next state when the switch is flipped', () => {
    const { onToggle } = card();
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('turns it on from the off state', () => {
    const { onToggle } = card({ enabled: false });
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('runs a reconcile and locks both controls while busy', () => {
    const { onReconcile } = card();
    fireEvent.click(screen.getByRole('button'));
    expect(onReconcile).toHaveBeenCalledTimes(1);
  });

  it('disables the controls while a write is in flight', () => {
    card({ busy: true, reconciling: true });
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
