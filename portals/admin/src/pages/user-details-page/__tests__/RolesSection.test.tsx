import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import RolesSection from '../RolesSection';
import { renderWithProviders } from './testkit';

describe('RolesSection — no roles', () => {
  it('shows the empty-roles warning when the user has no roles array at all', () => {
    renderWithProviders(
      <RolesSection user={{}} roleByKey={{}} onManageRoles={vi.fn()} />,
    );

    expect(screen.getByText('No roles assigned.')).toBeInTheDocument();
  });

  it('shows the same warning when roles is an empty array', () => {
    renderWithProviders(
      <RolesSection user={{ roles: [] }} roleByKey={{}} onManageRoles={vi.fn()} />,
    );

    expect(screen.getByText('No roles assigned.')).toBeInTheDocument();
  });
});

describe('RolesSection — assigned roles', () => {
  it('labels a role chip from roleByKey, and falls back to the raw key when unknown', () => {
    renderWithProviders(
      <RolesSection
        user={{ roles: ['HOST', 'CLUB_ADMIN'] }}
        roleByKey={{ HOST: { name: 'Host' } }}
        onManageRoles={vi.fn()}
      />,
    );

    expect(screen.queryByText('No roles assigned.')).toBeNull();
    expect(screen.getByText('Host')).toBeInTheDocument();
    // CLUB_ADMIN has no entry in roleByKey, so the raw key is shown instead.
    expect(screen.getByText('CLUB_ADMIN')).toBeInTheDocument();
  });

  it('calls onManageRoles when the button is clicked', () => {
    const onManageRoles = vi.fn();
    renderWithProviders(
      <RolesSection user={{ roles: ['HOST'] }} roleByKey={{ HOST: { name: 'Host' } }} onManageRoles={onManageRoles} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Manage Roles' }));

    expect(onManageRoles).toHaveBeenCalledTimes(1);
  });
});
