import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  makeIcon,
  occasionIconsErrorMock,
  occasionIconsMock,
  saveOccasionIconsErrorMock,
  saveOccasionIconsMock,
} from '../mocks/occasions-live.mock';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
vi.mock('../../src/components/DateTimeField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).DateTimeFieldStub,
}));
vi.mock('../../src/components/MediaPickerField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).MediaPickerFieldStub,
}));

import AppIconsTab from '../../src/pages/occasions-page/app-icons/AppIconsTab';
import { MAX_ICONS, OccasionIconsForm, toIconInput, toIconValues } from '../../src/pages/occasions-page/app-icons/occasion-icons-form';

afterEach(() => {
  vi.clearAllMocks();
});

const row = (index: number) => within(screen.getByTestId(`occasion-icon-${index}`));
const saveButton = () => screen.getByTestId('occasion-icons-save');
/** Save comes on once the form has checked the edit, as it does for a person; only then is it pressed. */
const pressSave = async () => {
  await waitFor(() => expect(saveButton()).toBeEnabled());
  fireEvent.click(saveButton());
};

describe('toIconValues / toIconInput', () => {
  it('keeps only the input fields, gives a missing fallback the festive one, and sends a clean key and ISO dates', () => {
    const values = toIconValues([{ ...makeIcon({ fallback_icon: '' }), __typename: 'OccasionalIcon' } as ReturnType<typeof makeIcon>]);
    expect(values.icons[0]).toEqual({ ...makeIcon(), fallback_icon: 'occasion' });
    expect(values.icons[0]).not.toHaveProperty('__typename');
    const input = toIconInput({
      icons: [{ ...values.icons[0], slug: '  Diwali ', label: ' Lights ', starts_at: '2026-11-01T05:30:00+05:30', ends_at: '2026-11-05T05:30:00+05:30' }],
    });
    expect(input).toEqual([
      { ...makeIcon(), slug: 'diwali', label: 'Lights', starts_at: '2026-11-01T00:00:00.000Z', ends_at: '2026-11-05T00:00:00.000Z' },
    ]);
  });
});

describe('OccasionIconsForm', () => {
  const open = (icons = [makeIcon()], onSubmit = vi.fn().mockResolvedValue(undefined)) => {
    renderWithProviders(<OccasionIconsForm icons={icons} onSubmit={onSubmit} />);
    return onSubmit;
  };

  it('shows each window with its key, dates, icon, fallback, state and priority, and Save off until a change', () => {
    open();
    expect(row(0).getByLabelText(/^Key/)).toHaveValue('diwali');
    expect(row(0).getByLabelText(/^Name \(staff only\)/)).toHaveValue('Diwali icons');
    expect(row(0).getByLabelText('Starts')).toHaveValue('2026-11-01T00:00:00.000Z');
    expect(row(0).getByLabelText('Ends')).toHaveValue('2026-11-05T00:00:00.000Z');
    expect(row(0).getByLabelText('Icon')).toHaveValue('https://cdn.example.com/diwali.png');
    expect(row(0).getByTestId('media-Icon')).toHaveAttribute('data-folder', '/branding/occasions');
    expect(row(0).getByRole('combobox')).toHaveTextContent('occasion');
    expect(row(0).getByLabelText('On')).toBeChecked();
    expect(row(0).getByLabelText(/^Priority/)).toHaveValue(0);
    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveTextContent('Save icons');
  });

  it('says whether the app ships its own art for the key, and names a paused window', async () => {
    open([makeIcon({ is_active: false })]);
    expect(row(0).getByText('The app ships its own art for this key, so it shows offline and instantly.')).toBeInTheDocument();
    expect(row(0).getByLabelText('Paused')).not.toBeChecked();
    fireEvent.change(row(0).getByLabelText(/^Key/), { target: { value: 'eid' } });
    expect(await row(0).findByText('The app has no art of its own for this key, so it loads the icon below.')).toBeInTheDocument();
    // The bundled art is matched however the key is typed.
    fireEvent.change(row(0).getByLabelText(/^Key/), { target: { value: ' Holi ' } });
    expect(await row(0).findByText('The app ships its own art for this key, so it shows offline and instantly.')).toBeInTheDocument();
    fireEvent.click(row(0).getByLabelText('Paused'));
    expect(row(0).getByLabelText('On')).toBeChecked();
  });

  it('checks the key, name, dates and priority as they are typed', async () => {
    open();
    const r = row(0);
    fireEvent.change(r.getByLabelText(/^Key/), { target: { value: '' } });
    expect(await r.findByText('Give it a key, such as diwali.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText(/^Key/), { target: { value: 'new year' } });
    expect(await r.findByText('Use lowercase letters, numbers and single hyphens, such as new-year.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText(/^Name \(staff only\)/), { target: { value: 'n'.repeat(61) } });
    expect(await r.findByText('Keep the name under 60 characters.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText('Starts'), { target: { value: '' } });
    expect(await r.findByText('Pick a date and time.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText('Ends'), { target: { value: '2026-10-01T00:00:00.000Z' } });
    fireEvent.change(r.getByLabelText('Starts'), { target: { value: '2026-11-01T00:00:00.000Z' } });
    fireEvent.change(r.getByLabelText('Ends'), { target: { value: '2026-10-31T00:00:00.000Z' } });
    expect(await r.findByText('It must end after it starts.')).toBeInTheDocument();
    fireEvent.change(r.getByLabelText(/^Priority/), { target: { value: '2.5' } });
    expect(await r.findByText('Enter a whole number.')).toBeInTheDocument();
  });

  it('starts empty with a prompt, adds a blank window last in priority, and will not save it unfilled', async () => {
    const onSubmit = open([]);
    expect(screen.getByText('No festive icons yet. Add one to schedule it.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add festive icon' }));
    expect(screen.queryByText('No festive icons yet. Add one to schedule it.')).not.toBeInTheDocument();
    expect(row(0).getByLabelText(/^Key/)).toHaveValue('');
    expect(row(0).getByRole('combobox')).toHaveTextContent('occasion');
    expect(row(0).getByLabelText('On')).toBeChecked();
    expect(row(0).getByLabelText(/^Priority/)).toHaveValue(0);
    fireEvent.click(screen.getByRole('button', { name: 'Add festive icon' }));
    expect(row(1).getByLabelText(/^Priority/)).toHaveValue(1);
    fireEvent.click(saveButton());
    expect(await row(0).findByText('Give it a key, such as diwali.')).toBeInTheDocument();
    expect(row(0).getAllByText('Pick a date and time.')).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('removes a window', () => {
    open([makeIcon(), makeIcon({ slug: 'holi', label: 'Holi icons' })]);
    fireEvent.click(row(0).getByRole('button', { name: 'Remove this festive icon' }));
    expect(screen.queryByTestId('occasion-icon-1')).not.toBeInTheDocument();
    expect(row(0).getByLabelText(/^Key/)).toHaveValue('holi');
    expect(saveButton()).toBeEnabled();
  });

  it('stops adding at the most windows the app keeps', () => {
    open(Array.from({ length: MAX_ICONS }, (_, i) => makeIcon({ slug: `festival-${i}`, sort_order: i })));
    expect(screen.getByRole('button', { name: 'Add festive icon' })).toBeDisabled();
  });

  it('sends every window, cleaned, and says it is saving until the answer comes', async () => {
    let finish: () => void = () => undefined;
    const onSubmit = open(
      [makeIcon()],
      vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    fireEvent.change(row(0).getByLabelText(/^Key/), { target: { value: 'Diwali-2026' } });
    // Enter in a field does not post the form; only Save does.
    fireEvent.submit(screen.getByTestId('occasion-icons-form'));
    expect(onSubmit).not.toHaveBeenCalled();
    await pressSave();
    await waitFor(() => expect(saveButton()).toHaveTextContent('Saving…'));
    expect(saveButton()).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledWith([{ ...makeIcon(), slug: 'diwali-2026' }]);
    finish();
    await waitFor(() => expect(saveButton()).toHaveTextContent('Save icons'));
  });
});

describe('AppIconsTab', () => {
  const renderTab = (mocks: MockedResponse[]) => renderWithProviders(<AppIconsTab />, { mocks });

  it('waits for the windows, then shows them under the section’s explanation', async () => {
    renderTab([occasionIconsMock([makeIcon()])]);
    expect(screen.getByText('Festive app icons')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByTestId('occasion-icon-0')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows why the windows could not be read', async () => {
    renderTab([occasionIconsErrorMock('branding is down')]);
    expect(await screen.findByText('branding is down')).toBeInTheDocument();
    expect(screen.queryByTestId('occasion-icons-form')).not.toBeInTheDocument();
  });

  it('saves the changed windows, says so and reads them again', async () => {
    const saved = [makeIcon({ sort_order: 5 })];
    renderTab([occasionIconsMock([makeIcon()]), saveOccasionIconsMock(saved), occasionIconsMock(saved)]);
    fireEvent.change(await screen.findByLabelText(/^Priority/), { target: { value: '5' } });
    await pressSave();
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Festive icons saved.', 'success'));
    // The fresh form starts clean from what the server kept.
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(screen.getByLabelText(/^Priority/)).toHaveValue(5);
  });

  it('reports a save the server refused and keeps the edit', async () => {
    renderTab([occasionIconsMock([makeIcon()]), saveOccasionIconsErrorMock([makeIcon({ sort_order: 7 })], 'not allowed')]);
    fireEvent.change(await screen.findByLabelText(/^Priority/), { target: { value: '7' } });
    await pressSave();
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('not allowed', 'error'));
    expect(screen.getByLabelText(/^Priority/)).toHaveValue(7);
  });
});
