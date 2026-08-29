import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import UserDetailsTabs from '../UserDetailsTabs';
import { renderWithProviders } from './testkit';

const TABS = [
  { value: 'profile', label: 'Profile', content: <div>Profile content</div> },
  { value: 'access', label: 'Access', content: <div>Access content</div> },
  { value: 'health', label: 'Health', content: <div>Health content</div> },
];

describe('UserDetailsTabs — selection', () => {
  it('renders the first tab active by default, with only its content shown', () => {
    renderWithProviders(<UserDetailsTabs tabs={TABS} />);

    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Profile content')).toBeInTheDocument();
    expect(screen.queryByText('Access content')).toBeNull();
    expect(screen.queryByText('Health content')).toBeNull();
  });

  it('switches content when a different tab is clicked, and writes the URL param', () => {
    renderWithProviders(<UserDetailsTabs tabs={TABS} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Access' }));

    expect(screen.getByText('Access content')).toBeInTheDocument();
    expect(screen.queryByText('Profile content')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Access' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens directly on the tab named in the URL', () => {
    renderWithProviders(<UserDetailsTabs tabs={TABS} />, {
      initialEntries: ['/?selectedtab=health'],
    });

    expect(screen.getByText('Health content')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Health' })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to the first tab when the URL names one that does not exist', () => {
    renderWithProviders(<UserDetailsTabs tabs={TABS} />, {
      initialEntries: ['/?selectedtab=nonexistent'],
    });

    expect(screen.getByText('Profile content')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders nothing below the strip when there are no tabs at all', () => {
    const { container } = renderWithProviders(<UserDetailsTabs tabs={[]} />);

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(container.querySelector('.MuiTabs-root')).toBeInTheDocument();
  });
});
