import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VarChips } from '../../../../pages/email-templates/email-template/VarChips';

describe('VarChips', () => {
  it('lists each placeholder in braces, named for what a click does', async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    render(<VarChips vars={['guest_name', 'event_title']} disabled={false} onInsert={onInsert} />);
    expect(screen.getByText('Placeholders · Select one to insert it where the cursor is')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('{guest_name}')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Insert {event_title}' }));
    expect(onInsert).toHaveBeenCalledWith('event_title');
  });

  it('disables the chips while the form is busy, taking them out of the tab order', () => {
    render(<VarChips vars={['guest_name']} disabled onInsert={vi.fn()} />);
    const chip = screen.getByTestId('template-var-guest_name');
    expect(chip).toHaveAttribute('aria-disabled', 'true');
    expect(chip).toHaveClass('Mui-disabled');
    expect(chip).toHaveAttribute('tabindex', '-1');
  });

  it('renders nothing for a template without placeholders', () => {
    const { container } = render(<VarChips vars={[]} disabled={false} onInsert={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
