import type { MockedResponse } from '@apollo/client/testing';
import {
  PURGE_SHORT_LINK_CLICKS,
  ROTATE_SHORT_LINK_IP_SALT,
  SHORT_LINK_POLICY,
  UPDATE_SHORT_LINK_POLICY,
  type ShortLinkPolicy,
} from '../../src/pages/external-links-page/queries';

export const makeShortLinkPolicy = (over: Partial<ShortLinkPolicy> = {}): ShortLinkPolicy => ({
  blocked_domains: ['spam.example.com', 'phish.example.org'],
  retention_days: 365,
  honour_consent_signals: true,
  ip_salt_rotated_at: '2026-07-01T00:00:00.000Z',
  last_purge_at: '2026-07-30T02:00:00.000Z',
  last_purged_count: 4321,
  retention_cutoff: '2025-07-31T00:00:00.000Z',
  clicks_stored: 12345,
  clicks_beyond_retention: 678,
  consent_minimised: 9,
  updated_at: '2026-07-31T00:00:00.000Z',
  ...over,
});

const typedPolicy = (policy: ShortLinkPolicy) => ({ __typename: 'ShortLinkPolicy', ...policy });

export const shortLinkPolicyMock = (
  over: Partial<ShortLinkPolicy> = {},
  opts: { failWith?: string } = {},
): MockedResponse => ({
  request: { query: SHORT_LINK_POLICY },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { shortLinkPolicy: typedPolicy(makeShortLinkPolicy(over)) } } }),
});

export const updateShortLinkPolicyMock = (
  input: unknown,
  opts: { failWith?: string; over?: Partial<ShortLinkPolicy> } = {},
): MockedResponse => ({
  request: { query: UPDATE_SHORT_LINK_POLICY, variables: { input } },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : {
        result: {
          data: { updateShortLinkPolicy: typedPolicy(makeShortLinkPolicy(opts.over)) },
        },
      }),
});

export const rotateShortLinkIpSaltMock = (opts: { failWith?: string } = {}): MockedResponse => ({
  request: { query: ROTATE_SHORT_LINK_IP_SALT },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : {
        result: {
          data: {
            rotateShortLinkIpSalt: typedPolicy(
              makeShortLinkPolicy({ ip_salt_rotated_at: '2026-08-01T00:00:00.000Z' }),
            ),
          },
        },
      }),
});

export const purgeShortLinkClicksMock = (
  removed: number | null,
  opts: { failWith?: string } = {},
): MockedResponse => ({
  request: { query: PURGE_SHORT_LINK_CLICKS },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { purgeShortLinkClicks: removed } } }),
});
