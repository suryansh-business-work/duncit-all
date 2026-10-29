import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { freeJustificationInput } from '@duncit/utils';
import FreeArrangementFields from '../src/FreeArrangementFields';
import { addFreeJustificationIssues, freeJustificationDefaults, freeJustificationFields, type FreeJustificationValues } from '../src/schemas';

/** Copy resolves as `t:<key>`, so the assertions name WHICH line is drawn. */
const t = (key: string) => `t:${key}`;
const schema = z.object(freeJustificationFields).superRefine((values, ctx) => addFreeJustificationIssues(values, ctx, t));

let submitted: FreeJustificationValues | null = null;

function Harness({ disabled }: Readonly<{ disabled?: boolean }>) {
  const { control, handleSubmit } = useForm<FreeJustificationValues>({
    defaultValues: freeJustificationDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<FreeJustificationValues>,
  });
  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        submitted = values;
      })}
    >
      <FreeArrangementFields
        control={control}
        names={{ reason: 'free_reason', details: 'free_details', accepted: 'free_accepted' }}
        t={t}
        idPrefix="create"
        disabled={disabled}
      />
      <button type="submit">submit</button>
    </form>
  );
}

describe('FreeArrangementFields', () => {
  it("draws Duncit's free policy, the four reasons, the warning and the acceptance", () => {
    render(<Harness />);
    const policy = screen.getByTestId('create-free-policy');
    expect(within(policy).getByText('t:availability.freeArrangement.policy.title')).toBeInTheDocument();
    expect(within(policy).getByText('t:availability.freeArrangement.policy.permitted')).toBeInTheDocument();
    expect(within(policy).getByText('t:availability.freeArrangement.policy.venueApproval')).toBeInTheDocument();
    expect(within(policy).getByText('t:availability.freeArrangement.policy.transparency')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByLabelText('t:availability.freeArrangement.reason.other')).toBeInTheDocument();
    expect(screen.getByTestId('create-free-warning')).toHaveTextContent('t:availability.freeArrangement.policy.warning');
    expect(screen.getByRole('checkbox', { name: 't:availability.freeArrangement.policy.accept' })).not.toBeChecked();
    // Details are asked for "other" only.
    expect(screen.queryByTestId('create-free-details')).not.toBeInTheDocument();
  });

  it('opens and closes "More details" with every point of the policy', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByTestId('create-free-more-details'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('t:availability.freeArrangement.policy.detailsTitle')).toBeInTheDocument();
    expect(within(dialog).getByText('t:availability.freeArrangement.policy.detailsNoCounter')).toBeInTheDocument();
    expect(within(dialog).getByText('t:availability.freeArrangement.policy.detailsAudit')).toBeInTheDocument();
    await user.click(screen.getByTestId('create-free-policy-close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refuses to submit without a reason or the acceptance, saying which is missing', async () => {
    const user = userEvent.setup();
    submitted = null;
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('t:availability.freeArrangement.validation.reason')).toBeInTheDocument();
    expect(submitted).toBeNull();
    await user.click(screen.getByLabelText('t:availability.freeArrangement.reason.campaign'));
    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('t:availability.freeArrangement.validation.accept')).toBeInTheDocument();
    expect(submitted).toBeNull();
  });

  it('asks why for "other", then sends a complete justification', async () => {
    const user = userEvent.setup();
    submitted = null;
    render(<Harness />);
    await user.click(screen.getByLabelText('t:availability.freeArrangement.reason.other'));
    const details = await screen.findByRole('textbox', { name: /t:availability\.freeArrangement\.detailsLabel/ });
    await user.click(screen.getByRole('checkbox', { name: 't:availability.freeArrangement.policy.accept' }));
    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('t:availability.freeArrangement.validation.details')).toBeInTheDocument();
    await user.type(details, 'Partner NGO meet');
    await user.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(submitted).not.toBeNull());
    const values = submitted as FreeJustificationValues | null;
    expect(values && freeJustificationInput({ reason: values.free_reason, details: values.free_details, accepted: values.free_accepted })).toEqual({
      reason: 'OTHER',
      details: 'Partner NGO meet',
      accepted: true,
    });
  });

  it('locks every choice while the form is disabled', () => {
    render(<Harness disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 't:availability.freeArrangement.policy.accept' })).toBeDisabled();
  });
});
