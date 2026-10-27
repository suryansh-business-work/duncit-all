import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SwitchRow from '../../src/components/SwitchRow';

describe('SwitchRow', () => {
  it('shows its label and hint, and reports the new state when toggled', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SwitchRow checked={false} onChange={onChange} label="Send notices" hint="Mails the team" />);

    expect(screen.getByText('Mails the team')).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Send notices' });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(<SwitchRow checked onChange={onChange} label="Send notices" hint="Mails the team" />);
    fireEvent.click(screen.getByRole('switch', { name: 'Send notices' }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
