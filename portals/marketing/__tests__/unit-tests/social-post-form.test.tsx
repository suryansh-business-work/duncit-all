import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';
import {
  PUBLISH_RULES,
  platformProblems,
  textLength,
} from '../../src/pages/social-accounts-page/social-post-form/publish-rules';
import {
  blankSocialPostValues,
  socialPostSchema,
  toSocialPostInput,
  type SocialPostFormValues,
} from '../../src/pages/social-accounts-page/social-post-form/social-post.types';
import SocialPostForm from '../../src/pages/social-accounts-page/social-post-form/social-post.form';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const NOW = new Date('2026-09-15T08:00:00.000Z');
const IMAGE_URL = 'https://ik.imagekit.io/duncit/run.jpg';
const VIDEO_URL = 'https://ik.imagekit.io/duncit/run.mp4';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const linkedin = makeSocialAccount();
const xAccount = makeSocialAccount({ id: 'x1', provider: 'X', platform: 'X', name: 'Duncit X' });
const instagram = makeSocialAccount({ id: 'ig1', provider: 'META', platform: 'INSTAGRAM', name: 'Duncit Gram' });
const youtube = makeSocialAccount({ id: 'yt1', provider: 'YOUTUBE', platform: 'YOUTUBE', name: 'Duncit TV' });

describe('publish-rules', () => {
  it('counts an emoji as one character', () => {
    expect(textLength('Run 🏃')).toBe(5);
    expect('Run 🏃').toHaveLength(6);
  });

  it('finds nothing wrong with a post a network accepts', () => {
    expect(platformProblems('FACEBOOK', 'Hello', 'VIDEO')).toEqual([]);
    expect(platformProblems('FACEBOOK', '', null)).toEqual([]);
  });

  it('asks LinkedIn for text when there is only whitespace', () => {
    expect(platformProblems('LINKEDIN', '   ', null)).toEqual([
      { field: 'text', key: 'marketing.social.ruleNeedsText', vars: {} },
    ]);
  });

  it('refuses text over the network limit but allows exactly the limit', () => {
    expect(platformProblems('X', 'a'.repeat(PUBLISH_RULES.X.maxText), null)).toEqual([]);
    expect(platformProblems('X', 'a'.repeat(281), null)).toEqual([
      { field: 'text', key: 'marketing.social.ruleTooLong', vars: { limit: 280 } },
    ]);
  });

  it('asks Instagram for an image or video, and YouTube for a video', () => {
    expect(platformProblems('INSTAGRAM', 'Caption', null)).toEqual([
      { field: 'media_url', key: 'marketing.social.ruleNeedsMedia', vars: {} },
    ]);
    expect(platformProblems('YOUTUBE', 'Title', null)).toEqual([
      { field: 'media_url', key: 'marketing.social.ruleNeedsVideo', vars: {} },
    ]);
  });

  it('refuses a kind of media the network cannot take', () => {
    expect(platformProblems('YOUTUBE', 'Title', 'IMAGE')).toEqual([
      { field: 'media_url', key: 'marketing.social.ruleMediaUnsupported', vars: {} },
    ]);
    expect(platformProblems('LINKEDIN', 'Hi', 'VIDEO')).toEqual([
      { field: 'media_url', key: 'marketing.social.ruleMediaUnsupported', vars: {} },
    ]);
  });

  it('reports every problem at once', () => {
    expect(platformProblems('YOUTUBE', '', null).map((problem) => problem.key)).toEqual([
      'marketing.social.ruleNeedsText',
      'marketing.social.ruleNeedsVideo',
    ]);
  });
});

describe('blankSocialPostValues', () => {
  it('starts empty and scheduled', () => {
    expect(blankSocialPostValues()).toEqual({
      account_ids: [],
      text: '',
      media_url: '',
      scheduled_at: '',
      mode: 'SCHEDULE',
    });
  });

  it('keeps what it was given', () => {
    expect(blankSocialPostValues({ text: 'Hi', account_ids: ['sa1'], mode: 'DRAFT' })).toEqual({
      account_ids: ['sa1'],
      text: 'Hi',
      media_url: '',
      scheduled_at: '',
      mode: 'DRAFT',
    });
  });
});

describe('socialPostSchema', () => {
  const accounts = [linkedin, xAccount, instagram, youtube];
  const issues = (values: Partial<SocialPostFormValues>) => {
    const result = socialPostSchema(t, accounts).safeParse(blankSocialPostValues(values));
    return result.success ? [] : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  };

  it('lets a draft through with only text in it, even without accounts or a time', () => {
    expect(issues({ mode: 'DRAFT', text: 'Idea' })).toEqual([]);
  });

  it('lets a draft through with only media in it', () => {
    expect(issues({ mode: 'DRAFT', media_url: IMAGE_URL })).toEqual([]);
  });

  it('asks an empty draft for something and nothing else', () => {
    expect(issues({ mode: 'DRAFT', text: '  ', media_url: '   ' })).toEqual([
      { path: 'text', message: t('marketing.social.writeSomething') },
    ]);
  });

  it('asks a post sent now for an account but not for a time', () => {
    expect(issues({ mode: 'NOW', text: 'Hello' })).toEqual([{ path: 'account_ids', message: t('marketing.social.pickAccount') }]);
  });

  it('asks a scheduled post for a time when none is picked or it does not parse', () => {
    const expected = [{ path: 'scheduled_at', message: t('marketing.social.pickFutureTime') }];
    expect(issues({ mode: 'SCHEDULE', text: 'Hello', account_ids: ['sa1'] })).toEqual(expected);
    expect(issues({ mode: 'SCHEDULE', text: 'Hello', account_ids: ['sa1'], scheduled_at: 'not a date' })).toEqual(expected);
  });

  it('refuses a time past the minute of grace and accepts one within it', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const base = { mode: 'SCHEDULE' as const, text: 'Hello', account_ids: ['sa1'] };
    expect(issues({ ...base, scheduled_at: '2026-09-15T07:58:59.000Z' })).toEqual([
      { path: 'scheduled_at', message: t('marketing.social.pickFutureTime') },
    ]);
    expect(issues({ ...base, scheduled_at: '2026-09-15T07:59:30.000Z' })).toEqual([]);
    expect(issues({ ...base, scheduled_at: '2026-09-20T10:00:00.000Z' })).toEqual([]);
  });

  it('names the network whose rule the post breaks', () => {
    const x = t('marketing.social.platformX');
    expect(issues({ mode: 'NOW', text: 'a'.repeat(300), account_ids: ['x1'] })).toEqual([
      { path: 'text', message: t('marketing.social.ruleTooLong', { vars: { limit: 280, network: x } }) },
    ]);
  });

  it('reads the media kind off the URL', () => {
    const linkedIn = t('marketing.social.platformLinkedin');
    const tv = t('marketing.social.platformYoutube');
    expect(issues({ mode: 'NOW', text: 'Clip', media_url: VIDEO_URL, account_ids: ['sa1'] })).toEqual([
      { path: 'media_url', message: t('marketing.social.ruleMediaUnsupported', { vars: { network: linkedIn } }) },
    ]);
    expect(issues({ mode: 'NOW', text: 'Clip', media_url: VIDEO_URL, account_ids: ['yt1'] })).toEqual([]);
    expect(issues({ mode: 'NOW', text: 'Clip', media_url: IMAGE_URL, account_ids: ['yt1'] })).toEqual([
      { path: 'media_url', message: t('marketing.social.ruleMediaUnsupported', { vars: { network: tv } }) },
    ]);
  });

  it('checks each chosen network once and ignores accounts not chosen or unknown', () => {
    const gram = t('marketing.social.platformInstagram');
    const second = makeSocialAccount({ id: 'ig2', provider: 'META', platform: 'INSTAGRAM', name: 'Pets Gram' });
    const result = socialPostSchema(t, [...accounts, second]).safeParse(
      blankSocialPostValues({ mode: 'NOW', text: 'Hi', account_ids: ['ig1', 'ig2', 'ghost'] }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      t('marketing.social.ruleNeedsMedia', { vars: { network: gram } }),
    ]);
  });
});

describe('toSocialPostInput', () => {
  it('trims the media, reads its kind and links the idea', () => {
    expect(
      toSocialPostInput(
        blankSocialPostValues({
          text: 'Run club',
          media_url: `  ${VIDEO_URL} `,
          account_ids: ['sa1', 'x1'],
          scheduled_at: '2026-09-20T10:00:00.000Z',
        }),
        'idea1',
      ),
    ).toEqual({
      text: 'Run club',
      media_url: VIDEO_URL,
      media_type: 'VIDEO',
      account_ids: ['sa1', 'x1'],
      mode: 'SCHEDULE',
      scheduled_at: '2026-09-20T10:00:00.000Z',
      idea_id: 'idea1',
    });
  });

  it('sends nulls for no media, no time and no idea', () => {
    expect(toSocialPostInput(blankSocialPostValues({ text: 'Hi', media_url: '   ', mode: 'DRAFT' }), null)).toEqual({
      text: 'Hi',
      media_url: null,
      media_type: null,
      account_ids: [],
      mode: 'DRAFT',
      scheduled_at: null,
      idea_id: null,
    });
  });

  it('marks an image URL as an image', () => {
    expect(toSocialPostInput(blankSocialPostValues({ media_url: IMAGE_URL }), null).media_type).toBe('IMAGE');
  });
});

describe('SocialPostForm', () => {
  const renderForm = (initial: Partial<SocialPostFormValues> = {}, errorMessage?: string | null) => {
    const onSubmit = vi.fn<(values: SocialPostFormValues) => Promise<void>>().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    renderWithProviders(
      <SocialPostForm
        accounts={[linkedin, xAccount, instagram]}
        initial={blankSocialPostValues(initial)}
        errorMessage={errorMessage}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    return { onSubmit, onCancel };
  };
  const textBox = () => screen.getByRole('textbox', { name: t('marketing.social.postText') });

  it('saves a draft with what was written', async () => {
    const { onSubmit } = renderForm();
    expect(screen.getByText(t('marketing.social.postTextHint'))).toBeInTheDocument();
    expect(screen.getByText(t('marketing.social.postMediaHint'))).toBeInTheDocument();
    expect(screen.getByText(t('marketing.social.postWhenHint'))).toBeInTheDocument();
    fireEvent.change(textBox(), { target: { value: 'Sunday run' } });
    fireEvent.click(screen.getByTestId('social-post-draft'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      account_ids: [],
      text: 'Sunday run',
      media_url: '',
      scheduled_at: '',
      mode: 'DRAFT',
    });
  });

  it('holds back a schedule with no account or time and says why', async () => {
    const { onSubmit } = renderForm({ text: 'Sunday run' });
    fireEvent.click(screen.getByTestId('social-post-schedule'));
    expect(await screen.findByText(t('marketing.social.pickAccount'))).toBeInTheDocument();
    expect(screen.getByText(t('marketing.social.pickFutureTime'))).toBeInTheDocument();
    expect(screen.queryByText(t('marketing.social.postWhenHint'))).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('schedules a post for the chosen account at its time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const { onSubmit } = renderForm({ text: 'Sunday run', scheduled_at: '2026-09-20T10:00:00.000Z' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Duncit Pages' }));
    fireEvent.click(screen.getByTestId('social-post-schedule'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      account_ids: ['sa1'],
      mode: 'SCHEDULE',
      scheduled_at: '2026-09-20T10:00:00.000Z',
    });
  });

  it('shows a character count per chosen network and refuses text over X’s limit', async () => {
    const { onSubmit } = renderForm({ text: 'a'.repeat(300) });
    expect(screen.queryByTestId('social-post-limits')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Duncit X' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Duncit Pages' }));
    const limits = await screen.findByTestId('social-post-limits');
    const x = t('marketing.social.platformX');
    expect(within(limits).getByText(t('marketing.social.charCount', { vars: { network: x, used: '300', max: '280' } }))).toBeInTheDocument();
    expect(within(limits).getAllByText(/\/ /)).toHaveLength(2);
    fireEvent.click(screen.getByTestId('social-post-now'));
    expect(await screen.findByText(t('marketing.social.ruleTooLong', { vars: { limit: 280, network: x } }))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('puts a media problem under the media field in place of its hint', async () => {
    const { onSubmit } = renderForm({ text: 'Caption', account_ids: ['ig1'] });
    fireEvent.click(screen.getByTestId('social-post-now'));
    const gram = t('marketing.social.platformInstagram');
    expect(await screen.findByText(t('marketing.social.ruleNeedsMedia', { vars: { network: gram } }))).toBeInTheDocument();
    expect(screen.queryByText(t('marketing.social.postMediaHint'))).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('publishes now without asking for a time', async () => {
    const { onSubmit } = renderForm({ text: 'Live now', account_ids: ['sa1'], media_url: IMAGE_URL });
    fireEvent.click(screen.getByTestId('social-post-now'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      account_ids: ['sa1'],
      text: 'Live now',
      media_url: IMAGE_URL,
      scheduled_at: '',
      mode: 'NOW',
    });
  });

  it('shows the last server error and cancels on request', () => {
    const { onCancel } = renderForm({}, 'Media URL is not reachable');
    expect(screen.getByRole('alert')).toHaveTextContent('Media URL is not reachable');
    fireEvent.click(screen.getByRole('button', { name: t('shell.common.cancel') }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('has no error banner while nothing has failed', () => {
    renderForm({}, null);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not submit on Enter — only the buttons send the post', () => {
    const { onSubmit } = renderForm({ text: 'Sunday run' });
    const notPrevented = fireEvent.submit(screen.getByTestId('social-post-form'));
    expect(notPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
