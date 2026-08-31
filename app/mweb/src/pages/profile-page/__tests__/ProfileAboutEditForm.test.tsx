/**
 * Editing the About section of a profile: a description and up to five links.
 *
 * The links are the part with rules. Each needs BOTH a label and a real URL —
 * a label with no address is a dead row on a stranger's screen, and an address
 * with no label is a bare URL nobody clicks.
 *
 * NOTE, recorded rather than fixed here: the form always renders one blank row
 * to type into, and validation runs BEFORE the submit handler drops empty rows,
 * so a member with no links cannot save their bio until they delete that row.
 * The test below states what the form does today, not what it should do.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProfileAboutEditForm from '../ProfileAboutEditForm';
import { profileSchema } from '../profileAbout.schema';
import { UPDATE_MY_PROFILE } from '../queries';

const testTheme = createTheme();

const saved: MockedResponse = {
  request: { query: UPDATE_MY_PROFILE, variables: () => true },
  result: {
    data: {
      updateMyProfile: {
        user_id: 'u-1',
        first_name: 'Meera',
        last_name: 'N',
        full_name: 'Meera N',
        is_email_verified: true,
        bio: 'Plays doubles on Sundays.',
        profile_photo: '',
        profile_links: [],
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const LINK = { label: 'Strava', url: 'https://strava.com/meera' };

const form = (over: Partial<Parameters<typeof ProfileAboutEditForm>[0]> = {}) => {
  const spies = { onCancel: vi.fn(), onSaved: vi.fn() };
  const result = render(
    <MockedProvider mocks={[saved]}>
      <ThemeProvider theme={testTheme}>
        <ProfileAboutEditForm bio="Plays doubles on Sundays." links={[LINK]} {...spies} {...over} />
      </ThemeProvider>
    </MockedProvider>
  );
  return { ...result, spies };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('profileSchema', () => {
  it('caps the description, and says so in words a member can act on', () => {
    const long = profileSchema.safeParse({ bio: 'x'.repeat(501), profile_links: [] });

    expect(long.success).toBe(false);
    expect(long.success ? '' : long.error.issues[0]?.message).toContain('500');
  });

  it('takes an empty bio and no links at all', () => {
    expect(profileSchema.safeParse({ bio: '', profile_links: [] }).success).toBe(true);
  });

  it('needs both halves of a link — a label with no address is a dead row', () => {
    expect(
      profileSchema.safeParse({ bio: '', profile_links: [{ label: 'Strava', url: '' }] }).success
    ).toBe(false);
    expect(
      profileSchema.safeParse({ bio: '', profile_links: [{ label: '', url: 'https://strava.com' }] })
        .success
    ).toBe(false);
  });

  it('needs the address to be a real URL, not a word', () => {
    expect(
      profileSchema.safeParse({ bio: '', profile_links: [{ label: 'Strava', url: 'strava' }] }).success
    ).toBe(false);
    expect(profileSchema.safeParse({ bio: '', profile_links: [LINK] }).success).toBe(true);
  });

  it('stops at five links, and says how many are allowed', () => {
    const six = Array.from({ length: 6 }, (_, index) => ({ ...LINK, label: `L${index}` }));
    const parsed = profileSchema.safeParse({ bio: '', profile_links: six });

    expect(parsed.success).toBe(false);
    expect(parsed.success ? '' : parsed.error.issues[0]?.message).toContain('5');
  });
});

describe('ProfileAboutEditForm', () => {
  it('opens on what the profile already says', () => {
    const { container } = form();
    const [bio] = container.querySelectorAll<HTMLTextAreaElement>('textarea');

    expect(bio?.value).toBe('Plays doubles on Sundays.');
    expect(container.querySelector('input')).toHaveProperty('value', 'Strava');
  });

  it('always offers one empty row for a member with no links yet', () => {
    const { container } = form({ links: [] });

    expect(container.querySelectorAll('input').length).toBeGreaterThanOrEqual(2);
  });

  it('refuses the blank row it rendered itself, until the member deletes it', async () => {
    const { container, spies } = form({ links: [] });

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();
    expect(spies.onSaved).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('[aria-label="remove link"]') as HTMLElement);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(spies.onSaved).toHaveBeenCalled();
  });

  it('refuses a link with a label and no address', async () => {
    const { container, spies } = form({ links: [] });
    const [label] = container.querySelectorAll<HTMLInputElement>('input');

    fireEvent.change(label as HTMLElement, { target: { value: 'Strava' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(spies.onSaved).not.toHaveBeenCalled();
    expect(container.textContent).toContain('URL is required');
  });

  it('refuses an address that is not one', async () => {
    const { container, spies } = form();
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input')];
    const url = inputs.find((field) => field.value.startsWith('https://'));
    if (url) fireEvent.change(url, { target: { value: 'strava' } });

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(spies.onSaved).not.toHaveBeenCalled();
    expect(container.textContent).toContain('valid URL');
  });

  it('saves a good profile and tells the caller', async () => {
    const { container, spies } = form();

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(spies.onSaved).toHaveBeenCalled();
  });

  const addLink = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      /add link/i.test(button.textContent ?? '')
    );

  it('adds a link row, and takes one back off', async () => {
    const { container } = form({ links: [] });
    const before = container.querySelectorAll('input').length;

    fireEvent.click(addLink(container) as HTMLElement);
    await settle();
    expect(container.querySelectorAll('input').length).toBeGreaterThan(before);

    fireEvent.click(container.querySelector('[aria-label="remove link"]') as HTMLElement);
    await settle();
    expect(container.querySelectorAll('input').length).toBe(before);
  });

  it('stops offering more once five links are on the profile', async () => {
    const five = Array.from({ length: 5 }, (_, index) => ({ ...LINK, label: `L${index}` }));
    const { container } = form({ links: five });

    expect(addLink(container)?.disabled).toBe(true);
  });

  it('leaves without saving when the member backs out', () => {
    const { container, spies } = form();
    const cancel = [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      /cancel/i.test(button.textContent ?? '')
    );

    cancel?.click();

    expect(spies.onCancel).toHaveBeenCalled();
  });

  it('refuses a description longer than the field will hold', async () => {
    const { container, spies } = form();
    const [bio] = container.querySelectorAll<HTMLTextAreaElement>('textarea');

    fireEvent.change(bio as HTMLElement, { target: { value: 'x'.repeat(501) } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(spies.onSaved).not.toHaveBeenCalled();
  });
});
