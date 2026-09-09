import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from '@mui/material';
import { FormActionsRow } from '../src/FormActionsRow';

const inForm = (row: React.ReactElement) => (
  <form>
    <Grid container>{row}</Grid>
  </form>
);

describe('FormActionsRow', () => {
  it('renders the submit button alone when nothing has failed', () => {
    render(inForm(<FormActionsRow submitLabel="Create pod" />));
    const submit = screen.getByRole('button', { name: 'Create pod' });
    expect(submit).toHaveAttribute('type', 'submit');
    expect(submit).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the last failure above the actions and the secondary action beside submit', () => {
    render(
      inForm(
        <FormActionsRow
          submitLabel="Save changes"
          errorMessage="Pod DUN-POD-4821 already has a slot at that time"
          secondaryAction={<button type="button">Cancel</button>}
        />,
      ),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Pod DUN-POD-4821 already has a slot at that time');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('spins and blocks a second press while busy, and stays disabled when told to', () => {
    const { rerender } = render(inForm(<FormActionsRow submitLabel="Send" busy />));
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    rerender(inForm(<FormActionsRow submitLabel="Send" disabled />));
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
