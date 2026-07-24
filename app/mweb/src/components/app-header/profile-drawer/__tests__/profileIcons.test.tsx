import { isValidElement } from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { profileIcon } from '../profileIcons';
import type { ProfileIconKey } from '../profileSections';

const ALL_KEYS: ProfileIconKey[] = [
  'bookings',
  'saved',
  'verification',
  'support',
  'referral',
  'account',
  'earn',
  'ideas',
  'plans',
  'faqs',
  'shop',
  'orders',
  'wallet',
];

describe('profileIcon', () => {
  it('returns a valid React element for every ProfileIconKey', () => {
    for (const key of ALL_KEYS) {
      const icon = profileIcon(key);
      expect(isValidElement(icon)).toBe(true);
    }
  });

  it('returns a distinct icon element per key', () => {
    const types = ALL_KEYS.map((key) => profileIcon(key).type);
    const unique = new Set(types);
    expect(unique.size).toBe(ALL_KEYS.length);
  });

  it('renders each icon as an MUI svg without crashing', () => {
    for (const key of ALL_KEYS) {
      const { container, unmount } = render(profileIcon(key));
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    }
  });
});
