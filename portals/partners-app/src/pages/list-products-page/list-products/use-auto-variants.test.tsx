import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useForm, type UseFormGetValues, type UseFormSetValue } from 'react-hook-form';
import { AUTO_VARIANTS_DELAY_MS, useAutoVariants } from './useAutoVariants';
import { emptyValues } from './list-products.map';
import type { ProductListingValues } from './list-products.types';

interface FormApi {
  getValues: UseFormGetValues<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
}

function Harness({ apiRef }: Readonly<{ apiRef: { current: FormApi | null } }>) {
  const { control, getValues, setValue } = useForm<ProductListingValues>({
    defaultValues: { ...emptyValues },
  });
  useAutoVariants(control, getValues, setValue);
  apiRef.current = { getValues, setValue };
  return null;
}

const mount = () => {
  const apiRef: { current: FormApi | null } = { current: null };
  render(<Harness apiRef={apiRef} />);
  return apiRef;
};

describe('useAutoVariants', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('auto-generates a variant per option combination after the debounce', () => {
    const apiRef = mount();
    act(() => {
      apiRef.current?.setValue('options', [{ name: 'Size', values: ['S', 'M'] }]);
    });
    // Nothing happens until the debounce elapses.
    expect(apiRef.current?.getValues('variants')).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(AUTO_VARIANTS_DELAY_MS);
    });
    const variants = apiRef.current?.getValues('variants') ?? [];
    expect(variants).toHaveLength(2);
    expect(variants.map((variant) => variant.option_label)).toEqual(['S', 'M']);
  });

  it('debounces rapid option edits down to one regeneration', () => {
    const apiRef = mount();
    act(() => {
      apiRef.current?.setValue('options', [{ name: 'Size', values: ['S'] }]);
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_VARIANTS_DELAY_MS - 50);
      apiRef.current?.setValue('options', [{ name: 'Size', values: ['S', 'M', 'L'] }]);
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_VARIANTS_DELAY_MS);
    });
    expect(apiRef.current?.getValues('variants')).toHaveLength(3);
  });

  it('never wipes manual variants while no option is complete', () => {
    const apiRef = mount();
    act(() => {
      apiRef.current?.setValue('variants.0.option_label', 'Manual');
      apiRef.current?.setValue('options', [{ name: '', values: ['x'] }]);
    });
    act(() => {
      vi.advanceTimersByTime(AUTO_VARIANTS_DELAY_MS * 2);
    });
    const variants = apiRef.current?.getValues('variants') ?? [];
    expect(variants).toHaveLength(1);
    expect(variants[0].option_label).toBe('Manual');
  });
});
