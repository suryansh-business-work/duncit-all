import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DuncitUser } from '@duncit/user-context';
import { SidebarUserCard } from '../src/chrome/AppSidebar/SidebarUserCard';

describe('SidebarUserCard', () => {
  it('renders nothing without a user', () => {
    const { container } = render(<SidebarUserCard fallbackName="Portal" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the display name, email and initials', () => {
    render(
      <SidebarUserCard
        user={{ user_id: 'u1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@x.test' } as DuncitUser}
        fallbackName="P"
      />
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@x.test')).toBeInTheDocument();
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('hides the email line when the user has no email', () => {
    render(<SidebarUserCard user={{ user_id: 'u1', full_name: 'Ada Lovelace' } as DuncitUser} fallbackName="P" />);
    expect(screen.queryByText('ada@x.test')).not.toBeInTheDocument();
  });
});
