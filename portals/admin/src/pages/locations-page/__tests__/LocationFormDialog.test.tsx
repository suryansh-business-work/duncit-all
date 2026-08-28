import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import { AI_FILL_LOCATION_AREAS } from '../queries';
import { blankForm, type LocForm, type ZoneEdit } from '../types';
import LocationFormDialog from '../LocationFormDialog';

/** The real hierarchy fields lazily load the country/state/city datasets; the
 * dialog only reads country/state/city off the form, so the stub just shows
 * them. */
vi.mock('../LocationHierarchyFields', () => ({
  default: ({ form }: { form: LocForm }) => (
    <div data-testid="hierarchy">{`${form.country}/${form.state}/${form.city}`}</div>
  ),
}));

/** The real field opens the shared media dialog; the stub exposes the same
 * value/onChange contract so the dialog's setForm wiring stays under test. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: ({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const seed = (over: Partial<LocForm> = {}): LocForm => ({
  ...blankForm,
  state: 'Karnataka',
  state_code: 'KA',
  city: 'Bengaluru',
  location_name: 'Bengaluru',
  location_image: 'https://cdn.test/blr.jpg',
  zones: [{ zone_name: 'Indiranagar', zone_code: '', pincode: '560038' }],
  ...over,
});

interface HarnessProps {
  initial: LocForm;
  busy?: boolean;
  opError?: string | null;
  onClose?: () => void;
  onSubmit?: () => void;
}

/** Mirrors LocationsPage: it owns the form state and the three zone helpers. */
function Harness({ initial, busy = false, opError = null, onClose, onSubmit }: Readonly<HarnessProps>) {
  const [form, setForm] = useState<LocForm>(initial);
  const updateZone = (idx: number, patch: Partial<ZoneEdit>) =>
    setForm((p) => ({ ...p, zones: p.zones.map((z, i) => (i === idx ? { ...z, ...patch } : z)) }));
  const addZone = () =>
    setForm((p) => ({ ...p, zones: [...p.zones, { zone_name: '', zone_code: '', pincode: '' }] }));
  const removeZone = (idx: number) =>
    setForm((p) => ({ ...p, zones: p.zones.filter((_, i) => i !== idx) }));

  return (
    <LocationFormDialog
      open
      form={form}
      setForm={setForm}
      busy={busy}
      opError={opError}
      onClose={onClose ?? (() => undefined)}
      onSubmit={onSubmit ?? (() => undefined)}
      updateZone={updateZone}
      addZone={addZone}
      removeZone={removeZone}
    />
  );
}

const aiMock = (payload: string, delay?: number): MockedResponse => ({
  request: {
    query: AI_FILL_LOCATION_AREAS,
    variables: { input: { country: 'India', state: 'Karnataka', city: 'Bengaluru' } },
  },
  result: { data: { aiFillLocationAreas: payload } },
  delay,
});

const areaInputs = () => screen.getAllByLabelText('Locality / Area') as HTMLInputElement[];
const pinInputs = () => screen.getAllByLabelText('PIN code') as HTMLInputElement[];

beforeAll(() => {
  // jsdom has no layout engine, so scrollIntoView is not implemented.
  Element.prototype.scrollIntoView = vi.fn();
});

describe('LocationFormDialog', () => {
  it('titles itself "New Location" and hides the active toggle without an id', () => {
    renderWithProviders(<Harness initial={seed()} />);
    expect(screen.getByText('New Location')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('titles itself "Edit Location" and toggles the active switch', () => {
    renderWithProviders(<Harness initial={seed({ id: 'loc1', is_active: true })} />);
    expect(screen.getByText('Edit Location')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('blocks Save until the location has a name', () => {
    renderWithProviders(<Harness initial={seed({ location_name: '   ' })} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('calls onSubmit and onClose from the dialog actions', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<Harness initial={seed()} onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a saving state that cannot be re-submitted', () => {
    const onSubmit = vi.fn();
    renderWithProviders(<Harness initial={seed()} busy onSubmit={onSubmit} />);
    const save = screen.getByRole('button', { name: 'Saving…' });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders the operation error passed in by the page', () => {
    renderWithProviders(<Harness initial={seed()} opError="PIN code is required" />);
    expect(screen.getByText('PIN code is required')).toBeInTheDocument();
  });

  it('edits a zone name and PIN code in place', () => {
    renderWithProviders(<Harness initial={seed()} />);
    fireEvent.change(areaInputs()[0], { target: { value: 'Koramangala' } });
    fireEvent.change(pinInputs()[0], { target: { value: '560034' } });
    expect(areaInputs()[0].value).toBe('Koramangala');
    expect(pinInputs()[0].value).toBe('560034');
  });

  it('adds a blank area row and lets it be removed again', () => {
    renderWithProviders(<Harness initial={seed()} />);
    expect(areaInputs()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Add Area' }));
    expect(areaInputs()).toHaveLength(2);
    expect(areaInputs()[1].value).toBe('');

    // The last row's remove button drops that row, keeping the first one.
    const removeButtons = screen.getAllByTestId('RemoveCircleOutlinedIcon').map((i) => i.closest('button')!);
    fireEvent.click(removeButtons[1]);
    expect(areaInputs()).toHaveLength(1);
    expect(areaInputs()[0].value).toBe('Indiranagar');
  });

  it('will not let the only area row be removed', () => {
    renderWithProviders(<Harness initial={seed()} />);
    expect(screen.getByTestId('RemoveCircleOutlinedIcon').closest('button')).toBeDisabled();
  });

  it('stores the picked location image on the form', () => {
    renderWithProviders(<Harness initial={seed({ location_image: '' })} />);
    const field = screen.getByLabelText('Location image URL') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'https://cdn.test/new.jpg' } });
    expect(field.value).toBe('https://cdn.test/new.jpg');
  });

  it('refuses AI fill until country, state and city are chosen', async () => {
    renderWithProviders(<Harness initial={seed({ city: '  ' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));
    expect(
      await screen.findByText('Select country, state and city before using AI fill.'),
    ).toBeInTheDocument();
    // No mutation was attempted — an unmatched mock would surface a different message.
    expect(screen.queryByText(/No more mocked responses/)).not.toBeInTheDocument();
  });

  it('replaces the areas and primary PIN with the AI result', async () => {
    const payload = JSON.stringify({
      zones: [
        { zone_name: 'Whitefield', pincode: '560066' },
        { zone_name: 'HSR Layout', pincode: '560102' },
      ],
    });
    renderWithProviders(<Harness initial={seed()} />, { mocks: [aiMock(payload)] });
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));

    await waitFor(() => expect(areaInputs()).toHaveLength(2));
    expect(areaInputs().map((i) => i.value)).toEqual(['Whitefield', 'HSR Layout']);
    expect(pinInputs().map((i) => i.value)).toEqual(['560066', '560102']);
  });

  it('drops AI localities that are missing a name or a PIN code', async () => {
    const payload = JSON.stringify({
      zones: [
        { zone_name: '  Jayanagar  ', pincode: ' 560011 ' },
        { zone_name: 'No pin here', pincode: '' },
        { zone_name: 'No pin key at all' },
        { pincode: '560999' },
      ],
    });
    renderWithProviders(<Harness initial={seed()} />, { mocks: [aiMock(payload)] });
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));

    await waitFor(() => expect(areaInputs()[0].value).toBe('Jayanagar'));
    expect(areaInputs()).toHaveLength(1);
    expect(pinInputs()[0].value).toBe('560011');
  });

  it('reports when the AI returns no usable localities', async () => {
    renderWithProviders(<Harness initial={seed()} />, { mocks: [aiMock(JSON.stringify({ zones: [] }))] });
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));

    expect(
      await screen.findByText('AI did not return any localities with PIN codes.'),
    ).toBeInTheDocument();
    // The existing areas are left untouched.
    expect(areaInputs()[0].value).toBe('Indiranagar');
  });

  it('reports an AI payload with no zones key at all', async () => {
    renderWithProviders(<Harness initial={seed()} />, { mocks: [aiMock('{}')] });
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));
    expect(
      await screen.findByText('AI did not return any localities with PIN codes.'),
    ).toBeInTheDocument();
  });

  it('reports an empty AI response body', async () => {
    renderWithProviders(<Harness initial={seed()} />, {
      mocks: [
        {
          request: {
            query: AI_FILL_LOCATION_AREAS,
            variables: { input: { country: 'India', state: 'Karnataka', city: 'Bengaluru' } },
          },
          result: { data: { aiFillLocationAreas: null } },
        },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));
    expect(
      await screen.findByText('AI did not return any localities with PIN codes.'),
    ).toBeInTheDocument();
  });

  it('reports an unparsable AI payload', async () => {
    renderWithProviders(<Harness initial={seed()} />, { mocks: [aiMock('not-json')] });
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));
    expect(await screen.findByText(/JSON/i)).toBeInTheDocument();
  });

  it('reports a failed AI request', async () => {
    renderWithProviders(<Harness initial={seed()} />, {
      mocks: [
        {
          request: {
            query: AI_FILL_LOCATION_AREAS,
            variables: { input: { country: 'India', state: 'Karnataka', city: 'Bengaluru' } },
          },
          error: new Error('AI service is unavailable'),
        },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));
    expect(await screen.findByText('AI service is unavailable')).toBeInTheDocument();
  });

  it('shows a filling state while the AI request is in flight', async () => {
    renderWithProviders(<Harness initial={seed()} />, {
      mocks: [aiMock(JSON.stringify({ zones: [{ zone_name: 'BTM', pincode: '560076' }] }), 40)],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fill with AI' }));
    expect(screen.getByRole('button', { name: 'Filling…' })).toBeDisabled();
    await waitFor(() => expect(areaInputs()[0].value).toBe('BTM'));
  });

  it('disables AI fill while the page is saving', () => {
    renderWithProviders(<Harness initial={seed()} busy />);
    expect(screen.getByRole('button', { name: 'Fill with AI' })).toBeDisabled();
  });
});
