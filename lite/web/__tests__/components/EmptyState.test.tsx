import { render, screen, within } from '@testing-library/react';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '../../components/EmptyState';

describe('EmptyState', () => {
  it('says what is missing, why, and offers a way forward', () => {
    render(<EmptyState icon={<EventBusyOutlinedIcon />} title="No events yet" body="Host one in minutes." action={<a href="/create">Create event</a>} testId="events-empty" />);
    const empty = screen.getByTestId('events-empty');
    expect(within(empty).getByText('No events yet')).toBeInTheDocument();
    expect(within(empty).getByText('Host one in minutes.')).toBeInTheDocument();
    expect(within(empty).getByRole('link', { name: 'Create event' })).toHaveAttribute('href', '/create');
  });

  it('keeps the icon away from assistive technology', () => {
    render(<EmptyState icon={<EventBusyOutlinedIcon />} title="No events yet" />);
    const icon = screen.getByTestId('empty-state').querySelector('svg');
    expect(icon?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('draws only the title when there is no body or action, under the default test id', () => {
    render(<EmptyState icon={<EventBusyOutlinedIcon />} title="Nothing here" />);
    const empty = screen.getByTestId('empty-state');
    expect(empty.textContent).toBe('Nothing here');
    expect(within(empty).queryByRole('link')).not.toBeInTheDocument();
  });
});
