import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import { makeSocialAccount, makeSocialScheduledPost } from '../mocks';

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  MediaListField: (await import('../mocks/media-list-field.mock')).MediaListFieldStub,
}));
// Measuring needs a real browser; here it never answers, as a refused cross-origin read would not.
vi.mock('../../src/pages/social-accounts-page/social-post-form/measureMedia', () => ({ measureMedia: vi.fn(() => new Promise(() => undefined)) }));

import {
  blankSocialPostValues,
  keepMeasured,
  postOptionsOf,
  toSocialPostInput,
  type SocialPostFormValues,
} from '../../src/pages/social-accounts-page/social-post-form/social-post.types';
import SocialPostForm from '../../src/pages/social-accounts-page/social-post-form/social-post.form';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });
const IMAGE = { url: 'https://ik.imagekit.io/duncit/run.jpg', type: 'IMAGE' as const };
const VIDEO = { url: 'https://ik.imagekit.io/duncit/run.mp4', type: 'VIDEO' as const };
const instagram = makeSocialAccount({ id: 'ig1', provider: 'INSTAGRAM', platform: 'INSTAGRAM', name: 'Duncit Gram' });
const facebook = makeSocialAccount({ id: 'fb1', provider: 'FACEBOOK', platform: 'FACEBOOK', name: 'Duncit FB' });
const xAccount = makeSocialAccount({ id: 'x1', provider: 'X', platform: 'X', name: 'Duncit X' });

afterEach(() => vi.clearAllMocks());

const renderForm = (initial: Partial<SocialPostFormValues>) => {
  const onSubmit = vi.fn<(values: SocialPostFormValues) => Promise<void>>().mockResolvedValue(undefined);
  renderWithProviders(
    <SocialPostForm accounts={[instagram, facebook, xAccount]} initial={blankSocialPostValues(initial)} onCancel={vi.fn()} onSubmit={onSubmit} />
  );
  return onSubmit;
};
const captionBox = (network: string) => screen.queryByRole('textbox', { name: t('marketing.social.captionFor', { vars: { network } }) });
const commentBox = () => screen.queryByRole('textbox', { name: t('marketing.social.firstComment') });
const pickType = async (label: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: t('marketing.social.postType') }));
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: label }));
};

describe('SocialPostForm — post type, captions per network and the first comment', () => {
  it('sends a network its own caption and the Instagram first comment with the post', async () => {
    const onSubmit = renderForm({ account_ids: ['ig1', 'fb1'], text: 'Sunday run', media: [IMAGE] });
    expect(captionBox('Facebook')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-post-captions-toggle'));
    expect(captionBox('Instagram')).toBeInTheDocument();
    fireEvent.change(captionBox('Facebook') as HTMLElement, { target: { value: 'A longer story for Facebook' } });
    fireEvent.change(commentBox() as HTMLElement, { target: { value: 'Book at duncit.com' } });
    fireEvent.click(screen.getByTestId('social-post-now'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ post_type: 'FEED', captions: { FACEBOOK: 'A longer story for Facebook' }, first_comment: 'Book at duncit.com', mode: 'NOW' });
  });

  it('offers no per-network captions for one network, and no first comment for a story or without Instagram', async () => {
    renderForm({ account_ids: ['ig1'], text: 'Hi', media: [VIDEO] });
    expect(screen.queryByTestId('social-post-captions-toggle')).not.toBeInTheDocument();
    expect(commentBox()).toBeInTheDocument();
    await pickType(t('marketing.social.postTypeStory'));
    await waitFor(() => expect(commentBox()).not.toBeInTheDocument());
  });

  it('drops the captions when per-network captions are turned off, and the first comment when Instagram is not picked', async () => {
    const onSubmit = renderForm({ account_ids: ['fb1', 'x1'], text: 'Hello', captions: { X: 'Short for X' }, first_comment: 'left over' });
    expect(captionBox('X')).toHaveValue('Short for X');
    fireEvent.click(screen.getByTestId('social-post-captions-toggle'));
    expect(captionBox('X')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-post-now'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ captions: {}, first_comment: '' });
  });

  it('shows a caption too long for its network on that caption, counting it in that network’s chip', async () => {
    const onSubmit = renderForm({ account_ids: ['ig1', 'x1'], text: 'Short', media: [IMAGE], captions: { X: 'y'.repeat(281) } });
    expect(within(screen.getByTestId('social-post-limits')).getByText(t('marketing.social.charCount', { vars: { network: 'X', used: '281', max: '280' } }))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-post-now'));
    expect(await screen.findByText(t('marketing.social.ruleTooLong', { vars: { network: 'X', limit: 280 } }))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('says a story is Instagram’s alone when another network is picked', async () => {
    const onSubmit = renderForm({ account_ids: ['ig1', 'fb1'], text: 'Hi', media: [IMAGE] });
    await pickType(t('marketing.social.postTypeStory'));
    fireEvent.click(screen.getByTestId('social-post-now'));
    expect(await screen.findByText(t('marketing.social.ruleNoStories', { vars: { network: 'Facebook' } }))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('the options between the form and the API', () => {
  it('sends only real measurements, the type, captions with words for known networks, and a trimmed first comment', () => {
    const values = blankSocialPostValues({
      text: 'Hi',
      media: [{ ...IMAGE, width: 1080, height: 1350 }, { ...VIDEO, duration_s: 0, width: null }],
      post_type: 'REEL',
      captions: { X: '  Short  ', FACEBOOK: '   ', NOT_A_NETWORK: 'dropped' },
      first_comment: '  Book now  ',
    });
    expect(toSocialPostInput(values, null)).toMatchObject({
      media: [{ ...IMAGE, width: 1080, height: 1350 }, VIDEO],
      post_type: 'REEL',
      captions: [{ platform: 'X', text: 'Short' }],
      first_comment: 'Book now',
    });
  });

  it('keeps a video’s length and drops what the server sent as unknown', () => {
    expect(keepMeasured({ ...VIDEO, width: null, height: null, duration_s: 12.5 })).toEqual({ ...VIDEO, duration_s: 12.5 });
  });

  it('opens a saved post’s type, captions and first comment in the form', () => {
    const post = makeSocialScheduledPost({ post_type: 'STORY', captions: [{ platform: 'THREADS', text: 'T' }], first_comment: 'C' });
    expect(postOptionsOf(post)).toEqual({ post_type: 'STORY', captions: { THREADS: 'T' }, first_comment: 'C' });
  });
});
