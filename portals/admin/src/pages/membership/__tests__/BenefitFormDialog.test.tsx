import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BenefitFormDialog from '../BenefitFormDialog';

const EDITING = {
  id: 'ben-early',
  group: 'Getting a spot',
  label: 'Early booking window',
  sort_order: 1,
  is_active: true,
  values: [{ plan_key: 'access', value: '12h' }],
};

const ACCESS = [{ key: 'access', name: 'Access' }];

afterEach(() => vi.restoreAllMocks());

describe('BenefitFormDialog — tiers arriving while open', () => {
  it('gives a tier added while open an empty, controlled cell next to the filled one', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const { rerender } = render(
      <BenefitFormDialog open editing={EDITING} plans={ACCESS} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    // The new tier renders before the form is rebuilt for it, so its cell has
    // no value yet — it must still read as empty, not as an uncontrolled input.
    rerender(
      <BenefitFormDialog
        open
        editing={EDITING}
        plans={[...ACCESS, { key: 'elite', name: 'Elite' }]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Elite')).toHaveValue('');
    await waitFor(() => expect(screen.getByLabelText('Access')).toHaveValue('12h'));
    fireEvent.change(screen.getByLabelText('Elite'), { target: { value: 'Free' } });
    expect(screen.getByLabelText('Elite')).toHaveValue('Free');

    const controlSwitches = consoleError.mock.calls.filter((args) => String(args[0]).includes('uncontrolled'));
    expect(controlSwitches).toEqual([]);
  });
});
