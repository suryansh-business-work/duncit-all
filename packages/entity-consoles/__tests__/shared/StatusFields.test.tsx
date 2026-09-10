import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { Grid } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import StatusFields from '../../src/shared/StatusFields';
import { lifecycleOptions } from '../../src/shared/lifecycleOptions';

/**
 * The review state and the live switch every console record carries.
 *
 * The behaviour that matters is the GOVERNANCE gate: a console-role editor must
 * still SEE these values — knowing a venue's commission is part of reading the
 * record — while being unable to move them, and must be told who can.
 */
interface Values {
  status: string;
  is_active: boolean;
  commission_pct: number;
}

const t = (key: string) => key;

/** MUI 9's Switch exposes no `checkbox` role to RTL, so query the real input. */
const liveToggle = () =>
  document.querySelector('input[type="checkbox"]') as HTMLInputElement;

let methods: UseFormReturn<Values> | null = null;

function renderFields(opts: { canGovern: boolean; defaults?: Partial<Values> }) {
  function Harness() {
    methods = useForm<Values>({
      defaultValues: { status: 'APPROVED', is_active: true, commission_pct: 8, ...opts.defaults },
    });
    return (
      <StatusFields
        control={methods.control}
        statusName="status"
        activeName="is_active"
        statusLabel="Status"
        options={lifecycleOptions(t)}
        activeLabel="Live and taking bookings"
        deactivateWarning="Saving with this off emails the owner."
        canGovern={opts.canGovern}
        governedByNote="Approvals and money are set by platform admins."
        extraFields={
          <Grid size={{ xs: 12 }}>
            <RhfTextField
              control={methods.control}
              name="commission_pct"
              label="Commission %"
              type="number"
              disabled={!opts.canGovern}
            />
          </Grid>
        }
      />
    );
  }
  return render(<Harness />);
}

describe('StatusFields', () => {
  it('lets a governor change the status and the live switch', async () => {
    const user = userEvent.setup();
    renderFields({ canGovern: true });

    const toggle = liveToggle();
    expect(toggle).toBeEnabled();
    await user.click(toggle);
    expect(methods?.getValues('is_active')).toBe(false);

    // Turning it off warns, because the write notifies the partner.
    expect(screen.getByText('Saving with this off emails the owner.')).toBeInTheDocument();
    // No governance note for somebody who has it.
    expect(
      screen.queryByText('Approvals and money are set by platform admins.'),
    ).not.toBeInTheDocument();
  });

  it('shows the values but disables them for a console-role editor', () => {
    renderFields({ canGovern: false });

    expect(screen.getByText('Approvals and money are set by platform admins.')).toBeInTheDocument();
    expect(liveToggle()).toBeDisabled();
    // The commission is still readable — that is part of reading the record.
    expect(screen.getByLabelText(/Commission %/)).toHaveValue(8);
    expect(screen.getByLabelText(/Commission %/)).toBeDisabled();
  });

  it('does not nag a non-governor about a switch they cannot move', () => {
    // The deactivate warning is advice for somebody about to save it off. For a
    // reader it is just noise about a state they did not choose.
    renderFields({ canGovern: false, defaults: { is_active: false } });
    expect(screen.queryByText('Saving with this off emails the owner.')).not.toBeInTheDocument();
  });

  it('offers every lifecycle state in the picker', async () => {
    const user = userEvent.setup();
    renderFields({ canGovern: true });
    await user.click(screen.getByRole('combobox'));
    for (const option of lifecycleOptions(t)) {
      expect(screen.getByRole('option', { name: option.label })).toBeInTheDocument();
    }
  });
});
