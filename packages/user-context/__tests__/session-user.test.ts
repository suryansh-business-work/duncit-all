import { describe, expect, it, vi } from 'vitest';
import { print } from 'graphql';
import { gql } from '@apollo/client';
import { buildSessionMeQuery, createSessionUserLoader } from '../src/session-user';

describe('buildSessionMeQuery', () => {
  it('builds the default SessionMe query', () => {
    const text = print(buildSessionMeQuery());
    expect(text).toContain('query SessionMe');
    expect(text).toContain('user_id');
    expect(text).toContain('profile_photo');
  });

  it('uses a custom operation name and extra fields', () => {
    const text = print(buildSessionMeQuery('PartnerSessionMe', ['onboarding_survey_completed', 'phone_number']));
    expect(text).toContain('query PartnerSessionMe');
    expect(text).toContain('onboarding_survey_completed');
    expect(text).toContain('phone_number');
  });
});

describe('createSessionUserLoader', () => {
  it('returns the me payload from a network-only query', async () => {
    const me = { user_id: '1', email: 'a@b.co' };
    const query = vi.fn().mockResolvedValue({ data: { me } });
    const loader = createSessionUserLoader({ query } as never);
    await expect(loader()).resolves.toEqual(me);
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ fetchPolicy: 'network-only' }));
  });

  it('returns null when me is missing', async () => {
    const query = vi.fn().mockResolvedValue({ data: {} });
    const loader = createSessionUserLoader({ query } as never);
    await expect(loader()).resolves.toBeNull();
  });

  it('returns null when data is undefined', async () => {
    const query = vi.fn().mockResolvedValue({});
    const loader = createSessionUserLoader({ query } as never);
    await expect(loader()).resolves.toBeNull();
  });

  it('honours a full query override', async () => {
    const override = gql`
      query AdminMe {
        me {
          user_id
        }
      }
    `;
    const query = vi.fn().mockResolvedValue({ data: { me: { user_id: 'x' } } });
    const loader = createSessionUserLoader({ query } as never, { query: override });
    await loader();
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ query: override }));
  });
});
