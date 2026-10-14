import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import FoodTaxFields from '../src/FoodTaxFields';
import { makeVenueFoodTaxRefinement, venueFoodTaxShape, type VenueFoodTaxValues } from '../src/schemas';

/** A translator that shows the key, so assertions read the wiring. */
const t = (key: string) => key;

interface Values {
  food_ordering: VenueFoodTaxValues;
}

const schema = z
  .object({ food_ordering: z.object(venueFoodTaxShape) })
  .superRefine((values, ctx) => makeVenueFoodTaxRefinement(t)(values.food_ordering, ctx, ['food_ordering']));

let submitted: Values | null = null;

function Harness({ initial }: Readonly<{ initial: VenueFoodTaxValues }>) {
  const { control, handleSubmit } = useForm<Values>({
    defaultValues: { food_ordering: initial },
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
  });
  return (
    // noValidate, as every form in the portals: the shared schema speaks, not the browser's own bubble.
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        submitted = values;
      })}
    >
      <FoodTaxFields control={control} t={t} prefix="food_ordering" idPrefix="venue-food" />
      <button type="submit">submit</button>
    </form>
  );
}

const following: VenueFoodTaxValues = { tax_override: false, tax_mode: 'INCLUSIVE', gst_pct: 5 };
const overrideSwitch = () => screen.getByRole('switch', { name: 'shell.foodTax.override' });

describe('FoodTaxFields', () => {
  it("shows Finance's default read-only while the venue follows it", () => {
    render(<Harness initial={following} />);
    expect(overrideSwitch()).not.toBeChecked();
    // The switch is described by its hint, so a screen reader hears what off and on mean.
    expect(overrideSwitch()).toHaveAccessibleDescription('shell.foodTax.overrideHint');
    const mode = screen.getByRole('radiogroup', { name: 'shell.foodTax.taxMode' });
    expect(within(mode).getByRole('radio', { name: 'shell.foodTax.inclusive' })).toBeChecked();
    expect(within(mode).getByRole('radio', { name: 'shell.foodTax.inclusive' })).toBeDisabled();
    expect(within(mode).getByRole('radio', { name: 'shell.foodTax.exclusive' })).toBeDisabled();
    expect(screen.getByLabelText('shell.foodTax.gstPct')).toBeDisabled();
    expect(screen.getByLabelText('shell.foodTax.gstPct')).toHaveValue(5);
  });

  it('lets the venue set its own once switched on, and submits what was chosen', async () => {
    const user = userEvent.setup();
    render(<Harness initial={following} />);
    await user.click(overrideSwitch());
    await user.click(screen.getByRole('radio', { name: 'shell.foodTax.exclusive' }));
    const pct = screen.getByLabelText('shell.foodTax.gstPct');
    await user.clear(pct);
    await user.type(pct, '18');
    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect(submitted).toEqual({ food_ordering: { tax_override: true, tax_mode: 'EXCLUSIVE', gst_pct: '18' } });
  });

  it('shows the shared rule on the field it refuses, and submits nothing', async () => {
    const user = userEvent.setup();
    submitted = null;
    render(<Harness initial={{ tax_override: true, tax_mode: '', gst_pct: '40' }} />);
    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('shell.foodTax.taxModeRequired')).toBeInTheDocument();
    expect(screen.getByText('shell.foodTax.gstPctInvalid')).toBeInTheDocument();
    expect(screen.getByLabelText('shell.foodTax.gstPct')).toHaveAttribute('aria-invalid', 'true');
    expect(submitted).toBeNull();
  });

  it('can be switched back off, which makes the mode and percent read-only again', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ tax_override: true, tax_mode: 'EXCLUSIVE', gst_pct: 12 }} />);
    expect(screen.getByLabelText('shell.foodTax.gstPct')).toBeEnabled();
    await user.click(overrideSwitch());
    expect(screen.getByLabelText('shell.foodTax.gstPct')).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'shell.foodTax.exclusive' })).toBeDisabled();
    expect(screen.getByTestId('venue-food-tax')).toBeInTheDocument();
  });
});
