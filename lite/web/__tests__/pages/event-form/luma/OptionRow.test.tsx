import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OptionRow } from '../../../../pages/event-form/luma/OptionRow';
import { renderWithProviders } from '../../../test-utils';

describe('OptionRow', () => {
  it('reads the visible value first, then what Edit does (WCAG 2.5.3)', async () => {
    const onEdit = vi.fn();
    const { user } = renderWithProviders(<OptionRow icon={null} label="Capacity" value="40" onEdit={onEdit} editLabel="edit capacity" testId="option-capacity" />);
    expect(screen.getByTestId('option-capacity')).toHaveTextContent('Capacity');
    const edit = screen.getByRole('button', { name: '40, edit capacity' });
    expect(edit).toHaveTextContent('40');
    await user.click(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('is named by its value alone when no edit label is given', () => {
    renderWithProviders(<OptionRow icon={null} label="Capacity" value="Unlimited" onEdit={vi.fn()} testId="option-capacity" />);
    expect(screen.getByRole('button', { name: 'Unlimited' })).toBeInTheDocument();
  });

  it('shows an inline control and no Edit when it has no editor', () => {
    renderWithProviders(<OptionRow icon={null} label="Require approval" control={<input type="checkbox" aria-label="Approve each guest" />} testId="option-approval" />);
    expect(screen.getByRole('checkbox', { name: 'Approve each guest' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
