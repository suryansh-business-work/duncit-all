import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import PolicyNotifyField from '../../src/pages/policies/PolicyNotifyField';
import { renderWithProviders } from '../testkit';
import { recipientCountMock } from '../mocks';

/**
 * The "tell everyone who accepted this" tick: it states how many people it
 * would reach before it is pressed, and what has already been sent.
 */
interface Options {
  policyId?: string;
  checked?: boolean;
  disabled?: boolean;
  lastNotifiedAt?: string | null;
  lastNotifiedCount?: number;
  mocks?: MockedResponse[];
}

const renderField = ({
  policyId = 'p1',
  checked = false,
  disabled = false,
  lastNotifiedAt = null,
  lastNotifiedCount = 0,
  mocks = [],
}: Options = {}) => {
  const onCheckedChange = vi.fn();
  const onSummaryChange = vi.fn();
  renderWithProviders(
    <PolicyNotifyField
      policyId={policyId}
      checked={checked}
      summary=""
      disabled={disabled}
      lastNotifiedAt={lastNotifiedAt}
      lastNotifiedCount={lastNotifiedCount}
      onCheckedChange={onCheckedChange}
      onSummaryChange={onSummaryChange}
    />,
    { mocks },
  );
  return {
    onCheckedChange,
    onSummaryChange,
    tick: screen.getByRole('checkbox', { name: 'Email everyone who has accepted this policy' }),
  };
};

describe('PolicyNotifyField', () => {
  it('counts the recipients first, then offers to write to them', async () => {
    const { tick, onCheckedChange } = renderField({ mocks: [recipientCountMock(12)] });
    expect(screen.getByText('Counting who has accepted it…')).toBeInTheDocument();

    expect(await screen.findByText('This would reach 12 people who have accepted it.')).toBeInTheDocument();
    expect(tick).toBeEnabled();
    fireEvent.click(tick);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('cannot be ticked when nobody has accepted the policy', async () => {
    const { tick } = renderField({ mocks: [recipientCountMock(0)] });
    expect(
      await screen.findByText('Nobody has accepted this policy yet, so there is nobody to tell.'),
    ).toBeInTheDocument();
    expect(tick).toBeDisabled();
  });

  it('asks nothing of the server for a policy that does not exist yet', () => {
    const { tick } = renderField({ policyId: '' });
    expect(screen.getByText('Nobody has accepted this policy yet, so there is nobody to tell.')).toBeInTheDocument();
    expect(tick).toBeDisabled();
  });

  it('says whether a notice has gone out before', () => {
    renderField({ policyId: '' });
    expect(screen.getByText('No change notice has been sent for this policy.')).toBeInTheDocument();
  });

  it('says when the last notice went out and how far it reached', () => {
    renderField({ policyId: '', lastNotifiedAt: '2026-03-04T09:30:00.000Z', lastNotifiedCount: 40 });
    expect(screen.getByText(/^Last sent .+ to 40 people\.$/)).toBeInTheDocument();
  });

  it('asks for a summary once ticked, and reports it', () => {
    const { onSummaryChange } = renderField({ policyId: '', checked: true });
    expect(screen.getByText(/Shown in the email above the link/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('What changed (optional)'), {
      target: { value: 'Clause 4 now names the locality we store.' },
    });
    expect(onSummaryChange).toHaveBeenCalledWith('Clause 4 now names the locality we store.');
  });

  it('is held while the policy saves', async () => {
    const { tick } = renderField({ disabled: true, mocks: [recipientCountMock(12)] });
    await screen.findByText('This would reach 12 people who have accepted it.');
    expect(tick).toBeDisabled();
  });
});
