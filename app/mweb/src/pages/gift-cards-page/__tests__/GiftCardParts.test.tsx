import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import MyCardTile from '../MyCardTile';
import ThemePicker from '../ThemePicker';
import GiftRecipientFields from '../GiftRecipientFields';
import { fallbackT } from '../../../i18n/fallback';
import type { GiftCard, GiftCardCategory } from '../queries';

const h = vi.hoisted(() => ({ shareUrl: vi.fn(), success: vi.fn() }));

vi.mock('../../../lib/share-link', () => ({ shareUrl: h.shareUrl }));
vi.mock('../../../components/notify', () => ({ notifySuccess: h.success, notifyError: vi.fn() }));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDate: (d: string) => `day:${d}` }),
}));
vi.mock('../GiftCardVisual', () => ({
  default: (p: Record<string, unknown>) => (
    <div
      data-testid="visual"
      data-scope={String(p.scopeType)}
      data-category={String(p.scopeCategoryId)}
      data-front={String(p.artworkFrontUrl)}
      data-icon={String(p.scopeImageUrl)}
      data-code={String(p.code)}
      data-compact={String(Boolean(p.compact))}
    />
  ),
}));

const card = (over: Partial<GiftCard> = {}): GiftCard => ({
  id: 'g1',
  code: 'ABCD-1234',
  scope_type: 'SHOP',
  scope_category_id: null,
  scope_name: '',
  scope_image_url: '',
  scope_image_front_url: '',
  scope_image_back_url: '',
  initial_amount: 500,
  balance: 500,
  status: 'ACTIVE',
  recipient_email: 'friend@example.com',
  recipient_name: 'Friend',
  message: '',
  redeemed: false,
  redeemed_at: null,
  expires_at: '2027-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  sender_name: null,
  ...over,
});

describe('MyCardTile', () => {
  const writeText = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    h.shareUrl.mockResolvedValue('https://duncit.test/s/abc');
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  afterEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  const tile = (c = card(), showRecipient = false) =>
    render(<MyCardTile card={c} currencySymbol="₹" senderName="Asha" showRecipient={showRecipient} />);

  it.each([
    ['ACTIVE', 'mweb.giftCards.statusActive'],
    ['REDEEMED', 'mweb.giftCards.statusRedeemed'],
    ['EXPIRED', 'mweb.giftCards.statusExpired'],
  ] as const)('labels a %s card', (status, key) => {
    tile(card({ status }));
    expect(screen.getByTestId('gift-card-row-g1')).toHaveTextContent(fallbackT(key));
    expect(screen.getByTestId('gift-card-row-g1')).toHaveTextContent('day:2027-01-01T00:00:00.000Z');
    expect(screen.getByTestId('visual')).toHaveAttribute('data-code', 'ABCD-1234');
  });

  it('copies the code and confirms', async () => {
    tile();
    fireEvent.click(screen.getByTestId('gift-card-copy-g1'));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.giftCards.codeCopied')));
    expect(writeText).toHaveBeenCalledWith('ABCD-1234');
  });

  it('stays quiet when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    tile();
    fireEvent.click(screen.getByTestId('gift-card-copy-g1'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(h.success).not.toHaveBeenCalled();
  });

  it('shares through the native sheet with the tracked link and message', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    tile();
    fireEvent.click(screen.getByTestId('gift-card-share-g1'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(h.shareUrl).toHaveBeenCalledWith(
      'GIFT_CARD',
      'ABCD-1234',
      `${window.location.origin}/gift-card/ABCD-1234`
    );
    const arg = share.mock.calls[0][0];
    expect(arg.url).toBe('https://duncit.test/s/abc');
    expect(arg.title).toBe(fallbackT('mweb.giftCards.title'));
    expect(arg.text).toContain('Asha');
    expect(arg.text).toContain('500');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the message and link when the browser cannot share', async () => {
    tile();
    fireEvent.click(screen.getByTestId('gift-card-share-g1'));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.referral.linkCopied')));
    expect(writeText.mock.calls[0][0]).toMatch(/ https:\/\/duncit\.test\/s\/abc$/);
  });

  it('ignores a cancelled share', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'));
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    tile();
    fireEvent.click(screen.getByTestId('gift-card-share-g1'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(h.success).not.toHaveBeenCalled();
  });

  it('names the recipient on a gifted card, falling back to their email', () => {
    const { unmount } = tile(card(), true);
    expect(screen.getByTestId('gift-card-row-g1')).toHaveTextContent('Friend');
    unmount();
    tile(card({ recipient_name: '' }), true);
    expect(screen.getByTestId('gift-card-row-g1')).toHaveTextContent('friend@example.com');
  });

  it('shows no recipient line by default', () => {
    tile();
    expect(screen.getByTestId('gift-card-row-g1')).not.toHaveTextContent('friend@example.com');
  });
});

describe('ThemePicker', () => {
  const cat = (id: string, level: GiftCardCategory['level'], over: Partial<GiftCardCategory> = {}): GiftCardCategory => ({
    id,
    name: `Cat ${id}`,
    slug: id,
    icon: 'https://img/i.png',
    level,
    parent_id: null,
    gift_card_image_front: 'https://img/f.png',
    gift_card_image_back: 'https://img/b.png',
    ...over,
  });
  const categories = [cat('s1', 'SUPER'), cat('c1', 'CATEGORY', { icon: null }), cat('c2', 'CATEGORY')];

  const picker = (scopeType: 'SHOP' | 'SUPER' | 'CATEGORY' | 'SUB', scopeCategoryId: string | null = null) => {
    const onGroup = vi.fn();
    const onPick = vi.fn();
    render(
      <ThemePicker
        categories={categories}
        scopeType={scopeType}
        scopeCategoryId={scopeCategoryId}
        amount={750}
        currencySymbol="₹"
        onGroup={onGroup}
        onPick={onPick}
      />
    );
    return { onGroup, onPick };
  };

  it('shows the single fixed Pod Shop card with its caption', () => {
    picker('SHOP');
    expect(screen.getByTestId('theme-picker-shop')).toHaveTextContent(fallbackT('mweb.giftCards.shopThemeCaption'));
    expect(screen.getByTestId('visual')).toHaveAttribute('data-scope', 'SHOP');
    expect(screen.getByTestId('gift-card-group-SHOP')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gift-card-group-SUPER')).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches group on press', () => {
    const { onGroup } = picker('SHOP');
    fireEvent.click(screen.getByTestId('gift-card-group-CATEGORY'));
    expect(onGroup).toHaveBeenCalledWith('CATEGORY');
  });

  it('fans out only the options of the active level, marking the selected one, and picks', () => {
    const { onPick } = picker('CATEGORY', 'c2');
    expect(screen.queryByTestId('gift-card-theme-s1')).not.toBeInTheDocument();
    expect(screen.getByTestId('gift-card-theme-c1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('gift-card-theme-c2')).toHaveAttribute('aria-pressed', 'true');
    const visuals = screen.getAllByTestId('visual');
    expect(visuals[0]).toHaveAttribute('data-icon', '');
    expect(visuals[1]).toHaveAttribute('data-front', 'https://img/f.png');
    expect(visuals[0]).toHaveAttribute('data-compact', 'true');
    fireEvent.click(screen.getByTestId('gift-card-theme-c1'));
    expect(onPick).toHaveBeenCalledWith(categories[1]);
  });

  it('renders an empty rail for a level with no categories', () => {
    picker('SUB');
    expect(screen.queryByTestId('visual')).not.toBeInTheDocument();
  });
});

describe('GiftRecipientFields', () => {
  const fields = (over: Partial<Parameters<typeof GiftRecipientFields>[0]> = {}) => {
    const props = {
      gift: true,
      onGift: vi.fn(),
      email: 'a@b.co',
      onEmail: vi.fn(),
      emailError: false,
      name: 'Bob',
      onName: vi.fn(),
      message: 'Enjoy',
      onMessage: vi.fn(),
      ...over,
    };
    render(<GiftRecipientFields {...props} />);
    return props;
  };

  it('hides the recipient inputs when the card is for myself', () => {
    fields({ gift: false });
    expect(screen.queryByTestId('gift-card-recipient-email')).not.toBeInTheDocument();
    expect(screen.getByTestId('gift-card-for-myself')).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles between self and gift, ignoring a deselect', () => {
    const props = fields({ gift: false });
    fireEvent.click(screen.getByTestId('gift-card-for-someone'));
    expect(props.onGift).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByTestId('gift-card-for-myself'));
    expect(props.onGift).toHaveBeenCalledTimes(1);
  });

  it('reports each recipient field edit', () => {
    const props = fields();
    fireEvent.change(screen.getByTestId('gift-card-recipient-email-input'), { target: { value: 'x@y.co' } });
    fireEvent.change(screen.getByTestId('gift-card-recipient-name-input'), { target: { value: 'Zed' } });
    fireEvent.change(screen.getByTestId('gift-card-message-input'), { target: { value: 'Hi' } });
    expect(props.onEmail).toHaveBeenCalledWith('x@y.co');
    expect(props.onName).toHaveBeenCalledWith('Zed');
    expect(props.onMessage).toHaveBeenCalledWith('Hi');
  });

  it('shows the hint normally and the validation message on an invalid email', () => {
    fields();
    expect(screen.getByText(fallbackT('mweb.giftCards.recipientEmailHint'))).toBeInTheDocument();
  });

  it('flags an invalid email', () => {
    fields({ emailError: true });
    expect(screen.getByText(fallbackT('mweb.auth.validation.emailInvalid'))).toBeInTheDocument();
    expect(screen.getByTestId('gift-card-recipient-email-input')).toHaveAttribute('aria-invalid', 'true');
  });
});
