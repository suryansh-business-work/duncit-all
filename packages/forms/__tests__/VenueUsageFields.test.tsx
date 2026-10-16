import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import VenueUsageFields from '../src/VenueUsageFields';
import { addVenueUsageIssues, venueUsageInput } from '../src/schemas';

interface Values {
  venue_pax: string;
  overtime_hours: string;
}

const labels = {
  pax: 'Guests charged for',
  paxHint: 'pax-hint',
  overtimeHours: 'Overtime hours',
  overtimeHint: 'overtime-hint',
};

const schema = z
  .object({ venue_pax: z.string(), overtime_hours: z.string() })
  .superRefine((values, ctx) =>
    addVenueUsageIssues(values, ctx, { paxInvalid: 'pax-invalid', overtimeInvalid: 'overtime-invalid' }),
  );

let submitted: ReturnType<typeof venueUsageInput> | null = null;

function Harness() {
  const { control, handleSubmit } = useForm<Values>({
    defaultValues: { venue_pax: '', overtime_hours: '' },
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
  });
  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        submitted = venueUsageInput(values);
      })}
    >
      <VenueUsageFields control={control} paxName="venue_pax" overtimeName="overtime_hours" labels={labels} idPrefix="complete" />
      <button type="submit">submit</button>
    </form>
  );
}

describe('VenueUsageFields', () => {
  it('asks for both, optional, with what each one changes', () => {
    render(<Harness />);
    expect(screen.getByTestId('complete-venue-usage')).toBeInTheDocument();
    expect(screen.getByLabelText('Guests charged for')).toHaveValue(null);
    expect(screen.getByText('pax-hint')).toBeInTheDocument();
    expect(screen.getByText('overtime-hint')).toBeInTheDocument();
  });

  it('sends the guests and hours that were typed', async () => {
    submitted = null;
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('Guests charged for'), '18');
    await userEvent.type(screen.getByLabelText('Overtime hours'), '1.5');
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(submitted).toEqual({ venue_pax: 18, overtime_hours: 1.5 }));
  });

  it('refuses a fractional guest count and says so under the field', async () => {
    submitted = null;
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('Guests charged for'), '2.5');
    await userEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('pax-invalid')).toBeInTheDocument();
    expect(submitted).toBeNull();
  });
});
