import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { gql } from '@apollo/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import OpenInAppBanner from '../OpenInAppBanner';

const APP_VERSION_INFO = gql`
  query AppVersionInfoBanner {
    appVersionInfo {
      android_store_url
      ios_store_url
    }
  }
`;

const storeMock = (ios: string | null, android: string | null) => ({
  request: { query: APP_VERSION_INFO },
  result: {
    data: {
      appVersionInfo: {
        ios_store_url: ios,
        android_store_url: android,
      },
    },
  },
});

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });
}

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36';
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

function renderBanner(mocks: unknown[], entries = ['/pods?ref=x']) {
  return render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      <MemoryRouter initialEntries={entries}>
        <OpenInAppBanner />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('OpenInAppBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    setUserAgent(DESKTOP_UA);
  });

  it('renders nothing on desktop user agents', () => {
    setUserAgent(DESKTOP_UA);
    const { container } = renderBanner([]);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('open-in-app-banner')).not.toBeInTheDocument();
  });

  it('renders the banner on Android and shows the Get app store button', async () => {
    setUserAgent(ANDROID_UA);
    renderBanner([storeMock(null, 'https://play.google.com/app')]);

    expect(await screen.findByTestId('open-in-app-banner')).toBeInTheDocument();
    expect(screen.getByText('Duncit is better in the app')).toBeInTheDocument();

    const getApp = await screen.findByRole('link', { name: 'Get app' });
    expect(getApp).toHaveAttribute('href', 'https://play.google.com/app');
    expect(getApp).toHaveAttribute('target', '_blank');
  });

  it('uses the iOS store url on iPhone user agents', async () => {
    setUserAgent(IOS_UA);
    renderBanner([storeMock('https://apps.apple.com/app', null)]);

    const getApp = await screen.findByRole('link', { name: 'Get app' });
    expect(getApp).toHaveAttribute('href', 'https://apps.apple.com/app');
  });

  it('does not render the Get app button when no store url is available', async () => {
    setUserAgent(ANDROID_UA);
    renderBanner([storeMock(null, null)]);

    await screen.findByTestId('open-in-app-banner');
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Get app' })).not.toBeInTheDocument(),
    );
  });

  it('deep-links into the app at the current path when Open is clicked', () => {
    setUserAgent(ANDROID_UA);
    const original = globalThis.location.href;
    let assigned = '';
    Object.defineProperty(globalThis, 'location', {
      value: { href: original, pathname: '/pods', search: '?ref=x' },
      configurable: true,
    });
    // Track assignment via a setter.
    Object.defineProperty(globalThis.location, 'href', {
      set: (v: string) => {
        assigned = v;
      },
      get: () => assigned,
      configurable: true,
    });

    renderBanner([storeMock(null, 'https://play.google.com/app')], ['/pods?ref=x']);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(assigned).toBe('duncit://pods?ref=x');
  });

  it('dismisses and persists dismissal, then stays hidden on re-render', async () => {
    setUserAgent(ANDROID_UA);
    const { unmount } = renderBanner([storeMock(null, 'https://play.google.com/app')]);

    await screen.findByTestId('open-in-app-banner');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() =>
      expect(screen.queryByTestId('open-in-app-banner')).not.toBeInTheDocument(),
    );
    expect(localStorage.getItem('duncit:app-banner-dismissed')).toBe('1');

    unmount();
    renderBanner([storeMock(null, 'https://play.google.com/app')]);
    expect(screen.queryByTestId('open-in-app-banner')).not.toBeInTheDocument();
  });
});
