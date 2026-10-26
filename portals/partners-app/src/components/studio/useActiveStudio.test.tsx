import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { ACTIVE_STUDIO_KEY, useActiveStudio } from './useActiveStudio';
import { PARTNER_SECTIONS } from '../../config/partner-sections';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const at = (path: string) => ({ wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter> });
const role = PARTNER_SECTIONS.find((section) => section.role !== 'CLUB_ADMIN')?.role ?? 'HOST';

describe('useActiveStudio', () => {
  it('falls back to the remembered studio on a page that belongs to no studio', () => {
    localStorage.setItem(ACTIVE_STUDIO_KEY, role);
    expect(renderHook(() => useActiveStudio(), at('/wallet')).result.current).toBe(role);
  });

  it('ignores a remembered value that names no studio', () => {
    localStorage.setItem(ACTIVE_STUDIO_KEY, 'NOT_A_STUDIO');
    expect(renderHook(() => useActiveStudio(), at('/wallet')).result.current).toBeNull();
  });

  it('remembers the studio a studio route names, and lets the route win over the remembered one', () => {
    localStorage.setItem(ACTIVE_STUDIO_KEY, role);
    const result = renderHook(() => useActiveStudio(), at('/club-admin/pods')).result;
    expect(result.current).toBe('CLUB_ADMIN');
    expect(localStorage.getItem(ACTIVE_STUDIO_KEY)).toBe('CLUB_ADMIN');
  });

  it('follows the route when storage cannot be read or written', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(renderHook(() => useActiveStudio(), at('/wallet')).result.current).toBeNull();
    const result = renderHook(() => useActiveStudio(), at('/club-admin/pods')).result;
    expect(result.current).toBe('CLUB_ADMIN');
  });
});
