import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DEFAULT_GROWTH_INPUTS, GROWTH_INPUT_KEYS } from '../../../lib/growth-calculator';
import { GrowthInputsForm, growthInputsSchema, inputProblem, toFormValues } from '.';

type Translate = Parameters<typeof growthInputsSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const input = (key: string) => screen.getByTestId(`growth-input-${key}`) as HTMLInputElement;
const type = (key: string, value: string) => fireEvent.change(input(key), { target: { value } });

describe('inputProblem', () => {
  it('names what is wrong with each kind of bad value', () => {
    expect(inputProblem('pax_per_pod', '')).toBe('number');
    expect(inputProblem('pax_per_pod', 'abc')).toBe('number');
    expect(inputProblem('pax_per_pod', '2.5')).toBe('whole');
    expect(inputProblem('price_per_pax', '400.005')).toBe('decimals');
    expect(inputProblem('host_conversion_pct', '0')).toBe('range');
    expect(inputProblem('target_cities', '1001')).toBe('range');
    expect(inputProblem('price_per_pax', ' 399.99 ')).toBeNull();
  });
});

describe('growthInputsSchema', () => {
  it('turns the default text back into the default plan', () => {
    expect(growthInputsSchema(t).parse(toFormValues(DEFAULT_GROWTH_INPUTS))).toEqual(DEFAULT_GROWTH_INPUTS);
  });

  it('gives each problem its own message, with the range spelled out', () => {
    const result = growthInputsSchema(t).safeParse({
      ...toFormValues(DEFAULT_GROWTH_INPUTS),
      pax_per_pod: '',
      hosts_per_venue: '1.5',
      price_per_pax: '1.234',
      venue_conversion_pct: '0',
    });
    expect(result.success).toBe(false);
    const byField = Object.fromEntries((result.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]));
    expect(byField).toEqual({
      pax_per_pod: 'targets.growth.errors.number',
      hosts_per_venue: 'targets.growth.errors.whole',
      price_per_pax: 'targets.growth.errors.decimals',
      venue_conversion_pct: 'targets.growth.errors.range:0.01|100',
    });
  });
});

describe('GrowthInputsForm', () => {
  it('shows all nine assumptions and reports the default plan', async () => {
    const onChange = vi.fn();
    render(<GrowthInputsForm seed={DEFAULT_GROWTH_INPUTS} onChange={onChange} onReset={vi.fn()} />);
    for (const key of GROWTH_INPUT_KEYS) expect(input(key).value).toBe(String(DEFAULT_GROWTH_INPUTS[key]));
    expect(screen.getByLabelText(/Average pax per pod/)).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(DEFAULT_GROWTH_INPUTS));
  });

  it('reports each valid change as numbers, and null with a message while a box is wrong', async () => {
    const onChange = vi.fn();
    render(<GrowthInputsForm seed={DEFAULT_GROWTH_INPUTS} onChange={onChange} onReset={vi.fn()} />);

    type('target_cities', '20');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GROWTH_INPUTS, target_cities: 20 }));

    type('host_conversion_pct', '0');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null));
    expect(await screen.findByText('Enter a value from 0.01 to 100')).toBeInTheDocument();
    expect(input('host_conversion_pct')).toHaveAttribute('aria-invalid', 'true');

    type('host_conversion_pct', '12.5');
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GROWTH_INPUTS, target_cities: 20, host_conversion_pct: 12.5 })
    );
  });

  it('loads a new plan when handed one, and asks for the defaults on Reset', async () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const { rerender } = render(<GrowthInputsForm seed={DEFAULT_GROWTH_INPUTS} onChange={onChange} onReset={onReset} />);
    const saved = { ...DEFAULT_GROWTH_INPUTS, venues_per_city: 250 };
    rerender(<GrowthInputsForm seed={saved} onChange={onChange} onReset={onReset} />);
    await waitFor(() => expect(input('venues_per_city').value).toBe('250'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(saved));

    fireEvent.click(screen.getByTestId('growth-inputs-reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
