import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AiMonitorPill from '../AiMonitorPill';

describe('AiMonitorPill', () => {
  it('renders the localized "AI Monitoring" pill as a button that opens the activity dialog', () => {
    const onClick = vi.fn();
    render(<AiMonitorPill onClick={onClick} />);

    const pill = screen.getByRole('button', { name: 'AI Monitoring' });
    expect(pill).toHaveTextContent('AI Monitoring');
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.click(pill);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
