import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import AmountPicker from '../AmountPicker';
import BuyTab from '../BuyTab';
import MyCardsTab from '../MyCardsTab';
import GiftCardVisual from '../GiftCardVisual';
import GiftCardFace from '../GiftCardFace';
import { giftCardGradient, GIFT_CARD_GRADIENTS } from '../giftCardTheme';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ useQuery: vi.fn(), me: { current: undefined as unknown } }));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery }));
vi.mock('../../../user-info/useUserInfo', () => ({ useUserInfo: () => ({ me: h.me.current }) }));
vi.mock('../MyCardTile', () => ({
  default: (p: { card: { id: string }; senderName: string; currencySymbol: string; showRecipient?: boolean }) => (
    <div data-testid={`tile-${p.card.id}`} data-sender={p.senderName} data-currency={p.currencySymbol} data-recipient={String(Boolean(p.showRecipient))} />
  ),
}));

const settings = { min_amount: 100, max_amount: 5000, denominations: [500, 1000] };
const categories = [
  { id: 'c1', name: 'Fitness', slug: 'f', icon: 'https://img/i.png', level: 'CATEGORY', parent_id: null, gift_card_image_front: 'https://img/f.png', gift_card_image_back: 'https://img/b.png' },
  { id: 'c2', name: 'Plain', slug: 'p', icon: null, level: 'CATEGORY', parent_id: null, gift_card_image_front: '', gift_card_image_back: '' },
];

beforeEach(() => {
  vi.clearAllMocks();
  h.me.current = undefined;
});

describe('AmountPicker', () => {
  const picker = (amountStr: string) => {
    const onChange = vi.fn();
    render(<AmountPicker settings={settings as never} currencySymbol="₹" amountStr={amountStr} onChange={onChange} />);
    return onChange;
  };

  it('offers each configured denomination, marks the matching one and writes a pick into the single amount', () => {
    const onChange = picker('500');
    expect(screen.getByTestId('gift-card-amount-500')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gift-card-amount-1000')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('gift-card-amount-1000'));
    expect(onChange).toHaveBeenCalledWith('1000');
    fireEvent.change(screen.getByTestId('gift-card-custom-amount-input'), { target: { value: '750' } });
    expect(onChange).toHaveBeenCalledWith('750');
  });

  it('states the allowed range and flags an amount outside it, but not a blank or a valid one', () => {
    const { unmount } = render(<AmountPicker settings={settings as never} currencySymbol="₹" amountStr="50" onChange={vi.fn()} />);
    expect(screen.getByTestId('gift-card-custom-amount-input')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(fallbackT('mweb.giftCards.amountRangeHint', { vars: { min: '₹100', max: '₹5,000' } }))).toBeInTheDocument();
    unmount();
    const blank = render(<AmountPicker settings={settings as never} currencySymbol="₹" amountStr="" onChange={vi.fn()} />);
    expect(screen.getByTestId('gift-card-custom-amount-input')).toHaveAttribute('aria-invalid', 'false');
    blank.unmount();
    render(<AmountPicker settings={settings as never} currencySymbol="₹" amountStr="999" onChange={vi.fn()} />);
    expect(screen.getByTestId('gift-card-custom-amount-input')).toHaveAttribute('aria-invalid', 'false');
  });

  it('flags a non-numeric entry', () => {
    render(<AmountPicker settings={settings as never} currencySymbol="₹" amountStr="abc" onChange={vi.fn()} />);
    expect(screen.getByTestId('gift-card-custom-amount-input')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('GiftCardFace and GiftCardVisual', () => {
  const face = (props: object = {}) =>
    render(
      <GiftCardFace side="FRONT" scopeType="CATEGORY" scopeCategoryId="c1" scopeName="Fitness" scopeImageUrl="" artworkUrl="" amount={500} currencySymbol="₹" testId="face" {...props} />
    );

  it('draws the gradient front with the name, amount and no artwork', () => {
    face();
    expect(screen.getByTestId('face')).toHaveTextContent('Fitness');
    expect(screen.getByTestId('face')).toHaveTextContent('₹500');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('prints the code on an owned card, and uses the localized title for a shop card', () => {
    face({ code: 'ABCD-1234', scopeType: 'SHOP', scopeCategoryId: null, scopeName: '' });
    expect(screen.getByTestId('face')).toHaveTextContent('ABCD-1234');
    expect(screen.getByTestId('face')).toHaveTextContent(fallbackT('mweb.giftCards.shopTheme'));
  });

  it('seeds the palette from the name, then the scope type, when there is no category id', () => {
    face({ scopeCategoryId: null });
    face({ scopeCategoryId: null, scopeName: '', scopeType: 'SUPER', testId: 'face2' });
    expect(screen.getByTestId('face2')).toBeInTheDocument();
  });

  it('shows the uploaded artwork, falling back to the gradient when it fails to load', () => {
    face({ artworkUrl: 'https://img/art.png', scopeImageUrl: 'https://img/i.png' });
    const art = screen.getByRole('img', { name: fallbackT('mweb.giftCards.cardFront') });
    expect(art).toHaveAttribute('src', 'https://img/art.png');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    fireEvent.error(art);
    expect(screen.queryByRole('img', { name: fallbackT('mweb.giftCards.cardFront') })).not.toBeInTheDocument();
    // With the artwork gone, the small scope icon appears on the gradient.
    expect(document.querySelector('img[src="https://img/i.png"]')).not.toBeNull();
  });

  it('drops a scope icon that fails to load, and names the back of the card', () => {
    face({ scopeImageUrl: 'https://img/i.png' });
    const icon = document.querySelector('img[src="https://img/i.png"]') as HTMLImageElement;
    fireEvent.error(icon);
    expect(document.querySelector('img[src="https://img/i.png"]')).toBeNull();
    face({ side: 'BACK', artworkUrl: 'https://img/back.png', testId: 'back' });
    expect(screen.getByRole('img', { name: fallbackT('mweb.giftCards.cardBack') })).toBeInTheDocument();
    expect(screen.getByTestId('back')).not.toHaveTextContent('₹500');
  });

  it('uses the denser layout when compact', () => {
    face({ compact: true, scopeImageUrl: 'https://img/i.png' });
    expect(screen.getByTestId('face')).toBeInTheDocument();
  });

  it('stays flat for a gradient card and flips once either face has artwork', () => {
    const { unmount } = render(<GiftCardVisual scopeType="CATEGORY" scopeCategoryId="c1" scopeName="Fitness" scopeImageUrl="" amount={500} currencySymbol="₹" />);
    expect(screen.queryByTestId('gift-card-flip')).not.toBeInTheDocument();
    unmount();
    render(<GiftCardVisual scopeType="CATEGORY" scopeCategoryId="c1" scopeName="Fitness" scopeImageUrl="" artworkFrontUrl="https://img/f.png" artworkBackUrl="https://img/b.png" amount={500} currencySymbol="₹" code="ABCD" />);
    fireEvent.click(screen.getByTestId('gift-card-flip'));
    fireEvent.click(screen.getByTestId('gift-card-flip'));
    expect(screen.getByTestId('gift-card-flip')).toHaveAccessibleName(fallbackT('mweb.giftCards.flipCard'));
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('never flips the compact picker tiles', () => {
    render(<GiftCardVisual compact scopeType="CATEGORY" scopeCategoryId="c1" scopeName="Fitness" scopeImageUrl="" artworkFrontUrl="https://img/f.png" amount={500} currencySymbol="₹" />);
    expect(screen.queryByTestId('gift-card-flip')).not.toBeInTheDocument();
  });

  it('gives the same seed the same gradient, always one from the palette', () => {
    expect(giftCardGradient('abc')).toEqual(giftCardGradient('abc'));
    expect(GIFT_CARD_GRADIENTS).toContainEqual(giftCardGradient('another seed'));
    expect(giftCardGradient('')).toEqual(GIFT_CARD_GRADIENTS[0]);
  });
});

describe('BuyTab', () => {
  const Where = () => {
    const location = useLocation();
    return <div data-testid="where" data-state={JSON.stringify(location.state)}>{location.pathname}</div>;
  };
  const queries = (state: { settings?: object; categories?: object[]; finance?: object; loading?: boolean; settingsError?: boolean; categoriesError?: boolean } = {}) =>
    h.useQuery.mockImplementation((doc: { loc?: { source: { body: string } } }) => {
      const body = doc.loc?.source.body ?? '';
      if (body.includes('publicGiftCardSettings')) {
        return { data: state.settings ? { publicGiftCardSettings: state.settings } : undefined, loading: state.loading ?? false, error: state.settingsError ? new Error('x') : undefined };
      }
      if (body.includes('categories')) return { data: state.categories ? { categories: state.categories } : undefined, error: state.categoriesError ? new Error('x') : undefined };
      return { data: state.finance };
    });
  const mount = () =>
    render(
      <MemoryRouter initialEntries={['/gift-cards']}>
        <Routes>
          <Route path="/gift-cards" element={<BuyTab />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows a spinner while the settings load, and the how-it-works card regardless', () => {
    queries({ loading: true });
    mount();
    expect(screen.getByTestId('gift-cards-buy-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('gift-card-continue')).not.toBeInTheDocument();
  });

  it('shows the load error when settings or categories fail', () => {
    queries({ settingsError: true });
    const { unmount } = mount();
    expect(screen.getByTestId('gift-cards-buy-error')).toBeInTheDocument();
    unmount();
    queries({ settings, categoriesError: true });
    mount();
    expect(screen.getByTestId('gift-cards-buy-error')).toBeInTheDocument();
  });

  it('keeps Continue off until the amount is valid, then sends the shop card to checkout', async () => {
    queries({ settings, categories, finance: { publicFinanceSettings: { currency_symbol: '$' } } });
    mount();
    const go = screen.getByTestId('gift-card-continue');
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByTestId('gift-card-custom-amount-input'), { target: { value: '50' } });
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByTestId('gift-card-amount-1000'));
    expect(go).toBeEnabled();
    fireEvent.click(go);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards/checkout'));
    expect(JSON.parse(screen.getByTestId('where').getAttribute('data-state') ?? '{}')).toEqual({
      scope_type: 'SHOP',
      scope_category_id: null,
      scope_name: '',
      scope_image_url: '',
      scope_image_front_url: '',
      scope_image_back_url: '',
      amount: 1000,
      gift: false,
      recipient_email: '',
      recipient_name: '',
      message: '',
    });
  });

  it('needs a theme picked for a category card, and sends its name, icon and artwork', async () => {
    queries({ settings, categories });
    mount();
    fireEvent.click(screen.getByTestId('gift-card-group-CATEGORY'));
    fireEvent.click(screen.getByTestId('gift-card-amount-500'));
    expect(screen.getByTestId('gift-card-continue')).toBeDisabled();
    fireEvent.click(screen.getByTestId('gift-card-theme-c1'));
    fireEvent.click(screen.getByTestId('gift-card-continue'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards/checkout'));
    expect(JSON.parse(screen.getByTestId('where').getAttribute('data-state') ?? '{}')).toMatchObject({
      scope_type: 'CATEGORY',
      scope_category_id: 'c1',
      scope_name: 'Fitness',
      scope_image_url: 'https://img/i.png',
      scope_image_front_url: 'https://img/f.png',
      scope_image_back_url: 'https://img/b.png',
      amount: 500,
    });
  });

  it('sends empty icon and artwork for a category that ships none', async () => {
    queries({ settings, categories });
    mount();
    fireEvent.click(screen.getByTestId('gift-card-group-CATEGORY'));
    fireEvent.click(screen.getByTestId('gift-card-amount-500'));
    fireEvent.click(screen.getByTestId('gift-card-theme-c2'));
    fireEvent.click(screen.getByTestId('gift-card-continue'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards/checkout'));
    expect(JSON.parse(screen.getByTestId('where').getAttribute('data-state') ?? '{}')).toMatchObject({ scope_name: 'Plain', scope_image_url: '', scope_image_front_url: '', scope_image_back_url: '' });
  });

  it('resets the chosen theme when the group changes', () => {
    queries({ settings, categories });
    mount();
    fireEvent.click(screen.getByTestId('gift-card-group-CATEGORY'));
    fireEvent.click(screen.getByTestId('gift-card-theme-c1'));
    fireEvent.click(screen.getByTestId('gift-card-group-SUPER'));
    fireEvent.click(screen.getByTestId('gift-card-amount-500'));
    expect(screen.getByTestId('gift-card-continue')).toBeDisabled();
  });

  it('sends a gift with a trimmed recipient, and blocks Continue on an invalid or missing email', async () => {
    queries({ settings, categories });
    mount();
    fireEvent.click(screen.getByTestId('gift-card-amount-500'));
    fireEvent.click(screen.getByTestId('gift-card-for-someone'));
    expect(screen.getByTestId('gift-card-continue')).toBeDisabled();
    fireEvent.change(screen.getByTestId('gift-card-recipient-email-input'), { target: { value: 'nope' } });
    expect(screen.getByTestId('gift-card-recipient-email-input')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('gift-card-continue')).toBeDisabled();
    fireEvent.change(screen.getByTestId('gift-card-recipient-email-input'), { target: { value: '  friend@example.com ' } });
    fireEvent.change(screen.getByTestId('gift-card-recipient-name-input'), { target: { value: '  Friend ' } });
    fireEvent.change(screen.getByTestId('gift-card-message-input'), { target: { value: '  Enjoy ' } });
    fireEvent.click(screen.getByTestId('gift-card-continue'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards/checkout'));
    expect(JSON.parse(screen.getByTestId('where').getAttribute('data-state') ?? '{}')).toMatchObject({
      gift: true,
      recipient_email: 'friend@example.com',
      recipient_name: 'Friend',
      message: 'Enjoy',
    });
  });

  it('previews the first denomination, or the minimum, before an amount is valid', () => {
    queries({ settings: { ...settings, denominations: [] }, categories });
    mount();
    expect(screen.getByTestId('theme-picker-shop')).toBeInTheDocument();
  });

  it('copes with settings that list no denominations and no minimum preview', () => {
    queries({ settings: { min_amount: 0, max_amount: 10, denominations: [] }, categories: undefined });
    mount();
    expect(screen.getByTestId('theme-picker-shop')).toBeInTheDocument();
  });
});

describe('MyCardsTab', () => {
  const queries = (state: { data?: object; loading?: boolean; error?: boolean; finance?: object }) =>
    h.useQuery.mockImplementation((doc: { loc?: { source: { body: string } } }) => {
      const body = doc.loc?.source.body ?? '';
      if (body.includes('myGiftCards')) return { data: state.data, loading: state.loading ?? false, error: state.error ? new Error('x') : undefined };
      return { data: state.finance };
    });

  it('shows a spinner while loading with nothing yet', () => {
    queries({ loading: true });
    render(<MyCardsTab />);
    expect(screen.getByTestId('gift-cards-loading')).toBeInTheDocument();
  });

  it('shows the error, with no empty state under it', () => {
    queries({ error: true, data: { myGiftCards: { owned: [], gifted: [] } } });
    render(<MyCardsTab />);
    expect(screen.getByTestId('gift-cards-error')).toBeInTheDocument();
    expect(screen.queryByTestId('gift-cards-empty')).not.toBeInTheDocument();
  });

  it('shows the empty state when the member has no cards at all', () => {
    queries({ data: { myGiftCards: { owned: [], gifted: [] } } });
    render(<MyCardsTab />);
    expect(screen.getByTestId('gift-cards-empty')).toHaveTextContent(fallbackT('mweb.giftCards.myCardsEmpty'));
  });

  it('shows no empty state, and an empty list, before any answer when not loading', () => {
    queries({ data: undefined });
    render(<MyCardsTab />);
    expect(screen.getByTestId('gift-cards-empty')).toBeInTheDocument();
  });

  it('lists held cards, then the gifted-away ones with their recipient, using the holder name and currency', () => {
    h.me.current = { full_name: 'Asha Rao' };
    queries({
      data: { myGiftCards: { owned: [{ id: 'g1' }], gifted: [{ id: 'g2' }] } },
      finance: { publicFinanceSettings: { currency_symbol: '$' } },
    });
    render(<MyCardsTab />);
    expect(screen.getByTestId('tile-g1')).toHaveAttribute('data-sender', 'Asha Rao');
    expect(screen.getByTestId('tile-g1')).toHaveAttribute('data-currency', '$');
    expect(screen.getByTestId('tile-g1')).toHaveAttribute('data-recipient', 'false');
    expect(screen.getByTestId('gift-cards-gifted-header')).toHaveTextContent(fallbackT('mweb.giftCards.giftedHeading'));
    expect(screen.getByTestId('tile-g2')).toHaveAttribute('data-recipient', 'true');
    expect(screen.queryByTestId('gift-cards-empty')).not.toBeInTheDocument();
  });

  it('falls back to rupees and an empty sender name, and omits the gifted section when nothing was gifted', () => {
    queries({ data: { myGiftCards: { owned: [{ id: 'g1' }], gifted: [] } } });
    render(<MyCardsTab />);
    expect(screen.getByTestId('tile-g1')).toHaveAttribute('data-sender', '');
    expect(screen.getByTestId('tile-g1')).toHaveAttribute('data-currency', '₹');
    expect(screen.queryByTestId('gift-cards-gifted-header')).not.toBeInTheDocument();
  });
});
