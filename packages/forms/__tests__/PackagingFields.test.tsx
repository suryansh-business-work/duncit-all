import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type Control, type UseFormSetValue } from 'react-hook-form';
import PackagingFields from '../src/PackagingFields';

interface Parcel {
  weight_kg: number | string;
  length_cm: number | string;
  breadth_cm: number | string;
  height_cm: number | string;
  package_type?: string;
  hsn_code?: string;
  shelf_life_days?: number | string | null;
  is_fragile?: boolean;
  is_liquid?: boolean;
}

interface Values extends Parcel {
  variants: Parcel[];
}

const empty: Parcel = { weight_kg: '', length_cm: '', breadth_cm: '', height_cm: '' };

/** A translator that shows the key and its vars, so assertions read the wiring. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key} ${JSON.stringify(options.vars)}` : key;

function Harness({ prefix, productFields, initial = empty }: Readonly<{ prefix?: string; productFields?: boolean; initial?: Parcel }>) {
  const { control, setValue, watch } = useForm<Values>({
    defaultValues: {
      ...initial,
      package_type: 'BOX',
      hsn_code: '',
      shelf_life_days: null,
      is_fragile: false,
      is_liquid: false,
      variants: [{ ...empty }],
    },
  });
  return (
    <>
      <PackagingFields
        control={control as Control<Values>}
        setValue={setValue as UseFormSetValue<Values>}
        t={t}
        prefix={prefix}
        productFields={productFields}
      />
      <pre data-testid="values">{JSON.stringify(watch())}</pre>
    </>
  );
}

const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}');

describe('PackagingFields', () => {
  it('renders the four dimensions, the presets and the product-wide fields', () => {
    render(<Harness />);
    expect(screen.getByLabelText('packaging.weight')).toBeInTheDocument();
    expect(screen.getByLabelText('packaging.height')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^packaging\.preset\./ })).toHaveLength(6);
    expect(screen.getByLabelText('packaging.hsn')).toBeInTheDocument();
    expect(screen.getByLabelText('packaging.fragile')).toBeInTheDocument();
  });

  it('fills every dimension and the package type from a preset', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'packaging.preset.foodBag10' }));
    expect(values()).toMatchObject({ weight_kg: 10.4, length_cm: 60, breadth_cm: 40, height_cm: 15, package_type: 'POLYBAG' });
    expect(screen.getByRole('status')).toHaveTextContent('{"kg":10.4}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('warns when the box out-weighs what is in it', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'packaging.preset.bedLarge' }));
    expect(screen.getByRole('status')).toHaveTextContent('{"kg":14}');
    expect(screen.getByRole('alert')).toHaveTextContent('packaging.boxHeavier {"kg":14}');
  });

  it('reads the live values as the user types', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('packaging.weight'), '2');
    expect(screen.getByRole('status')).toHaveTextContent('{"kg":2}');
  });

  it('writes a variant row under its prefix and leaves the product-wide fields out', async () => {
    render(<Harness prefix="variants.0." productFields={false} />);
    expect(screen.queryByLabelText('packaging.hsn')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'packaging.preset.smallPouch' }));
    const saved = values();
    expect(saved.variants[0]).toMatchObject({ weight_kg: 0.3, length_cm: 20, breadth_cm: 15, height_cm: 5 });
    // The product's own package type is not a variant's to change.
    expect(saved.package_type).toBe('BOX');
    expect(saved.weight_kg).toBe('');
  });

  it('toggles the fragile and liquid flags', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByLabelText('packaging.fragile'));
    await userEvent.click(screen.getByLabelText('packaging.liquid'));
    expect(values()).toMatchObject({ is_fragile: true, is_liquid: true });
    await userEvent.click(screen.getByLabelText('packaging.fragile'));
    expect(values().is_fragile).toBe(false);
  });

  it('lists every package type in the select', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('combobox', { name: 'packaging.packageType' }));
    const list = screen.getByRole('listbox');
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'packaging.type.BOX',
      'packaging.type.POLYBAG',
      'packaging.type.ENVELOPE',
      'packaging.type.OTHER',
    ]);
    await userEvent.click(within(list).getByRole('option', { name: 'packaging.type.ENVELOPE' }));
    expect(values().package_type).toBe('ENVELOPE');
  });
});
