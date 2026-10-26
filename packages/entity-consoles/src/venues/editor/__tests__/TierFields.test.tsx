import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChargeTiersField, RefundTiersField } from '../fields/TierFields';
import type { VenueFormValues } from '../types';
import { renderForm } from './harness';
import { venueValues } from './sectionKit';

const settings = (over: Partial<VenueFormValues['settings']>): VenueFormValues =>
  venueValues({ settings: { ...venueValues().settings, ...over } });

describe('ChargeTiersField', () => {
  it('shows only the hint and the add button while the venue has no charge band', () => {
    renderForm<VenueFormValues>(settings({ charge_tiers: [] }), ({ control }) => <ChargeTiersField control={control} />);
    expect(screen.getByRole('button', { name: 'Add a charge band' })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove this band' })).not.toBeInTheDocument();
  });

  it('adds a band at 24 hours, 0 percent, and writes what the admin edits into it', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<VenueFormValues>(settings({ charge_tiers: [] }), ({ control }) => (
      <ChargeTiersField control={control} />
    ));

    await user.click(screen.getByRole('button', { name: 'Add a charge band' }));
    expect(form().getValues('settings.charge_tiers')).toEqual([{ hours_before: 24, charge_type: 'PERCENT', value: 0 }]);
    expect(screen.getByRole('spinbutton', { name: 'Within (hours)' })).toHaveValue(24);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Within (hours)' }), { target: { value: '6' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Value' }), { target: { value: '1500' } });
    await user.click(screen.getByRole('combobox', { name: 'Charge' }));
    await user.click(await screen.findByRole('option', { name: 'Flat amount' }));

    expect(form().getValues('settings.charge_tiers')).toEqual([{ hours_before: '6', charge_type: 'AMOUNT', value: '1500' }]);
  });

  it('removes only the band whose button was pressed', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<VenueFormValues>(
      settings({
        charge_tiers: [
          { hours_before: 24, charge_type: 'PERCENT', value: 50 },
          { hours_before: 6, charge_type: 'AMOUNT', value: 1500 },
        ],
      }),
      ({ control }) => <ChargeTiersField control={control} />,
    );

    const removes = screen.getAllByRole('button', { name: 'Remove this band' });
    expect(removes).toHaveLength(2);
    await user.click(removes[0]);

    expect(form().getValues('settings.charge_tiers')).toEqual([{ hours_before: 6, charge_type: 'AMOUNT', value: 1500 }]);
    expect(screen.getAllByRole('button', { name: 'Remove this band' })).toHaveLength(1);
  });
});

describe('RefundTiersField', () => {
  it('adds a band at 24 hours, 100 percent, edits it and removes it', async () => {
    const user = userEvent.setup();
    const { form } = renderForm<VenueFormValues>(settings({ refund_tiers: [] }), ({ control }) => (
      <RefundTiersField control={control} />
    ));
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add a refund band' }));
    expect(form().getValues('settings.refund_tiers')).toEqual([{ hours_before: 24, refund_pct: 100 }]);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'More than (hours)' }), { target: { value: '48' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Refund %' }), { target: { value: '75' } });
    expect(form().getValues('settings.refund_tiers')).toEqual([{ hours_before: '48', refund_pct: '75' }]);

    await user.click(screen.getByRole('button', { name: 'Remove this band' }));
    expect(form().getValues('settings.refund_tiers')).toEqual([]);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
});
