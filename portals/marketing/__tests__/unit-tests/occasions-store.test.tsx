import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  makeStoreOccasion,
  saveStoreOccasionsErrorMock,
  saveStoreOccasionsMock,
  storeOccasionsErrorMock,
  storeOccasionsMock,
} from '../mocks/occasions-live.mock';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const now = () => NOW;
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}`, now }),
}));
vi.mock('../../src/components/DateTimeField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).DateTimeFieldStub,
}));
vi.mock('../../src/components/MediaPickerField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).MediaPickerFieldStub,
}));

import { urlConfigs } from '../../src/config/url-configs';
import StoreOccasionsTab from '../../src/pages/occasions-page/store/StoreOccasionsTab';
import {
  MAX_STORE_OCCASIONS,
  StoreOccasionsForm,
  isStoreOccasionLive,
  toStoreInput,
  toStoreValues,
} from '../../src/pages/occasions-page/store/store-occasions-form';

afterEach(() => {
  vi.clearAllMocks();
});

const occasion = (n: number) => within(screen.getByRole('group', { name: `Occasion ${n}` }));
const saveButton = () => screen.getByTestId('store-occasions-save');
/** Save comes on once the form has checked the edit, as it does for a person; only then is it pressed. */
const pressSave = async () => {
  await waitFor(() => expect(saveButton()).toBeEnabled());
  fireEvent.click(saveButton());
};
const SALE = makeStoreOccasion();
const HOLI = makeStoreOccasion({
  slug: 'holi',
  label: 'Holi sale',
  theme: 'HOLI',
  starts_at: '2027-03-01T00:00:00.000Z',
  ends_at: '2027-03-05T00:00:00.000Z',
});

describe('isStoreOccasionLive', () => {
  const open = { starts_at: '2026-11-01T00:00:00.000Z', ends_at: '2026-11-05T00:00:00.000Z', is_active: true };

  it('is on only while switched on and inside its window, the end itself excluded', () => {
    expect(isStoreOccasionLive(open, NOW)).toBe(true);
    expect(isStoreOccasionLive({ ...open, starts_at: NOW.toISOString() }, NOW)).toBe(true);
    expect(isStoreOccasionLive({ ...open, ends_at: NOW.toISOString() }, NOW)).toBe(false);
    expect(isStoreOccasionLive({ ...open, starts_at: '2026-11-04T00:00:00.000Z' }, NOW)).toBe(false);
    expect(isStoreOccasionLive({ ...open, is_active: false }, NOW)).toBe(false);
    expect(isStoreOccasionLive({ ...open, starts_at: '' }, NOW)).toBe(false);
    expect(isStoreOccasionLive({ ...open, ends_at: '' }, NOW)).toBe(false);
  });
});

describe('toStoreValues / toStoreInput', () => {
  it('keeps only the input fields and sends the dates as ISO', () => {
    const values = toStoreValues([{ ...SALE, __typename: 'StoreOccasion' } as typeof SALE]);
    expect(values.occasions[0]).toEqual(SALE);
    expect(values.occasions[0]).not.toHaveProperty('__typename');
    expect(toStoreInput({ occasions: [{ ...values.occasions[0], starts_at: '2026-11-01T05:30:00+05:30' }] })[0].starts_at).toBe(
      '2026-11-01T00:00:00.000Z',
    );
  });
});

describe('StoreOccasionsForm', () => {
  const open = (rows = [SALE], onSubmit = vi.fn().mockResolvedValue(undefined)) => {
    renderWithProviders(<StoreOccasionsForm occasions={rows} onSubmit={onSubmit} />);
    return onSubmit;
  };

  it('shows each window with what the store wears, marks the one open now, and keeps Save off until a change', () => {
    open([SALE, HOLI]);
    const first = occasion(1);
    expect(first.getByRole('heading', { level: 3, name: 'Occasion 1' })).toBeInTheDocument();
    expect(first.getByText('Live now')).toBeInTheDocument();
    expect(occasion(2).queryByText('Live now')).not.toBeInTheDocument();
    expect(first.getByLabelText(/^Name/)).toHaveValue('Diwali sale');
    expect(first.getByLabelText(/^Key/)).toHaveValue('diwali');
    expect(first.getByLabelText('Starts')).toHaveValue('2026-11-01T00:00:00.000Z');
    expect(first.getByLabelText('Ends')).toHaveValue('2026-11-05T00:00:00.000Z');
    expect(first.getByRole('combobox')).toHaveTextContent('Diwali: lights and diyas');
    expect(first.getByLabelText(/^Greeting/)).toHaveValue('Happy Diwali');
    expect(first.getByLabelText(/^Greeting/)).toHaveAttribute('maxlength', '80');
    expect(first.getByLabelText('Animation on')).toBeChecked();
    expect(first.getByLabelText('Logo')).toHaveValue('/store/occasions/logo.png');
    expect(first.getByTestId('media-Logo')).toHaveAttribute('data-folder', '/store/occasions');
    expect(first.getByLabelText('Favicon')).toHaveValue('');
    expect(first.getByLabelText('Background image')).toHaveValue('https://cdn.example.com/bg.png');
    expect(first.getByLabelText(/^Background colour/)).toHaveValue('#FFF4E5');
    expect(first.getByLabelText(/^Announcement text/)).toHaveValue('Free delivery all week');
    expect(first.getByLabelText('Active')).toBeChecked();
    expect(first.getByLabelText(/^Order/)).toHaveValue(0);
    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveTextContent('Save store occasions');
  });

  it('previews the chosen look on the store in a new tab', async () => {
    open();
    const preview = occasion(1).getByRole('link', { name: 'Preview Occasion 1 on the store (opens in a new tab)' });
    expect(preview).toHaveAttribute('href', `${urlConfigs.storeUrl}/?occasion=DIWALI`);
    expect(preview).toHaveAttribute('target', '_blank');
    fireEvent.mouseDown(occasion(1).getByRole('combobox'));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Holi: colour splashes' }));
    await waitFor(() => expect(preview).toHaveAttribute('href', `${urlConfigs.storeUrl}/?occasion=HOLI`));
  });

  it('takes the live mark away once the window is switched off', async () => {
    open();
    fireEvent.click(occasion(1).getByLabelText('Active'));
    await waitFor(() => expect(occasion(1).queryByText('Live now')).not.toBeInTheDocument());
    expect(saveButton()).toBeEnabled();
  });

  it('moves windows up and down, never past either end, and removes one by name', () => {
    open([SALE, HOLI]);
    expect(occasion(1).getByRole('button', { name: 'Move up' })).toBeDisabled();
    expect(occasion(1).getByRole('button', { name: 'Move down' })).toBeEnabled();
    expect(occasion(2).getByRole('button', { name: 'Move down' })).toBeDisabled();
    fireEvent.click(occasion(1).getByRole('button', { name: 'Move down' }));
    expect(occasion(1).getByLabelText(/^Name/)).toHaveValue('Holi sale');
    expect(occasion(2).getByLabelText(/^Name/)).toHaveValue('Diwali sale');
    fireEvent.click(occasion(2).getByRole('button', { name: 'Move up' }));
    expect(occasion(1).getByLabelText(/^Name/)).toHaveValue('Diwali sale');
    fireEvent.click(occasion(1).getByRole('button', { name: 'Remove Occasion 1' }));
    expect(screen.getAllByTestId('store-occasion-row')).toHaveLength(1);
    expect(occasion(1).getByLabelText(/^Name/)).toHaveValue('Holi sale');
  });

  it('checks names, links, colours, lengths, dates and order as they are typed', async () => {
    open();
    const r = occasion(1);
    fireEvent.change(r.getByLabelText(/^Name/), { target: { value: ' ' } });
    expect(await r.findByText('This is required.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText(/^Key/), { target: { value: 'k'.repeat(61) } });
    expect(await r.findByText('This is too long.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText('Logo'), { target: { value: 'ftp://cdn.example.com/logo.png' } });
    expect(await r.findByText('Use a path on the store or a full https:// link.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText(/^Background colour/), { target: { value: 'orange' } });
    expect(await r.findByText('Enter a hex colour, such as #FFF4E5.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText(/^Background colour/), { target: { value: '#fa0' } });
    await waitFor(() => expect(r.queryByText('Enter a hex colour, such as #FFF4E5.')).not.toBeInTheDocument());
    fireEvent.change(r.getByLabelText('Ends'), { target: { value: '2026-10-01T00:00:00.000Z' } });
    expect(await r.findByText('It must end after it starts.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText(/^Order/), { target: { value: '1.5' } });
    expect(await r.findByText('Enter a whole number.')).toBeInTheDocument();
  });

  it('starts empty with a prompt, adds a blank window, and will not save it unfilled', async () => {
    const onSubmit = open([]);
    expect(screen.getByText('No store occasions yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add store occasion' }));
    const r = occasion(1);
    expect(r.getByRole('combobox')).toHaveTextContent('None (the house look)');
    expect(r.getByLabelText('Animation on')).toBeChecked();
    expect(r.getByLabelText('Active')).toBeChecked();
    expect(r.getByLabelText(/^Order/)).toHaveValue(0);
    // A blank window is not live, whatever the clock says.
    expect(r.queryByText('Live now')).not.toBeInTheDocument();
    fireEvent.click(saveButton());
    expect(await r.findAllByText('This is required.')).toHaveLength(3);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // Twenty full rows take a while to mount on a CI runner.
  it('stops adding at the most windows the editor keeps', { timeout: 20_000 }, () => {
    open(Array.from({ length: MAX_STORE_OCCASIONS }, (_, i) => makeStoreOccasion({ slug: `s-${i}`, label: `Sale ${i}` })));
    expect(screen.getByRole('button', { name: 'Add store occasion' })).toBeDisabled();
  });

  it('sends every window and says it is saving until the answer comes', async () => {
    let finish: () => void = () => undefined;
    const onSubmit = open(
      [SALE],
      vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    fireEvent.change(occasion(1).getByLabelText(/^Greeting/), { target: { value: '  Shubh Deepavali  ' } });
    // Enter in a field does not post the form; only Save does.
    fireEvent.submit(screen.getByTestId('store-occasions-form'));
    expect(onSubmit).not.toHaveBeenCalled();
    await pressSave();
    await waitFor(() => expect(saveButton()).toHaveTextContent('Saving…'));
    expect(onSubmit).toHaveBeenCalledWith([{ ...SALE, greeting: 'Shubh Deepavali' }]);
    finish();
    await waitFor(() => expect(saveButton()).toHaveTextContent('Save store occasions'));
  });
});

describe('StoreOccasionsTab', () => {
  const renderTab = (mocks: MockedResponse[]) => renderWithProviders(<StoreOccasionsTab />, { mocks });

  it('waits for the windows, then shows them', async () => {
    renderTab([storeOccasionsMock([SALE])]);
    expect(screen.getByText('Ecomm store occasions')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: 'Occasion 1' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows why the windows could not be read', async () => {
    renderTab([storeOccasionsErrorMock('store is down')]);
    expect(await screen.findByText('store is down')).toBeInTheDocument();
    expect(screen.queryByTestId('store-occasions-form')).not.toBeInTheDocument();
  });

  it('saves the changed windows, says so and reads them again', async () => {
    const saved = [makeStoreOccasion({ sort_order: 3 })];
    renderTab([storeOccasionsMock([SALE]), saveStoreOccasionsMock(saved), storeOccasionsMock(saved)]);
    fireEvent.change(await screen.findByLabelText(/^Order/), { target: { value: '3' } });
    await pressSave();
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Store occasions saved.', 'success'));
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(screen.getByLabelText(/^Order/)).toHaveValue(3);
  });

  it('reports a save the server refused', async () => {
    renderTab([storeOccasionsMock([SALE]), saveStoreOccasionsErrorMock([makeStoreOccasion({ sort_order: 4 })], 'not allowed')]);
    fireEvent.change(await screen.findByLabelText(/^Order/), { target: { value: '4' } });
    await pressSave();
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('not allowed', 'error'));
    expect(screen.getByLabelText(/^Order/)).toHaveValue(4);
  });
});
