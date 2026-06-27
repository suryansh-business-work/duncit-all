import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import ServicesField from '@/forms/fields/ServicesField';
import type { CrmServiceOffered } from '@/api/crm.types';

function Harness({ initial }: Readonly<{ initial: CrmServiceOffered[] }>) {
  const methods = useForm({ defaultValues: { services_offered: initial } });
  return (
    <FormProvider {...methods}>
      <form>
        <ServicesField name="services_offered" options={['Catering', 'DJ / Music', 'Other']} />
      </form>
    </FormProvider>
  );
}

function renderWith(initial: CrmServiceOffered[]) {
  return render(<Harness initial={initial} />);
}

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
});
