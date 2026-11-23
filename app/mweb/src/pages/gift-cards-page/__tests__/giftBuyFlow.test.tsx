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
  const design = { id: 'des-1', name: 'Classic', front_image_url: 'https://img/front.png', back_image_url: 'https://img/back.png' };
  const store = (over: Record<string, unknown> = {}, settingsOver: Record<string, unknown> = {}) => ({
    design,
    settings: { ...settings, validity_months: 12, max_quantity: 5, physical_enabled: true, shipping_fee: 99, updated_at: '', ...settingsOver },
    physical_available: 3,
    currency_symbol: '$',
    ...over,
  });
  const queries = (state: { store?: object; loading?: boolean; error?: boolean } = {}) =>
    h.useQuery.mockImplementation(() => ({
      data: state.store ? { giftCardStorefront: state.store } : undefined,
      loading: state.loading ?? false,
      error: state.error ? new Error('x') : undefined,
    }));
  const mount = () =>
    render(
      <MemoryRouter initialEntries={['/gift-cards']}>
        <Routes>
          <Route path="/gift-cards" element={<BuyTab />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
  const sent = () => JSON.parse(screen.getByTestId('where').getAttribute('data-state') ?? '{}');
  const go = () => screen.getByTestId('gift-card-continue');

  it('shows a spinner while the storefront loads, and the how-it-works card regardless', () => {
    queries({ loading: true });
    mount();
    expect(screen.getByTestId('gift-cards-buy-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('gift-card-continue')).not.toBeInTheDocument();
  });

  it('says so when the storefront fails, or when no design has been uploaded yet', () => {
    queries({ error: true });
    const { unmount } = mount();
    expect(screen.getByTestId('gift-cards-buy-error')).toBeInTheDocument();
    unmount();
    queries({ store: store({ design: null }) });
    mount();
    expect(screen.getByTestId('gift-cards-unavailable')).toHaveTextContent(fallbackT('mweb.giftCards.unavailable'));
    expect(screen.queryByTestId('gift-card-continue')).not.toBeInTheDocument();
  });

  it('starts on the first preset for the default design and sends one emailed card to checkout', async () => {
    queries({ store: store() });
    mount();
    expect(screen.getByTestId('gift-card-total-value')).toHaveTextContent('$500');
    await waitFor(() => expect(go()).toBeEnabled());
    fireEvent.click(go());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards/checkout'));
    expect(sent()).toEqual({
      design_id: 'des-1',
      design_name: 'Classic',
      front_url: 'https://img/front.png',
      back_url: 'https://img/back.png',
      amount: 500,
      quantity: 1,
      delivery_mode: 'DIGITAL',
      shipping_fee: 0,
      gift: false,
      recipient_email: '',
      recipient_name: '',
      message: '',
    });
  });

  it('keeps Continue off for an amount outside the policy', async () => {
    queries({ store: store() });
    mount();
    fireEvent.change(screen.getByTestId('gift-card-custom-amount-input'), { target: { value: '50' } });
    await waitFor(() => expect(go()).toBeDisabled());
  });

  it('counts cards with the stepper up to the policy maximum, and totals them', async () => {
    queries({ store: store() });
    mount();
    expect(screen.getByTestId('gift-card-quantity-minus')).toBeDisabled();
    fireEvent.click(screen.getByTestId('gift-card-quantity-plus'));
    fireEvent.click(screen.getByTestId('gift-card-quantity-plus'));
    expect(screen.getByTestId('gift-card-total-value')).toHaveTextContent('$1,500');
    fireEvent.change(screen.getByTestId('gift-card-quantity-input'), { target: { value: '9' } });
    expect(await screen.findByText(fallbackT('mweb.giftCards.quantityRange', { vars: { max: 5 } }))).toBeInTheDocument();
    expect(go()).toBeDisabled();
    fireEvent.change(screen.getByTestId('gift-card-quantity-input'), { target: { value: '5' } });
    expect(screen.getByTestId('gift-card-quantity-plus')).toBeDisabled();
    fireEvent.click(screen.getByTestId('gift-card-quantity-minus'));
    expect(screen.getByTestId('gift-card-quantity-input')).toHaveValue('4');
  });

  it('sends printed cards with the delivery fee once, the recipient name and no inbox', async () => {
    queries({ store: store() });
    mount();
    fireEvent.click(screen.getByTestId('gift-card-delivery-physical'));
    fireEvent.click(screen.getByTestId('gift-card-quantity-plus'));
    expect(screen.getByTestId('gift-card-total-delivery-value')).toHaveTextContent('$99');
    expect(screen.getByTestId('gift-card-total-value')).toHaveTextContent('$1,099');
    fireEvent.change(screen.getByTestId('gift-card-recipient-name-input'), { target: { value: '  Priya ' } });
    await waitFor(() => expect(go()).toBeEnabled());
    fireEvent.click(go());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards/checkout'));
    expect(sent()).toMatchObject({ delivery_mode: 'PHYSICAL', quantity: 2, shipping_fee: 99, gift: false, recipient_email: '', recipient_name: 'Priya' });
  });

  it('offers no printed cards while they are off or out of stock', () => {
    queries({ store: store({ physical_available: 0 }) });
    mount();
    expect(screen.getByTestId('gift-card-delivery-physical')).toBeDisabled();
    expect(screen.getByTestId('gift-card-delivery-caption')).toHaveTextContent(fallbackT('mweb.giftCards.physicalUnavailable'));
  });

  it('sends a gift with a trimmed recipient, and blocks Continue on an invalid email', async () => {
    queries({ store: store() });
    mount();
    fireEvent.click(screen.getByTestId('gift-card-for-someone'));
    await waitFor(() => expect(go()).toBeDisabled());
    fireEvent.change(screen.getByTestId('gift-card-recipient-email-input'), { target: { value: 'nope' } });
    await waitFor(() => expect(screen.getByTestId('gift-card-recipient-email-input')).toHaveAttribute('aria-invalid', 'true'));
    fireEvent.change(screen.getByTestId('gift-card-recipient-email-input'), { target: { value: '  friend@example.com ' } });
    fireEvent.change(screen.getByTestId('gift-card-recipient-name-input'), { target: { value: '  Friend ' } });
    fireEvent.change(screen.getByTestId('gift-card-message-input'), { target: { value: '  Enjoy ' } });
    await waitFor(() => expect(go()).toBeEnabled());
    fireEvent.click(go());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/gift-cards/checkout'));
    expect(sent()).toMatchObject({ gift: true, recipient_email: 'friend@example.com', recipient_name: 'Friend', message: 'Enjoy' });
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
