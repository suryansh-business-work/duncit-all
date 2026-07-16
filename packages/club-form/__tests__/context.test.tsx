import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClubFormDataProvider, useClubFormData } from '../src/context';
import type { ClubFormData } from '../src/types';

function Consumer() {
  const { config } = useClubFormData();
  return <span>admins:{String(config.showAdmins)}</span>;
}

describe('ClubFormData context', () => {
  it('returns the injected value inside the provider', () => {
    const value: ClubFormData = {
      config: { showAdmins: true, showVerified: false, showIsActive: false },
      initialAdmins: [],
    };
    render(
      <ClubFormDataProvider value={value}>
        <Consumer />
      </ClubFormDataProvider>,
    );
    expect(screen.getByText('admins:true')).toBeInTheDocument();
  });

  it('throws when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Consumer />)).toThrow('useClubFormData must be used within <ClubForm>');
    spy.mockRestore();
  });
});
