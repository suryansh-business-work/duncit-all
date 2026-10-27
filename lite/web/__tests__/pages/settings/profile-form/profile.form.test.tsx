import type { MockedResponse } from '@apollo/client/testing';
import { createTranslator } from '@duncit/i18n';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteMe } from '../../../../../shared/graphql/documents';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { LITE_UPDATE_PROFILE, type LiteProfileInput } from '../../../../graphql/profile';
import { ProfileForm, makeProfileSchema, profileDefaults, toProfileInput } from '../../../../pages/settings/profile-form';
import { captureNotifications, meFixture, renderWithProviders, typed } from '../../../test-utils';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });
const SOCIAL_RULE = 'Enter just the handle, without the full link';

/** The links as the form sends them: the schema drops the cache's __typename. */
const links = (over: Partial<LiteMe['social']> = {}): LiteMe['social'] => ({ instagram: '', x: '', youtube: '', tiktok: '', linkedin: '', website: '', ...over });
/** The links as the API answers them. */
const social = (over: Partial<LiteMe['social']> = {}) => typed('LiteSocialLinks', links(over));
const me = meFixture({ bio: 'Runs the Sunday club.', social: social({ instagram: 'asha.runs' }) });

const saveMock = (input: LiteProfileInput, result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_UPDATE_PROFILE, variables: { input } }, result });

describe('profile schema', () => {
  const schema = makeProfileSchema(t);
  const valid = profileDefaults(me);

  it('starts from the account, blanks for what is unset', () => {
    expect(profileDefaults(meFixture())).toEqual({ name: 'Asha Rao', handle: 'asha', bio: '', avatar_url: '', social: expect.objectContaining({ instagram: '', website: '' }) });
  });

  it('strips a leading @ from a social handle', () => {
    expect(schema.parse({ ...valid, social: social({ x: '@asha_r', tiktok: '@asha' }) }).social).toMatchObject({ x: 'asha_r', tiktok: 'asha' });
  });

  it.each(['instagram.com/asha', 'https://x.com/asha', '@asha rao'])('refuses %s as a handle', (value) => {
    const result = schema.safeParse({ ...valid, social: social({ instagram: value }) });
    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['social', 'instagram'], message: SOCIAL_RULE })]);
  });

  it('wants the website as a full http(s) link', () => {
    expect(schema.safeParse({ ...valid, social: social({ website: 'asha.example' }) }).error?.issues[0]?.message).toBe('Enter a full link starting with http:// or https://');
    expect(schema.safeParse({ ...valid, social: social({ website: 'ftp://asha.example' }) }).success).toBe(false);
    expect(schema.safeParse({ ...valid, social: social({ website: 'https://asha.example' }) }).success).toBe(true);
  });

  it('lower-cases the handle and refuses one with other characters', () => {
    expect(schema.parse({ ...valid, handle: 'Asha_Rao' }).handle).toBe('asha_rao');
    expect(schema.safeParse({ ...valid, handle: 'asha rao' }).error?.issues[0]?.message).toBe('A handle is 3 to 30 lowercase letters, numbers or underscores');
    expect(schema.safeParse({ ...valid, handle: '_asha' }).success).toBe(false);
  });

  it('needs a name and keeps the bio to 500 characters', () => {
    expect(schema.safeParse({ ...valid, name: '  ' }).error?.issues[0]?.message).toBe('This is required');
    expect(schema.safeParse({ ...valid, bio: 'b'.repeat(501) }).error?.issues[0]?.message).toBe('Keep this to 500 characters or fewer');
  });

  it('sends every part of the profile as the API input', () => {
    const output = schema.parse({ ...valid, social: social({ x: '@asha' }) });
    expect(toProfileInput(output)).toEqual({ name: 'Asha Rao', handle: 'asha', bio: 'Runs the Sunday club.', avatar_url: '', social: links({ x: 'asha' }) });
  });
});

describe('ProfileForm', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  it('fills in the account, with each network behind its fixed address', () => {
    renderWithProviders(<ProfileForm me={me} />, { me });

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Asha Rao');
    expect(screen.getByRole('textbox', { name: 'Handle' })).toHaveValue('asha');
    expect(screen.getByRole('textbox', { name: 'Bio' })).toHaveValue('Runs the Sunday club.');
    expect(screen.getByRole('textbox', { name: 'Instagram' })).toHaveValue('asha.runs');
    expect(screen.getByText('instagram.com/')).toBeInTheDocument();
    expect(screen.getByText('linkedin.com/in/')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Website' })).toHaveAttribute('inputmode', 'url');
  });

  it('refuses a pasted profile link in a handle box and saves nothing', async () => {
    const { user } = renderWithProviders(<ProfileForm me={me} />, { me });

    const x = screen.getByRole('textbox', { name: 'X' });
    await user.type(x, 'https://x.com/asha');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(SOCIAL_RULE)).toBeInTheDocument();
    expect(x).toHaveAttribute('aria-invalid', 'true');
    expect(toasts.seen).toEqual([]);
  });

  it('saves a handle typed with its @ without the @, and says so', async () => {
    const input = { name: 'Asha Rao', handle: 'asha', bio: 'Runs the Sunday club.', avatar_url: '', social: links({ instagram: 'asha.runs', x: 'asha' }) };
    const saved = meFixture({ bio: 'Runs the Sunday club.', social: social({ instagram: 'asha.runs', x: 'asha' }) });
    const { user } = renderWithProviders(<ProfileForm me={me} />, { me, mocks: [saveMock(input, { data: { liteUpdateProfile: saved } })] });

    await user.type(screen.getByRole('textbox', { name: 'X' }), '@asha');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Profile saved.', severity: 'success' }]));
    // The form now shows what the account holds.
    expect(screen.getByRole('textbox', { name: 'X' })).toHaveValue('asha');
  });

  it('shows the refusal and keeps the edits when the handle is taken', async () => {
    const input = { name: 'Asha Rao', handle: 'ravi', bio: 'Runs the Sunday club.', avatar_url: '', social: links({ instagram: 'asha.runs' }) };
    const { user } = renderWithProviders(<ProfileForm me={me} />, { me, mocks: [saveMock(input, { errors: [{ message: 'That handle is taken' }] })] });

    const handle = screen.getByRole('textbox', { name: 'Handle' });
    await user.clear(handle);
    await user.type(handle, 'ravi');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'That handle is taken', severity: 'error' }]));
    expect(handle).toHaveValue('ravi');
  });

  it('needs a name', async () => {
    const { user } = renderWithProviders(<ProfileForm me={me} />, { me });

    await user.clear(screen.getByRole('textbox', { name: 'Name' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('This is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });
});
