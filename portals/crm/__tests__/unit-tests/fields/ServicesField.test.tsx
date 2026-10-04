import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import ServicesField from '@/forms/fields/ServicesField';
import type { CrmServiceOffered } from '@/api/crm.types';

function ValueProbe() {
  const value = useWatch({ name: 'services_offered' }) as CrmServiceOffered[] | undefined;
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
}

function Harness({ initial }: Readonly<{ initial?: CrmServiceOffered[] }>) {
  const methods = useForm<{ services_offered?: CrmServiceOffered[] }>({
    defaultValues: initial === undefined ? {} : { services_offered: initial },
  });
  return (
    <FormProvider {...methods}>
      <form>
        <ServicesField name="services_offered" options={['Catering', 'DJ / Music', 'Other']} />
        <ValueProbe />
      </form>
    </FormProvider>
  );
}

function renderWith(initial?: CrmServiceOffered[]) {
  return render(<Harness initial={initial} />);
}

const value = () => JSON.parse(screen.getByTestId('value').textContent ?? 'null') as CrmServiceOffered[] | null;
const combobox = () => screen.getByRole('combobox', { name: /services/i });
const typeAndEnter = (text: string) => {
  fireEvent.change(combobox(), { target: { value: text } });
  fireEvent.keyDown(combobox(), { key: 'Enter' });
};
const openOptions = () => {
  fireEvent.mouseDown(combobox());
  return within(screen.getByRole('listbox'));
};

describe('ServicesField', () => {
  it('shows the empty state when no services are picked', () => {
    renderWith([]);
    expect(screen.getByText(/no services added yet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search and select services/i)).toBeInTheDocument();
  });

  it('renders a card per row with a description editor', () => {
    renderWith([
      { service: 'Catering', custom_name: '', description: 'Veg + non-veg' },
    ]);
    expect(screen.getByText('Catering')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Veg + non-veg')).toBeInTheDocument();
  });

  it('labels Other rows with a Custom chip and shows the custom name input', () => {
    renderWith([
      { service: 'Other', custom_name: 'Drone Pilot', description: '' },
    ]);
    expect(screen.getByText('Drone Pilot')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Drone Pilot')).toBeInTheDocument();
  });

  it('removes a row when its delete button is clicked', () => {
    renderWith([
      { service: 'Catering', custom_name: '', description: 'Veg only' },
      { service: 'DJ / Music', custom_name: '', description: '' },
    ]);
    expect(screen.getAllByRole('button', { name: /remove service/i })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /remove service/i })[0]);
    expect(screen.queryByDisplayValue('Veg only')).not.toBeInTheDocument();
    expect(screen.getByText('DJ / Music')).toBeInTheDocument();
  });

  it('changes the placeholder when at least one row exists', () => {
    renderWith([{ service: 'Catering', custom_name: '', description: '' }]);
    expect(screen.getByPlaceholderText(/search to add more/i)).toBeInTheDocument();
  });

  it('treats an unset form value as no rows', () => {
    renderWith();
    expect(screen.getByText(/no services added yet/i)).toBeInTheDocument();
    expect(value()).toBeNull();
  });

  it('falls back to "Other" and "Untitled service" labels for rows without names', () => {
    renderWith([
      { service: 'Other', description: '' },
      { service: undefined as unknown as string, description: '' },
    ]);
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('Untitled service')).toBeInTheDocument();
  });

  it('only offers catalogue values that are not already picked', () => {
    renderWith([{ service: 'Catering', custom_name: '', description: '' }]);
    const options = openOptions().getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['DJ / Music', 'Other']);
  });

  it('appends a catalogue row when a catalogue option is picked', () => {
    renderWith([]);
    fireEvent.click(openOptions().getByRole('option', { name: 'Catering' }));

    expect(value()).toEqual([{ service: 'Catering', custom_name: '', description: '' }]);
    expect(screen.queryByText(/no services added yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
  });

  it('stores the "Other" catalogue value as an unnamed custom row', () => {
    renderWith([]);
    fireEvent.click(openOptions().getByRole('option', { name: 'Other' }));

    expect(value()).toEqual([{ service: 'Other', custom_name: '', description: '' }]);
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /custom service name/i })).toHaveValue('');
  });

  it('stores a free-typed name as Other + custom_name', () => {
    renderWith([]);
    typeAndEnter('  Drone Pilot  ');

    expect(value()).toEqual([{ service: 'Other', custom_name: 'Drone Pilot', description: '' }]);
    expect(screen.getByDisplayValue('Drone Pilot')).toBeInTheDocument();
  });

  it('ignores a typed name that only differs by case from one already picked', () => {
    renderWith([{ service: 'Catering', custom_name: '', description: '' }]);
    typeAndEnter('catering');

    expect(value()).toEqual([{ service: 'Catering', custom_name: '', description: '' }]);
  });

  it('ignores a whitespace-only typed name', () => {
    renderWith([]);
    typeAndEnter('   ');

    expect(value()).toEqual([]);
    expect(screen.getByText(/no services added yet/i)).toBeInTheDocument();
  });

  it('removes the last picked row on Backspace in the empty search box', () => {
    renderWith([
      { service: 'Catering', custom_name: '', description: '' },
      { service: 'Other', custom_name: 'Drone Pilot', description: '' },
    ]);
    fireEvent.keyDown(combobox(), { key: 'Backspace' });

    expect(value()).toEqual([{ service: 'Catering', custom_name: '', description: '' }]);
  });

  it('keeps duplicate-named rows when Backspace cannot tell which one was removed', () => {
    const rows = [
      { service: 'Catering', custom_name: '', description: 'a' },
      { service: 'Catering', custom_name: '', description: 'b' },
    ];
    renderWith(rows);
    fireEvent.keyDown(combobox(), { key: 'Backspace' });

    expect(value()).toEqual(rows);
  });

  it('removes every row when the picker is cleared', () => {
    const { container } = renderWith([
      { service: 'Catering', custom_name: '', description: '' },
      { service: 'DJ / Music', custom_name: '', description: '' },
    ]);
    fireEvent.click(container.querySelector('.MuiAutocomplete-clearIndicator') as HTMLButtonElement);

    expect(value()).toEqual([]);
    expect(screen.getByText(/no services added yet/i)).toBeInTheDocument();
  });
});
