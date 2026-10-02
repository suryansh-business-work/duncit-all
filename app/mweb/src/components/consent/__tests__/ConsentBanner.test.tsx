import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CONSENT_COOKIE,
  SHORT_LINK_CLICK_KEY,
  makeConsent,
  readWebConsent,
  writeWebConsent,
} from '@duncit/utils';
import ConsentBanner from '../ConsentBanner';

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`;
  localStorage.clear();
});

describe('ConsentBanner', () => {
  it('is not shown once this browser has answered', () => {
    writeWebConsent(makeConsent({ analytics: false, marketing: false }));
    render(<ConsentBanner />);
    expect(screen.queryByTestId('consent-banner')).toBeNull();
  });

  it('accepts everything, then hides itself', () => {
    render(<ConsentBanner />);
    fireEvent.click(screen.getByTestId('consent-accept-all'));
    expect(readWebConsent()).toMatchObject({ analytics: true, marketing: true });
    expect(screen.queryByTestId('consent-banner')).toBeNull();
  });

  it('rejects everything and deletes what marketing had kept', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    render(<ConsentBanner />);
    fireEvent.click(screen.getByTestId('consent-reject-all'));
    expect(readWebConsent()).toMatchObject({ analytics: false, marketing: false });
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBeNull();
  });

  it('saves a custom choice, starting with every optional switch off', () => {
    render(<ConsentBanner />);
    fireEvent.click(screen.getByTestId('consent-customise'));
    const analytics = screen.getByTestId('consent-switch-analytics').querySelector('input');
    const marketing = screen.getByTestId('consent-switch-marketing').querySelector('input');
    expect(analytics).not.toBeChecked();
    expect(marketing).not.toBeChecked();
    act(() => {
      fireEvent.click(analytics as HTMLInputElement);
    });
    fireEvent.click(screen.getByTestId('consent-save'));
    expect(readWebConsent()).toMatchObject({ analytics: true, marketing: false });
  });
});
