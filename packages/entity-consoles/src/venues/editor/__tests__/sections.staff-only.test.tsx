import { describe, expect, it } from 'vitest';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OperationsSection from '../sections/OperationsSection';
import CancellationSection from '../sections/CancellationSection';
import StatusSection from '../sections/StatusSection';
import type { VenueFormValues } from '../types';
import { renderForm } from './harness';
import { sectionCard, venueValues } from './sectionKit';

/** The three sections after the owner's eight — an owner never sets these from registration. */

describe('the staff-only sections', () => {
  it('keeps the hours and booking rules in Operations, without the closed dates, and takes the tags', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<VenueFormValues>(venueValues(), ({ control }) => <OperationsSection control={control} />);
    const section = within(sectionCard('operations', 'How it operates'));

    expect(section.getByRole('textbox', { name: 'Opens at' })).toHaveValue('09:00');
    expect(section.getByText('Booking rules')).toBeInTheDocument();
    // The closed dates moved to Leaves & Holidays, where the owner's form keeps them.
    expect(section.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    expect(section.queryByText('No holidays added.')).not.toBeInTheDocument();

    await user.type(section.getByRole('combobox', { name: 'Tags' }), 'rooftop{Enter}');
    expect(form().getValues('tags')).toEqual(['rooftop']);
  });

  it('anchors Cancellations and Status and money for the section strip', () => {
    renderForm<VenueFormValues>(venueValues(), ({ control }) => (
      <>
        <CancellationSection control={control} />
        <StatusSection control={control} canGovern />
      </>
    ));

    expect(within(sectionCard('cancellation', 'Cancellations')).getByText('Duncit auto-cancellation')).toBeInTheDocument();
    expect(
      within(sectionCard('status', 'Status and money')).getByRole('spinbutton', { name: /Venue share %/ }),
    ).toBeEnabled();
  });
});
