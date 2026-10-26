import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import HeaderGreeting from '../HeaderGreeting';
import HeaderLeading from '../HeaderLeading';
import HeaderQuickActions from '../HeaderQuickActions';
import HeaderSearchButton from '../HeaderSearchButton';
import HeaderToast from '../HeaderToast';
import HeaderVerifyEmail from '../HeaderVerifyEmail';
import { formatRelative } from '../queries';
import { fallbackT } from '../../../i18n/fallback';

vi.mock('../HeaderNotificationsBell', () => ({ default: () => <span data-testid="bell" /> }));
vi.mock('../HeaderDeliveryAddress', () => ({
  default: (p: { signedIn: boolean }) => <span data-testid="delivery" data-signed={String(p.signedIn)} />,
}));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

describe('HeaderGreeting', () => {
  it('leads with the hello and trails with the tagline when the first name is known', () => {
    render(<HeaderGreeting tagline="Find your people" firstName="  Asha " />);
    const el = screen.getByTestId('header-greeting');
    expect(el).toHaveTextContent(fallbackT('mweb.home.greetingHello', { vars: { name: 'Asha' } }));
    expect(el).toHaveTextContent('Find your people');
  });

  it('opens the location picker on press, Enter and Space only', () => {
    const onOpenLocation = vi.fn();
    render(<HeaderGreeting tagline="x" onOpenLocation={onOpenLocation} />);
    const el = screen.getByTestId('header-greeting');
    expect(el).toHaveAttribute('role', 'button');
    fireEvent.click(el);
    fireEvent.keyDown(el, { key: 'Enter' });
    fireEvent.keyDown(el, { key: ' ' });
    fireEvent.keyDown(el, { key: 'Tab' });
    expect(onOpenLocation).toHaveBeenCalledTimes(3);
  });
});

describe('HeaderLeading', () => {
  const lead = (props: Partial<Parameters<typeof HeaderLeading>[0]> = {}) => {
    const handlers = { onOpenStudioSwitch: vi.fn(), onOpenLocation: vi.fn() };
    render(<HeaderLeading minimal={false} studio="USER" placeReady {...handlers} {...props} />);
    return handlers;
  };

  it('shows nothing but the spacer in the minimal survey header', () => {
    lead({ minimal: true });
    expect(screen.getByTestId('header-leading')).toBeEmptyDOMElement();
  });

  it('shows the location row without a studio badge for the user studio', () => {
    lead({ selectedLocationName: 'Pune' });
    expect(screen.queryByTestId('header-studio-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('header-leading')).toHaveTextContent('Pune');
  });

  it('shows the studio badge in a partner studio and opens the switcher from it', () => {
    const handlers = lead({ studio: 'HOST' as never, selectedLocationName: 'Pune' });
    fireEvent.click(screen.getByTestId('header-studio-badge'));
    expect(handlers.onOpenStudioSwitch).toHaveBeenCalledTimes(1);
  });

  it('swaps the city pill for the delivery address on the Pod Shop, passing the sign-in state', () => {
    lead({ deliveryAddress: true, signedIn: true });
    expect(screen.getByTestId('delivery')).toHaveAttribute('data-signed', 'true');
  });

  it('defaults to a signed-out delivery pill', () => {
    lead({ deliveryAddress: true });
    expect(screen.getByTestId('delivery')).toHaveAttribute('data-signed', 'false');
  });
});

describe('HeaderQuickActions', () => {
  const actions = (props: Partial<Parameters<typeof HeaderQuickActions>[0]> = {}) => {
    const handlers = { onToast: vi.fn(), onOpenMenu: vi.fn() };
    inRouter(<HeaderQuickActions showSearch locationId="l" zoneName="z" {...handlers} {...props} />);
    return handlers;
  };

  it('shows search, the bell and the account button, and opens the menu', () => {
    const handlers = actions({ me: { user_id: 'u1', full_name: 'Asha Rao', first_name: 'Asha', last_name: 'Rao' } });
    expect(screen.getByTestId('header-search-button')).toBeInTheDocument();
    expect(screen.getByTestId('bell')).toBeInTheDocument();
    expect(screen.getByTestId('account-button')).toHaveAccessibleName(fallbackT('mweb.common.openAccountMenu'));
    expect(screen.getByTestId('account-avatar-image')).toHaveTextContent('AR');
    fireEvent.click(screen.getByTestId('account-button'));
    expect(handlers.onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('hides search outside the user studio and shows the photo when there is one', () => {
    actions({ showSearch: false, me: { user_id: 'u1', full_name: 'A', profile_photo: 'https://img/a.png' } });
    expect(screen.queryByTestId('header-search-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('account-avatar-image').querySelector('img')).toHaveAttribute('src', 'https://img/a.png');
  });

  it('copes with no account at all', () => {
    actions({ me: null });
    expect(screen.getByTestId('account-button')).toBeInTheDocument();
  });
});

describe('HeaderSearchButton', () => {
  it('opens the search page', () => {
    inRouter(<HeaderSearchButton locationId="l" zoneName="z" />);
    fireEvent.click(screen.getByTestId('header-search-button'));
    expect(screen.getByTestId('where')).toHaveTextContent('/search');
  });
});

describe('HeaderToast', () => {
  it('shows the title and body while a toast is set and closes from the alert', () => {
    const onClose = vi.fn();
    render(<HeaderToast toast={{ title: 'Hi', body: 'There' }} onClose={onClose} />);
    expect(screen.getByTestId('header-toast-alert')).toHaveTextContent('HiThere');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while there is no toast', () => {
    render(<HeaderToast toast={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId('header-toast-alert')).not.toBeInTheDocument();
  });
});

describe('HeaderVerifyEmail', () => {
  it('opens verification on press, Enter and Space only', () => {
    const onOpen = vi.fn();
    render(<HeaderVerifyEmail onOpen={onOpen} />);
    const banner = screen.getByTestId('verify-email-banner');
    expect(banner).toHaveTextContent(fallbackT('mweb.home.verifyYourEmail'));
    fireEvent.click(banner);
    fireEvent.keyDown(banner, { key: 'Enter' });
    fireEvent.keyDown(banner, { key: ' ' });
    fireEvent.keyDown(banner, { key: 'a' });
    expect(onOpen).toHaveBeenCalledTimes(3);
  });
});

describe('formatRelative', () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    [10_000, 'now'],
    [5 * 60_000, '5m'],
    [3 * 3_600_000, '3h'],
    [2 * 86_400_000, '2d'],
  ])('formats an age of %i ms as %s', (age, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
    expect(formatRelative(new Date(Date.now() - age).toISOString())).toBe(expected);
  });
});
