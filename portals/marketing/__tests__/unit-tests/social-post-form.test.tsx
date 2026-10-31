import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  MediaListField: (await import('../mocks/media-list-field.mock')).MediaListFieldStub,
}));

import {
  PUBLISH_RULES,
  platformProblems,
  textLength,
} from '../../src/pages/social-accounts-page/social-post-form/publish-rules';
import {
  blankSocialPostValues,
  mediaFromUrl,
  postMedia,
  sentBackNote,
  socialPostSchema,
  toSocialPostInput,
  type SocialPostFormValues,
} from '../../src/pages/social-accounts-page/social-post-form/social-post.types';
import { linesToMedia, mediaToLines } from '../../src/pages/social-accounts-page/social-post-form/PostMediaField';
import SocialPostForm from '../../src/pages/social-accounts-page/social-post-form/social-post.form';
import type { SocialPostMedia } from '../../src/pages/social-accounts-page/publish.queries';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const NOW = new Date('2026-09-15T08:00:00.000Z');
const IMAGE_URL = 'https://ik.imagekit.io/duncit/run.jpg';
const VIDEO_URL = 'https://ik.imagekit.io/duncit/run.mp4';
const IMAGE: SocialPostMedia = { url: IMAGE_URL, type: 'IMAGE' };
const VIDEO: SocialPostMedia = { url: VIDEO_URL, type: 'VIDEO' };
const images = (count: number): SocialPostMedia[] =>
  Array.from({ length: count }, (_, index) => ({ url: `https://ik.imagekit.io/duncit/slide-${index + 1}.jpg`, type: 'IMAGE' }));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const linkedin = makeSocialAccount();
const xAccount = makeSocialAccount({ id: 'x1', provider: 'X', platform: 'X', name: 'Duncit X' });
const instagram = makeSocialAccount({ id: 'ig1', provider: 'INSTAGRAM', platform: 'INSTAGRAM', name: 'Duncit Gram' });
const youtube = makeSocialAccount({ id: 'yt1', provider: 'YOUTUBE', platform: 'YOUTUBE', name: 'Duncit TV' });
const facebook = makeSocialAccount({ id: 'fb1', provider: 'FACEBOOK', platform: 'FACEBOOK', name: 'Duncit FB' });

describe('publish-rules', () => {
  it('counts an emoji as one character', () => {
    expect(textLength('Run 🏃')).toBe(5);
    expect('Run 🏃').toHaveLength(6);
  });

  it('allows collaborators on Instagram alone, at most 3 as its API does', () => {
    expect(PUBLISH_RULES.INSTAGRAM.maxCollaborators).toBe(3);
    expect(Object.values(PUBLISH_RULES).filter((rules) => rules.maxCollaborators > 0)).toHaveLength(1);
  });

  it('carries the carousel limits of the server table', () => {
    expect(PUBLISH_RULES.INSTAGRAM).toMatchObject({ maxMedia: 10, carouselVideo: true });
    expect(PUBLISH_RULES.FACEBOOK).toMatchObject({ maxMedia: 10, carouselVideo: false });
    expect(PUBLISH_RULES.THREADS).toMatchObject({ maxMedia: 20, carouselVideo: true });
    expect(PUBLISH_RULES.YOUTUBE).toMatchObject({ maxMedia: 1, media: ['VIDEO'] });
    expect(PUBLISH_RULES.LINKEDIN).toMatchObject({ maxMedia: 20, media: ['IMAGE'] });
    expect(PUBLISH_RULES.X).toMatchObject({ maxMedia: 4, media: ['IMAGE'] });
  });

  it('finds nothing wrong with a post a network accepts', () => {
    expect(platformProblems('FACEBOOK', 'Hello', [VIDEO])).toEqual([]);
    expect(platformProblems('FACEBOOK', '', [])).toEqual([]);
  });

  it('asks LinkedIn for text when there is only whitespace', () => {
    expect(platformProblems('LINKEDIN', '   ', [])).toEqual([
      { field: 'text', key: 'marketing.social.ruleNeedsText', vars: {} },
    ]);
  });

  it('refuses text over the network limit but allows exactly the limit', () => {
    expect(platformProblems('X', 'a'.repeat(PUBLISH_RULES.X.maxText), [])).toEqual([]);
    expect(platformProblems('X', 'a'.repeat(281), [])).toEqual([
      { field: 'text', key: 'marketing.social.ruleTooLong', vars: { limit: 280 } },
    ]);
  });

  it('asks Instagram for an image or video, and YouTube for a video', () => {
    expect(platformProblems('INSTAGRAM', 'Caption', [])).toEqual([
      { field: 'media', key: 'marketing.social.ruleNeedsMedia', vars: {} },
    ]);
    expect(platformProblems('YOUTUBE', 'Title', [])).toEqual([
      { field: 'media', key: 'marketing.social.ruleNeedsVideo', vars: {} },
    ]);
  });

  it('refuses a kind of media the network cannot take, wherever it sits in the list', () => {
    const unsupported = [{ field: 'media', key: 'marketing.social.ruleMediaUnsupported', vars: {} }];
    expect(platformProblems('YOUTUBE', 'Title', [IMAGE])).toEqual(unsupported);
    expect(platformProblems('LINKEDIN', 'Hi', [VIDEO])).toEqual(unsupported);
    // The video is the problem, not the carousel — one message, not two.
    expect(platformProblems('LINKEDIN', 'Hi', [IMAGE, VIDEO])).toEqual(unsupported);
  });

  it('refuses more items than the network takes but allows exactly its limit', () => {
    expect(platformProblems('X', 'Hi', images(4))).toEqual([]);
    expect(platformProblems('X', 'Hi', images(5))).toEqual([
      { field: 'media', key: 'marketing.social.ruleTooManyMedia', vars: { limit: 4 } },
    ]);
    expect(platformProblems('INSTAGRAM', '', images(10))).toEqual([]);
    expect(platformProblems('INSTAGRAM', '', images(11))).toEqual([
      { field: 'media', key: 'marketing.social.ruleTooManyMedia', vars: { limit: 10 } },
    ]);
  });

  it('keeps a video out of a carousel where the network takes it only on its own', () => {
    expect(platformProblems('FACEBOOK', '', [VIDEO])).toEqual([]);
    expect(platformProblems('FACEBOOK', '', [IMAGE, VIDEO])).toEqual([
      { field: 'media', key: 'marketing.social.ruleCarouselImagesOnly', vars: {} },
    ]);
    expect(platformProblems('FACEBOOK', '', images(2))).toEqual([]);
    expect(platformProblems('INSTAGRAM', '', [IMAGE, VIDEO])).toEqual([]);
    expect(platformProblems('THREADS', '', [VIDEO, VIDEO])).toEqual([]);
  });

  it('tells YouTube it was given too many, not that carousels are images only', () => {
    expect(platformProblems('YOUTUBE', 'Title', [VIDEO, VIDEO])).toEqual([
      { field: 'media', key: 'marketing.social.ruleTooManyMedia', vars: { limit: 1 } },
    ]);
  });

  it('reports every problem at once', () => {
    expect(platformProblems('YOUTUBE', '', []).map((problem) => problem.key)).toEqual([
      'marketing.social.ruleNeedsText',
      'marketing.social.ruleNeedsVideo',
    ]);
    expect(platformProblems('X', 'a'.repeat(300), [...images(4), VIDEO]).map((problem) => problem.key)).toEqual([
      'marketing.social.ruleTooLong',
      'marketing.social.ruleTooManyMedia',
      'marketing.social.ruleMediaUnsupported',
    ]);
  });
});

describe('blankSocialPostValues', () => {
  it('starts empty, scheduled and not needing approval', () => {
    expect(blankSocialPostValues()).toEqual({
      account_ids: [],
      text: '',
      media: [],
      scheduled_at: '',
      mode: 'SCHEDULE',
      needs_approval: false,
      collaborators: [],
    });
  });

  it('keeps what it was given', () => {
    expect(blankSocialPostValues({ text: 'Hi', account_ids: ['sa1'], mode: 'DRAFT', media: [VIDEO], needs_approval: true })).toEqual({
      account_ids: ['sa1'],
      text: 'Hi',
      media: [VIDEO],
      scheduled_at: '',
      mode: 'DRAFT',
      needs_approval: true,
      collaborators: [],
    });
  });
});

describe('media helpers', () => {
  it('reads the kind of a picked URL off its address', () => {
    expect(mediaFromUrl(IMAGE_URL)).toEqual(IMAGE);
    expect(mediaFromUrl(`${VIDEO_URL}?tr=orig-true`)).toEqual({ url: `${VIDEO_URL}?tr=orig-true`, type: 'VIDEO' });
  });

  it('takes a post’s media list over its single URL, keeping only the two fields', () => {
    const rows = [{ __typename: 'SocialPostMedia', ...VIDEO }, { __typename: 'SocialPostMedia', ...IMAGE }];
    expect(postMedia({ media: rows, media_url: VIDEO_URL, media_type: 'VIDEO' })).toEqual([VIDEO, IMAGE]);
  });

  it('falls back to the single URL of a post written before carousels, with its recorded or read kind', () => {
    expect(postMedia({ media: [], media_url: 'https://ik.imagekit.io/duncit/clip.bin', media_type: 'VIDEO' })).toEqual([
      { url: 'https://ik.imagekit.io/duncit/clip.bin', type: 'VIDEO' },
    ]);
    expect(postMedia({ media: [], media_url: VIDEO_URL, media_type: null })).toEqual([VIDEO]);
    expect(postMedia({ media: [], media_url: null, media_type: null })).toEqual([]);
  });

  it('shows a reviewer’s note only on the draft the post came back as', () => {
    expect(sentBackNote({ status: 'DRAFT', review_note: 'Too salesy' })).toBe('Too salesy');
    expect(sentBackNote({ status: 'DRAFT', review_note: null })).toBeNull();
    expect(sentBackNote({ status: 'PENDING_APPROVAL', review_note: 'Too salesy' })).toBeNull();
    expect(sentBackNote({ status: 'SCHEDULED', review_note: 'Too salesy' })).toBeNull();
  });

  it('writes the list one URL per line and reads it back in order, skipping blank lines', () => {
    expect(mediaToLines([IMAGE, VIDEO])).toBe(`${IMAGE_URL}\n${VIDEO_URL}`);
    expect(mediaToLines([])).toBe('');
    expect(linesToMedia(` ${VIDEO_URL} \n\n${IMAGE_URL}\n`, [])).toEqual([VIDEO, IMAGE]);
  });

  it('keeps the recorded kind of a URL already in the list and reads a new one off its address', () => {
    const recorded: SocialPostMedia = { url: 'https://ik.imagekit.io/duncit/clip.bin', type: 'VIDEO' };
    expect(linesToMedia(`${recorded.url}\n${IMAGE_URL}`, [recorded])).toEqual([recorded, IMAGE]);
  });
});

describe('socialPostSchema', () => {
  const accounts = [linkedin, xAccount, instagram, youtube, facebook];
  const issues = (values: Partial<SocialPostFormValues>) => {
    const result = socialPostSchema(t, accounts).safeParse(blankSocialPostValues(values));
    return result.success ? [] : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  };

  it('lets a draft through with only text in it, even without accounts or a time', () => {
    expect(issues({ mode: 'DRAFT', text: 'Idea' })).toEqual([]);
  });

  it('lets a draft through with only media in it', () => {
    expect(issues({ mode: 'DRAFT', media: [IMAGE] })).toEqual([]);
  });

  it('asks an empty draft for something and nothing else', () => {
    expect(issues({ mode: 'DRAFT', text: '  ', media: [] })).toEqual([
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

  it('checks the kind of every item against each chosen network', () => {
    const linkedIn = t('marketing.social.platformLinkedin');
    const tv = t('marketing.social.platformYoutube');
    expect(issues({ mode: 'NOW', text: 'Clip', media: [VIDEO], account_ids: ['sa1'] })).toEqual([
      { path: 'media', message: t('marketing.social.ruleMediaUnsupported', { vars: { network: linkedIn } }) },
    ]);
    expect(issues({ mode: 'NOW', text: 'Clip', media: [VIDEO], account_ids: ['yt1'] })).toEqual([]);
    expect(issues({ mode: 'NOW', text: 'Clip', media: [IMAGE], account_ids: ['yt1'] })).toEqual([
      { path: 'media', message: t('marketing.social.ruleMediaUnsupported', { vars: { network: tv } }) },
    ]);
  });

  it('names the network a carousel is too long for, with its limit', () => {
    const x = t('marketing.social.platformX');
    expect(issues({ mode: 'NOW', text: 'Five', media: images(5), account_ids: ['x1'] })).toEqual([
      { path: 'media', message: t('marketing.social.ruleTooManyMedia', { vars: { limit: 4, network: x } }) },
    ]);
    expect(issues({ mode: 'NOW', text: 'Four', media: images(4), account_ids: ['x1'] })).toEqual([]);
  });

  it('keeps a video out of a Facebook carousel but lets Instagram mix them', () => {
    const fb = t('marketing.social.platformFacebook');
    expect(issues({ mode: 'NOW', text: 'Mix', media: [IMAGE, VIDEO], account_ids: ['fb1'] })).toEqual([
      { path: 'media', message: t('marketing.social.ruleCarouselImagesOnly', { vars: { network: fb } }) },
    ]);
    expect(issues({ mode: 'NOW', text: 'Mix', media: [IMAGE, VIDEO], account_ids: ['ig1'] })).toEqual([]);
  });

  it('checks each chosen network once and ignores accounts not chosen or unknown', () => {
    const gram = t('marketing.social.platformInstagram');
    const second = makeSocialAccount({ id: 'ig2', provider: 'INSTAGRAM', platform: 'INSTAGRAM', name: 'Pets Gram' });
    const result = socialPostSchema(t, [...accounts, second]).safeParse(
      blankSocialPostValues({ mode: 'NOW', text: 'Hi', account_ids: ['ig1', 'ig2', 'ghost'] }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      t('marketing.social.ruleNeedsMedia', { vars: { network: gram } }),
    ]);
  });

  it('holds collaborators to the Instagram cap and the username shape', () => {
    expect(issues({ mode: 'DRAFT', text: 'Hi', collaborators: ['a', 'b', 'c'] })).toEqual([]);
    expect(issues({ mode: 'DRAFT', text: 'Hi', collaborators: ['a', 'b', 'c', 'd'] })).toEqual([
      { path: 'collaborators', message: t('marketing.social.collaboratorsTooMany', { vars: { max: 3 } }) },
    ]);
    expect(issues({ mode: 'DRAFT', text: 'Hi', collaborators: ['run-club'] })).toEqual([
      { path: 'collaborators', message: t('marketing.social.collaboratorInvalid') },
    ]);
  });

  it('refuses a media row whose kind is not one the server knows', () => {
    const result = socialPostSchema(t, accounts).safeParse(
      blankSocialPostValues({ mode: 'DRAFT', text: 'Hi', media: [{ url: IMAGE_URL, type: 'GIF' as 'IMAGE' }] }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['media', 0, 'type']);
  });
});

describe('toSocialPostInput', () => {
  it('sends the media rows in order with only their two fields, the approval flag, the idea and the reel it came from', () => {
    const rows = [{ __typename: 'SocialPostMedia', ...VIDEO }, IMAGE];
    expect(
      toSocialPostInput(
        blankSocialPostValues({
          text: 'Run club',
          media: rows,
          account_ids: ['sa1', 'x1'],
          scheduled_at: '2026-09-20T10:00:00.000Z',
          needs_approval: true,
          collaborators: ['blue.cafe'],
        }),
        'idea1',
        'reel1',
      ),
    ).toEqual({
      text: 'Run club',
      media: [VIDEO, IMAGE],
      account_ids: ['sa1', 'x1'],
      mode: 'SCHEDULE',
      scheduled_at: '2026-09-20T10:00:00.000Z',
      idea_id: 'idea1',
      needs_approval: true,
      reel_project_id: 'reel1',
      collaborators: ['blue.cafe'],
    });
  });

  it('sends an empty list, and nulls for no time, no idea and no reel', () => {
    expect(toSocialPostInput(blankSocialPostValues({ text: 'Hi', mode: 'DRAFT' }), null)).toEqual({
      text: 'Hi',
      media: [],
      account_ids: [],
      mode: 'DRAFT',
      scheduled_at: null,
      idea_id: null,
      needs_approval: false,
      reel_project_id: null,
      collaborators: [],
    });
  });
});

describe('SocialPostForm', () => {
  const renderForm = (initial: Partial<SocialPostFormValues> = {}, errorMessage?: string | null, reviewNote?: string | null) => {
    const onSubmit = vi.fn<(values: SocialPostFormValues) => Promise<void>>().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    renderWithProviders(
      <SocialPostForm
        accounts={[linkedin, xAccount, instagram, facebook]}
        initial={blankSocialPostValues(initial)}
        errorMessage={errorMessage}
        reviewNote={reviewNote}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    return { onSubmit, onCancel };
  };
  const textBox = () => screen.getByRole('textbox', { name: t('marketing.social.postText') });
  const mediaBox = () => screen.getByRole('textbox', { name: t('marketing.social.postMedia') });
  const setMedia = (urls: string[]) => fireEvent.change(mediaBox(), { target: { value: urls.join('\n') } });
  const approval = () => screen.getByRole('switch', { name: t('marketing.social.needsApproval') });

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
      media: [],
      scheduled_at: '',
      mode: 'DRAFT',
      needs_approval: false,
      collaborators: [],
    });
  });

  it('files uploads under the social folder and offers to add an image or video', () => {
    renderForm();
    expect(screen.getByTestId('media-list')).toHaveAttribute('data-folder', '/marketing/social');
    expect(screen.getByRole('button', { name: t('marketing.social.addMedia') })).toBeInTheDocument();
  });

  it('adds, reorders and removes media through the list, reading each kind off its URL', async () => {
    const { onSubmit } = renderForm({ text: 'Carousel' });
    expect(mediaBox()).toHaveValue('');
    setMedia([IMAGE_URL, VIDEO_URL]);
    fireEvent.click(screen.getByTestId('social-post-draft'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].media).toEqual([IMAGE, VIDEO]);

    setMedia([VIDEO_URL, IMAGE_URL]);
    fireEvent.click(screen.getByTestId('social-post-draft'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][0].media).toEqual([VIDEO, IMAGE]);

    setMedia([VIDEO_URL]);
    fireEvent.click(screen.getByTestId('social-post-draft'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(3));
    expect(onSubmit.mock.calls[2][0].media).toEqual([VIDEO]);
  });

  it('opens with an existing list in order and keeps a recorded kind the URL does not show', async () => {
    const recorded: SocialPostMedia = { url: 'https://ik.imagekit.io/duncit/clip.bin', type: 'VIDEO' };
    const { onSubmit } = renderForm({ text: 'Keep', media: [recorded, IMAGE] });
    expect(mediaBox()).toHaveValue(`${recorded.url}\n${IMAGE_URL}`);
    setMedia([recorded.url, IMAGE_URL, VIDEO_URL]);
    fireEvent.click(screen.getByTestId('social-post-draft'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].media).toEqual([recorded, IMAGE, VIDEO]);
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
    expect(screen.queryByTestId('social-post-media-limit-X')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-post-now'));
    expect(await screen.findByText(t('marketing.social.ruleTooLong', { vars: { limit: 280, network: x } }))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the media count against each network’s limit once there is more than one item, and refuses too many', async () => {
    const { onSubmit } = renderForm({ text: 'Five', media: images(5), account_ids: ['x1', 'sa1'] });
    const x = t('marketing.social.platformX');
    const linkedIn = t('marketing.social.platformLinkedin');
    const xChip = screen.getByTestId('social-post-media-limit-X');
    expect(xChip).toHaveTextContent(t('marketing.social.mediaCountLimit', { vars: { network: x, used: 5, limit: 4 } }));
    expect(xChip.className).toMatch(/colorError/);
    const linkedInChip = screen.getByTestId('social-post-media-limit-LINKEDIN');
    expect(linkedInChip).toHaveTextContent(t('marketing.social.mediaCountLimit', { vars: { network: linkedIn, used: 5, limit: 20 } }));
    expect(linkedInChip.className).not.toMatch(/colorError/);

    fireEvent.click(screen.getByTestId('social-post-now'));
    expect(await screen.findByText(t('marketing.social.ruleTooManyMedia', { vars: { limit: 4, network: x } }))).toBeInTheDocument();
    expect(screen.queryByText(t('marketing.social.postMediaHint'))).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    setMedia(images(4).map((item) => item.url));
    await waitFor(() => expect(screen.getByTestId('social-post-media-limit-X').className).not.toMatch(/colorError/));
    setMedia([IMAGE_URL]);
    await waitFor(() => expect(screen.queryByTestId('social-post-media-limit-X')).not.toBeInTheDocument());
  });

  it('puts a media problem under the media field in place of its hint', async () => {
    const { onSubmit } = renderForm({ text: 'Caption', account_ids: ['ig1'] });
    fireEvent.click(screen.getByTestId('social-post-now'));
    const gram = t('marketing.social.platformInstagram');
    expect(await screen.findByText(t('marketing.social.ruleNeedsMedia', { vars: { network: gram } }))).toBeInTheDocument();
    expect(screen.queryByText(t('marketing.social.postMediaHint'))).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('offers collaborators only once an Instagram account is picked, and sends them', async () => {
    const { onSubmit } = renderForm({ text: 'Collab', media: [IMAGE] });
    expect(screen.queryByTestId('social-post-collaborators')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Duncit Gram' }));
    const field = await screen.findByTestId('social-post-collaborators');
    expect(within(field).getByText(t('marketing.social.collaboratorsHint', { vars: { max: 3 } }))).toBeInTheDocument();
    const input = within(field).getByRole('combobox');
    fireEvent.change(input, { target: { value: '@Blue.Cafe' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const gram = t('marketing.social.platformInstagram');
    expect(await screen.findByTestId('social-post-collaborator-limit-INSTAGRAM')).toHaveTextContent(
      t('marketing.social.collaboratorCountLimit', { vars: { network: gram, used: 1, limit: 3 } }),
    );
    fireEvent.click(screen.getByTestId('social-post-now'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ account_ids: ['ig1'], collaborators: ['blue.cafe'] });
  });

  it('drops collaborators once no Instagram account is left, so other networks never get them', async () => {
    const { onSubmit } = renderForm({ text: 'Was a collab', account_ids: ['ig1'], collaborators: ['blue.cafe'] });
    expect(screen.getByTestId('social-post-collaborators')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Duncit Gram' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Duncit Pages' }));
    expect(screen.queryByTestId('social-post-collaborators')).not.toBeInTheDocument();
    expect(screen.queryByTestId('social-post-collaborator-limit-LINKEDIN')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-post-now'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ account_ids: ['sa1'], collaborators: [] });
  });

  it('refuses a fourth collaborator and colours the Instagram count', async () => {
    const { onSubmit } = renderForm({ text: 'Too many', media: [IMAGE], account_ids: ['ig1'], collaborators: ['a', 'b', 'c', 'd'] });
    expect(screen.getByTestId('social-post-collaborator-limit-INSTAGRAM').className).toMatch(/colorError/);
    fireEvent.click(screen.getByTestId('social-post-now'));
    expect(await screen.findByText(t('marketing.social.collaboratorsTooMany', { vars: { max: 3 } }))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('publishes now without asking for a time', async () => {
    const { onSubmit } = renderForm({ text: 'Live now', account_ids: ['sa1'], media: [IMAGE] });
    fireEvent.click(screen.getByTestId('social-post-now'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      account_ids: ['sa1'],
      text: 'Live now',
      media: [IMAGE],
      scheduled_at: '',
      mode: 'NOW',
      needs_approval: false,
      collaborators: [],
    });
  });

  it('turns the sending buttons into "send for approval" while the switch is on, and sends the flag', async () => {
    const { onSubmit } = renderForm({ text: 'Review me', account_ids: ['sa1'] });
    expect(approval()).not.toBeChecked();
    expect(screen.getByTestId('social-post-now')).toHaveTextContent(t('marketing.social.publishNow'));
    expect(screen.getByTestId('social-post-schedule')).toHaveTextContent(t('marketing.social.schedule'));
    expect(screen.getByRole('button', { name: t('ui.guide.helpTipLabel') })).toBeInTheDocument();

    fireEvent.click(approval());
    expect(approval()).toBeChecked();
    expect(screen.getByTestId('social-post-now')).toHaveTextContent(t('marketing.social.sendForApprovalNow'));
    expect(screen.getByTestId('social-post-schedule')).toHaveTextContent(t('marketing.social.sendForApproval'));
    // The draft button is untouched: a draft is never sent anywhere.
    expect(screen.getByTestId('social-post-draft')).toHaveTextContent(t('marketing.social.saveDraft'));

    fireEvent.click(screen.getByTestId('social-post-now'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ mode: 'NOW', needs_approval: true });

    fireEvent.click(approval());
    expect(approval()).not.toBeChecked();
    expect(screen.getByTestId('social-post-now')).toHaveTextContent(t('marketing.social.publishNow'));
  });

  it('opens with the switch on for a post that already needs approval', () => {
    renderForm({ text: 'Parked', needs_approval: true });
    expect(approval()).toBeChecked();
    expect(screen.getByTestId('social-post-schedule')).toHaveTextContent(t('marketing.social.sendForApproval'));
  });

  it('explains the approval switch on its help tip', async () => {
    renderForm();
    fireEvent.mouseOver(screen.getByRole('button', { name: t('ui.guide.helpTipLabel') }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(t('marketing.social.needsApprovalHint'));
  });

  it('shows the reviewer’s note on a post sent back, and nothing when there is none', () => {
    renderForm({ text: 'Back again' }, null, 'Mention the venue');
    const alert = screen.getByTestId('social-post-sent-back');
    expect(alert).toHaveTextContent(t('marketing.social.sentBack', { vars: { note: 'Mention the venue' } }));
    expect(alert.className).toMatch(/Warning/);
  });

  it('shows the last server error and cancels on request', () => {
    const { onCancel } = renderForm({}, 'Media URL is not reachable');
    expect(screen.getByRole('alert')).toHaveTextContent('Media URL is not reachable');
    expect(screen.queryByTestId('social-post-sent-back')).not.toBeInTheDocument();
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
