import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardHeader from './DashboardHeader';

describe('DashboardHeader', () => {
  it('shows the signed-in person with their photo and roles', () => {
    const { container } = render(
      <DashboardHeader
        firstName="asha"
        photo="https://cdn.duncit.com/users/asha.jpg"
        roles={['CLUB_ADMIN', 'ONBOARDING_MANAGER']}
      />,
    );
    expect(screen.getByTestId('onboarding-dashboard-title')).toHaveTextContent('Welcome back, asha');
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.duncit.com/users/asha.jpg');
    expect(screen.getByText('CLUB ADMIN')).toBeInTheDocument();
    expect(screen.getByText('ONBOARDING MANAGER')).toBeInTheDocument();
  });

  // No photo on file: the avatar falls back to the first letter of the name.
  it('falls back to an initial when there is no photo', () => {
    const { container } = render(<DashboardHeader firstName="asha" photo={null} roles={[]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
