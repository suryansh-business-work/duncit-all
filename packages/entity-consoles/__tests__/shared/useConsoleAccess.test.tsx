import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const { useUserDataMock } = vi.hoisted(() => ({ useUserDataMock: vi.fn() }));

vi.mock('@duncit/user-context', () => ({ useUserData: useUserDataMock }));

import { useConsoleAccess } from '../../src/shared/useConsoleAccess';

/**
 * Who may govern a directory record.
 *
 * This decides nothing — the server enforces the split — but it decides what the
 * screen OFFERS, so a wrong answer here shows an admin a control that will be
 * refused, or hides one they are entitled to.
 */
function readAccess(roles: string[] | null | undefined) {
  useUserDataMock.mockReturnValue({ user: roles === undefined ? null : { roles } });
  let canGovern: boolean | undefined;
  function Probe() {
    canGovern = useConsoleAccess().canGovern;
    return null;
  }
  render(<Probe />);
  return canGovern;
}

describe('useConsoleAccess', () => {
  it.each(['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER'])(
    'lets %s govern',
    (role) => {
      expect(readAccess([role])).toBe(true);
    },
  );

  it.each([
    'ALL_VENUES_ACCESS',
    'ALL_HOSTS_ACCESS',
    'ALL_CLUBS_ACCESS',
    'ALL_CLUB_ADMINS_ACCESS',
    'ALL_PODS_ACCESS',
  ])('does NOT let %s govern — a console role edits, it does not approve', (role) => {
    expect(readAccess([role])).toBe(false);
  });

  it('governs when a console role is held ALONGSIDE an admin role', () => {
    expect(readAccess(['ALL_VENUES_ACCESS', 'CITY_ADMIN'])).toBe(true);
  });

  it('reads a missing role list as cannot-govern, which is the safe direction', () => {
    // The worst case is an admin who reloads, not a control that silently fails.
    expect(readAccess(null)).toBe(false);
    expect(readAccess([])).toBe(false);
    expect(readAccess(undefined)).toBe(false);
  });
});
