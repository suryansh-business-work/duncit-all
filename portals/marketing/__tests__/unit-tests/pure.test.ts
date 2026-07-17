import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// lib/ad-positions.ts
// ---------------------------------------------------------------------------
import {
  AD_POSITIONS,
  adPositionLabel,
  formatAdMoney,
} from '../../src/lib/ad-positions';

describe('ad-positions', () => {
  it('exposes one meta entry per placement in order', () => {
    expect(AD_POSITIONS).toHaveLength(9);
    expect(AD_POSITIONS[0].position).toBe('AUTO');
    expect(AD_POSITIONS.map((p) => p.priceField)).toContain('home_bottom_per_day');
  });

  it('maps a known position to its friendly label', () => {
    expect(adPositionLabel('HOME_BOTTOM')).toBe('Home Bottom');
    expect(adPositionLabel('POD_DETAILS')).toBe('Pod Details');
  });

  it('falls back to the raw value for an unknown position', () => {
    expect(adPositionLabel('MYSTERY')).toBe('MYSTERY');
  });

  it('formats money with the row currency symbol and grouping', () => {
    expect(formatAdMoney('₹', 1500)).toBe('₹1,500');
    expect(formatAdMoney('$', 0)).toBe('$0');
  });
});

// ---------------------------------------------------------------------------
// theme.ts (re-export barrel of the shared design system)
// ---------------------------------------------------------------------------
import { buildTheme, tokens } from '../../src/theme';

describe('theme barrel', () => {
  it('re-exports the shared design-system helpers', () => {
    expect(typeof buildTheme).toBe('function');
    expect(tokens).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// pages/ads-approvals-page/helpers.ts
// ---------------------------------------------------------------------------
import { STATUS_FILTERS, AD_STATUS_CHIP_COLORS } from '../../src/pages/ads-approvals-page/helpers';

describe('ads-approvals helpers', () => {
  it('lists the pinned status tabs including All', () => {
    expect(STATUS_FILTERS.map((f) => f.value)).toEqual(['PENDING', 'APPROVED', 'REJECTED', '']);
  });

  it('maps every display status to a chip colour', () => {
    expect(AD_STATUS_CHIP_COLORS.LIVE).toBe('success');
    expect(AD_STATUS_CHIP_COLORS.EXPIRED).toBe('default');
  });
});

// ---------------------------------------------------------------------------
// pages/notifications-page/helpers.tsx
// ---------------------------------------------------------------------------
import { blankForm, SCOPES } from '../../src/pages/notifications-page/helpers';

describe('notifications helpers', () => {
  it('provides a GLOBAL blank form', () => {
    expect(blankForm.scope).toBe('GLOBAL');
    expect(blankForm.target_user_ids).toEqual([]);
    expect(blankForm.silent).toBe(false);
  });

  it('lists the four audience scopes with icons', () => {
    expect(SCOPES.map((s) => s.value)).toEqual(['GLOBAL', 'LOCATION', 'ZONE', 'USER']);
    expect(SCOPES.every((s) => s.icon)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// lib/session.ts — thin wrapper over the shared createSession factory.
// ---------------------------------------------------------------------------
vi.mock('@duncit/shell', () => ({
  parseEnvRoles: (_env: unknown, fallback: string[]) => fallback,
  createSession: (tokenKey: string) => ({
    getToken: () => `token:${tokenKey}`,
    setToken: vi.fn(),
    clearToken: vi.fn(),
    hasAppAccess: () => true,
    accessDeniedMessage: 'denied',
  }),
  SUPER_ROLE: 'SUPER_ADMIN',
}));

describe('session wrapper', () => {
  it('builds the portal session from the shared factory', async () => {
    const session = await import('../../src/lib/session');
    expect(session.getToken()).toBe('token:marketing_token');
    expect(session.hasAppAccess([])).toBe(true);
    expect(session.accessDeniedMessage).toBe('denied');
    expect(session.SUPER_ROLE).toBe('SUPER_ADMIN');
  });
});

// ---------------------------------------------------------------------------
// notification schema + mapper — branch completion beyond the .cy suite.
// ---------------------------------------------------------------------------
import {
  notificationFormSchema,
  toCreateNotificationInput,
} from '../../src/pages/notifications-page/notification.form';
import type { NotifForm } from '../../src/pages/notifications-page/helpers';

const notifBase: NotifForm = {
  title: 'Weekend plans',
  body: 'Discover new pods near you',
  image_url: '',
  link_url: '',
  scope: 'GLOBAL',
  silent: false,
  location_id: '',
  zone_name: '',
  target_user_ids: [],
};

describe('notificationFormSchema branch completion', () => {
  it('accepts a fully specified ZONE notification', () => {
    const result = notificationFormSchema.safeParse({
      ...notifBase,
      scope: 'ZONE',
      location_id: 'loc1',
      zone_name: 'North',
    });
    expect(result.success).toBe(true);
  });

  it('rejects target users supplied for a non-USER scope', () => {
    const result = notificationFormSchema.safeParse({
      ...notifBase,
      scope: 'GLOBAL',
      target_user_ids: ['u1'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(' ')).toMatch(/must be empty/i);
    }
  });

  it('accepts an absolute image URL and a relative link URL', () => {
    const result = notificationFormSchema.safeParse({
      ...notifBase,
      image_url: 'https://cdn.example.com/a.png',
      link_url: '/pods/abc',
    });
    expect(result.success).toBe(true);
  });
});

describe('toCreateNotificationInput branch completion', () => {
  it('keeps location + zone for a ZONE notification and drops users', () => {
    const input = toCreateNotificationInput({
      ...notifBase,
      scope: 'ZONE',
      location_id: 'loc1',
      zone_name: 'North',
      target_user_ids: [],
    });
    expect(input.location_id).toBe('loc1');
    expect(input.zone_name).toBe('North');
    expect(input.target_user_ids).toEqual([]);
  });

  it('keeps location but no zone for a LOCATION notification', () => {
    const input = toCreateNotificationInput({
      ...notifBase,
      scope: 'LOCATION',
      location_id: 'loc9',
    });
    expect(input.location_id).toBe('loc9');
    expect(input.zone_name).toBeNull();
  });

  it('preserves non-empty image and link URLs', () => {
    const input = toCreateNotificationInput({
      ...notifBase,
      image_url: 'https://cdn.example.com/a.png',
      link_url: '/pods/abc',
    });
    expect(input.image_url).toBe('https://cdn.example.com/a.png');
    expect(input.link_url).toBe('/pods/abc');
  });
});

// ---------------------------------------------------------------------------
// marketing-campaign schema + mapper — branch completion.
// ---------------------------------------------------------------------------
import {
  blankMarketingCampaignValues,
  marketingCampaignSchema,
  toMarketingCampaignInput,
} from '../../src/pages/marketing-campaigns-page/marketing-campaign-form';

const campaignValid = {
  ...blankMarketingCampaignValues(),
  name: 'Weekend launch',
  subject: 'New pods are live',
};

describe('marketingCampaignSchema branch completion', () => {
  it('rejects an unparseable schedule string', () => {
    const result = marketingCampaignSchema.safeParse({ ...campaignValid, scheduled_at: 'not-a-date' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(' ')).toMatch(/valid date/i);
    }
  });

  it('accepts a selected card with a card ref id', () => {
    const result = marketingCampaignSchema.safeParse({
      ...campaignValid,
      card_type: 'POD',
      card_ref_id: 'pod-1',
    });
    expect(result.success).toBe(true);
  });
});

describe('toMarketingCampaignInput branch completion', () => {
  it('schedules (no send_now) and forwards the card selection', () => {
    const input = toMarketingCampaignInput({
      ...campaignValid,
      card_type: 'CLUB',
      card_ref_id: 'club-9',
      scheduled_at: '2030-01-01T10:00:00.000Z',
    });
    expect(input.send_now).toBe(false);
    expect(input.scheduled_at).toBe('2030-01-01T10:00:00.000Z');
    expect(input.card_type).toBe('CLUB');
    expect(input.card_ref_id).toBe('club-9');
  });

  it('defaults the channel to EMAIL and to WHATSAPP when requested', () => {
    expect(blankMarketingCampaignValues().channel).toBe('EMAIL');
    expect(blankMarketingCampaignValues('WHATSAPP').channel).toBe('WHATSAPP');
  });
});

// ---------------------------------------------------------------------------
// ads-pricing mapper — the `?? 0` fallback branch.
// ---------------------------------------------------------------------------
import { fromAdPricing } from '../../src/pages/ads-settings-page/ads-pricing-form';
import type { AdPricing } from '../../src/pages/ads-settings-page/ads-pricing-form';

describe('fromAdPricing fallback', () => {
  it('coerces a missing per-day price to "0"', () => {
    const partial = {
      home_bottom_per_day: 750,
      currency_symbol: '₹',
    } as unknown as AdPricing;
    const form = fromAdPricing(partial);
    expect(form.home_bottom_per_day).toBe('750');
    expect(form.auto_per_day).toBe('0');
    expect(form.currency_symbol).toBe('₹');
  });
});
