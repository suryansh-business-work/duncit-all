import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, act } from '@testing-library/react';

import DuncitCoinCard from '../DuncitCoinCard';
import ProfileIdentity from '../ProfileIdentity';
import StudioOptionsCard from '../StudioOptionsCard';
import { QuickTile } from '../QuickActionGrid';
import { useQuickAccess } from '../useQuickAccess';
import { COIN_DESTINATION } from '../profileSections';
import { fallbackT } from '../../../../i18n/fallback';

const h = vi.hoisted(() => ({ user: vi.fn(), warn: vi.fn() }));
vi.mock('../../../../user-info/useUserInfo', () => ({ useUserInfo: h.user }));
vi.mock('@duncit/logs', () => ({ logs: { mWeb: { warn: h.warn, error: vi.fn() } } }));

describe('DuncitCoinCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the balance and earn-back caption, and opens the ledger on press, Enter and Space', () => {
    h.user.mockReturnValue({ coinBalance: { balance: 120, earn_pct: 5 }, loading: false });
    const onNavigate = vi.fn();
    render(<DuncitCoinCard onNavigate={onNavigate} />);
    const card = screen.getByTestId('sidebar-duncit-coin');
    expect(screen.getByTestId('sidebar-duncit-coin-balance')).toHaveTextContent('120');
    expect(card).toHaveTextContent(fallbackT('mweb.coin.sidebarCaption', { vars: { pct: 5 } }));
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(card, { key: 'a' });
    expect(onNavigate).toHaveBeenCalledTimes(3);
    expect(onNavigate).toHaveBeenCalledWith(COIN_DESTINATION.to);
  });

  it('shows skeletons rather than a zero balance while the account is still loading', () => {
    h.user.mockReturnValue({ coinBalance: null, loading: true });
    render(<DuncitCoinCard onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('sidebar-duncit-coin-balance')).not.toBeInTheDocument();
  });

  it('falls back to a zero balance and zero percent when the account has no coin data', () => {
    h.user.mockReturnValue({ coinBalance: null, loading: false });
    render(<DuncitCoinCard onNavigate={vi.fn()} />);
    expect(screen.getByTestId('sidebar-duncit-coin-balance')).toHaveTextContent('0');
    expect(screen.getByTestId('sidebar-duncit-coin')).toHaveTextContent(
      fallbackT('mweb.coin.sidebarCaption', { vars: { pct: 0 } })
    );
  });
});

describe('ProfileIdentity', () => {
  const identity = (me: Parameters<typeof ProfileIdentity>[0]['me']) => {
    const onClick = vi.fn();
    render(<ProfileIdentity me={me} onClick={onClick}><span data-testid="nudge" /></ProfileIdentity>);
    return onClick;
  };

  it.each([
    [{ first_name: 'asha', full_name: 'Bela Shah' }, 'A'],
    [{ first_name: null, full_name: 'bela shah' }, 'B'],
    [{ first_name: null, full_name: null }, 'U'],
    [null, 'U'],
  ])('shows the initial for %j', (me, initial) => {
    identity(me);
    expect(screen.getByTestId('sidebar-identity')).toHaveTextContent(initial);
  });

  it('opens the profile and renders the nudge as a sibling of the row', () => {
    const onClick = identity({ first_name: 'A' });
    fireEvent.click(screen.getByTestId('sidebar-identity'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('nudge').closest('button')).toBeNull();
  });
});

describe('QuickTile badge', () => {
  const tile = { key: 'chats', label: 'Chats', icon: 'chats', to: '/chats' } as never;

  it('caps a large unread count at 9+, and names the badge for assistive tech', () => {
    render(<QuickTile tile={tile} badgeCount={25} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('sidebar-grid-badge')).toHaveTextContent('9+');
    expect(screen.getByTestId('sidebar-grid-chats')).toHaveAttribute('aria-describedby', 'sidebar-grid-chats-badge');
  });

  it('shows the exact count up to nine and no badge at zero or unset', () => {
    const { rerender } = render(<QuickTile tile={tile} badgeCount={9} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('sidebar-grid-badge')).toHaveTextContent('9');
    rerender(<QuickTile tile={tile} badgeCount={0} onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('sidebar-grid-badge')).not.toBeInTheDocument();
    rerender(<QuickTile tile={tile} onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('sidebar-grid-badge')).not.toBeInTheDocument();
  });
});

describe('StudioOptionsCard', () => {
  it('opens the studio page on press, Enter and Space only', () => {
    const onNavigate = vi.fn();
    render(<StudioOptionsCard entry={{ labelKey: 'mweb.common.pod', hintKey: 'mweb.common.pod', path: '/studio' } as never} onNavigate={onNavigate} />);
    const card = screen.getByTestId('sidebar-studio-options');
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(card, { key: 'x' });
    expect(onNavigate).toHaveBeenCalledTimes(3);
    expect(onNavigate).toHaveBeenCalledWith('/studio');
  });
});

describe('useQuickAccess', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('falls back to the default grid and logs when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useQuickAccess({}));
    expect(result.current.selection.length).toBeGreaterThan(0);
    expect(h.warn).toHaveBeenCalledWith('quickAccess', 'read', expect.any(Object));
  });

  it('keeps a pick for this visit and reports false when the write is refused', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useQuickAccess({}));
    let saved = true;
    act(() => {
      saved = result.current.save(['chats']);
    });
    expect(saved).toBe(false);
    expect(result.current.selection).toContain('chats');
    expect(h.warn).toHaveBeenCalledWith('quickAccess', 'write', expect.any(Object));
  });

  it('persists a pick and reports true', () => {
    const { result } = renderHook(() => useQuickAccess({}));
    let saved = false;
    act(() => {
      saved = result.current.save(['chats']);
    });
    expect(saved).toBe(true);
    expect(Object.values(localStorage).join('')).toContain('chats');
  });
});
