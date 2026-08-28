/**
 * Your own status: choosing one both reports it and stops the idle timer
 * from later overriding what you set on purpose.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StatusMenu from '../src/staff-chat/StatusMenu';

describe('StatusMenu', () => {
  it('shows the label for the current status', () => {
    const { container } = render(<StatusMenu status="BUSY" onChange={vi.fn()} />);
    expect(container.textContent).toContain('Busy');
  });

  it('falls back to the first option for a status it does not recognise', () => {
    const { container } = render(<StatusMenu status={'UNKNOWN' as never} onChange={vi.fn()} />);
    expect(container.textContent).toContain('Online');
  });

  it('changes status from the menu', () => {
    const onChange = vi.fn();
    const { getByText } = render(<StatusMenu status="ONLINE" onChange={onChange} />);

    fireEvent.click(getByText('Online'));
    fireEvent.click(document.body.querySelector('li[role="menuitem"]:nth-of-type(2)') as HTMLElement);

    expect(onChange).toHaveBeenCalledWith('AWAY');
  });

  it('closes from outside without changing anything', async () => {
    const onChange = vi.fn();
    const { getByText } = render(<StatusMenu status="ONLINE" onChange={onChange} />);

    fireEvent.click(getByText('Online'));
    const backdrop = document.body.querySelector('[role="presentation"]') as HTMLElement;
    fireEvent.keyDown(backdrop, { key: 'Escape', code: 'Escape' });
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(onChange).not.toHaveBeenCalled();
  });
});
