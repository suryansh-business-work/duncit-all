import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';

const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notify: dialogsMock.notify,
}));

import IdeasTab from '../../src/pages/social-accounts-page/ideas/IdeasTab';
import IdeaCard from '../../src/pages/social-accounts-page/ideas/IdeaCard';
import { ideaText } from '../../src/pages/social-accounts-page/ideas/idea-text';
import {
  IdeaGenerateForm,
  blankIdeaGenerateValues,
  ideaGenerateSchema,
} from '../../src/pages/social-accounts-page/idea-generate-form';
import {
  DELETE_SOCIAL_IDEA,
  GENERATE_SOCIAL_IDEAS,
  SET_SOCIAL_IDEA_STATUS,
  SOCIAL_IDEAS,
  type SocialIdea,
  type SocialIdeaStatus,
} from '../../src/pages/social-accounts-page/publish.queries';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const makeIdea = (over: Partial<SocialIdea> = {}): SocialIdea => ({
  id: 'i1',
  title: 'Monsoon indoor pods',
  caption: 'Rain outside, rallies inside.',
  hashtags: ['badminton', 'monsoon'],
  platforms: ['INSTAGRAM', 'LINKEDIN'],
  format: 'IMAGE',
  why: 'Indoor pods fill faster in July.',
  brief: null,
  status: 'NEW',
  created_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

const gqlIdea = (idea: SocialIdea) => ({ __typename: 'SocialIdea', ...idea });

const ideasMock = (status: SocialIdeaStatus | null, ideas: SocialIdea[]): MockedResponse => ({
  request: { query: SOCIAL_IDEAS, variables: { status } },
  result: { data: { socialIdeas: ideas.map(gqlIdea) } },
  maxUsageCount: 10,
});

describe('ideaText', () => {
  it('returns the caption alone when the idea has no hashtags', () => {
    expect(ideaText(makeIdea({ hashtags: [] }))).toBe('Rain outside, rallies inside.');
  });

  it('appends the hashtags, prefixed with #, after a blank line', () => {
    expect(ideaText(makeIdea())).toBe('Rain outside, rallies inside.\n\n#badminton #monsoon');
  });
});

describe('ideaGenerateSchema', () => {
  const schema = ideaGenerateSchema(t);

  it('accepts the blank defaults (empty brief, no networks, five ideas)', () => {
    expect(blankIdeaGenerateValues()).toEqual({ brief: '', platforms: [], count: 5 });
    expect(schema.safeParse(blankIdeaGenerateValues()).success).toBe(true);
  });

  it('trims the brief and refuses one over 500 characters with the localized message', () => {
    expect(schema.parse({ brief: '  pods  ', platforms: ['X'], count: 3 }).brief).toBe('pods');
    expect(schema.safeParse({ brief: 'a'.repeat(500), platforms: [], count: 3 }).success).toBe(true);
    const tooLong = schema.safeParse({ brief: 'a'.repeat(501), platforms: [], count: 3 });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0].message).toBe('Keep the brief under 500 characters');
  });

  it('refuses an unknown network and a count outside 1..10', () => {
    expect(schema.safeParse({ brief: '', platforms: ['TIKTOK'], count: 3 }).success).toBe(false);
    expect(schema.safeParse({ brief: '', platforms: [], count: 0 }).success).toBe(false);
    expect(schema.safeParse({ brief: '', platforms: [], count: 11 }).success).toBe(false);
    expect(schema.safeParse({ brief: '', platforms: [], count: 2.5 }).success).toBe(false);
  });
});

describe('IdeaGenerateForm', () => {
  const generateButton = () => screen.getByTestId('social-idea-generate');

  it('submits the defaults when nothing is changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<IdeaGenerateForm onSubmit={onSubmit} />);
    fireEvent.click(generateButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ brief: '', platforms: [], count: 5 });
  });

  it('offers every network as a checkbox and toggles one on and back off', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<IdeaGenerateForm onSubmit={onSubmit} />);
    const group = screen.getByRole('group', { name: t('marketing.social.ideaNetworks') });
    expect(within(group).getAllByRole('checkbox')).toHaveLength(5);

    const instagram = screen.getByRole('checkbox', { name: 'Instagram' });
    const linkedin = screen.getByRole('checkbox', { name: 'LinkedIn' });
    fireEvent.click(instagram);
    fireEvent.click(linkedin);
    expect(instagram).toBeChecked();
    fireEvent.click(instagram);
    expect(instagram).not.toBeChecked();

    fireEvent.change(screen.getByRole('textbox', { name: /What should the ideas be about/ }), {
      target: { value: 'weekend dog walks' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /How many/ }));
    fireEvent.click(await screen.findByRole('option', { name: '10' }));

    fireEvent.click(generateButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ brief: 'weekend dog walks', platforms: ['LINKEDIN'], count: 10 });
  });

  it('blocks the submit and shows the error when the brief is too long', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<IdeaGenerateForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox', { name: /What should the ideas be about/ }), {
      target: { value: 'x'.repeat(501) },
    });
    fireEvent.click(generateButton());
    expect(await screen.findByText('Keep the brief under 500 characters')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('never lets the native form submit through (Enter in a field)', () => {
    renderWithProviders(<IdeaGenerateForm onSubmit={vi.fn()} />);
    const form = screen.getByTestId('social-idea-form');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('IdeaCard', () => {
  const handlers = () => ({
    onUse: vi.fn(),
    onStatus: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
  });

  it('shows the title, status, caption, tags, format and reason, and wires each action', () => {
    const idea = makeIdea();
    const h = handlers();
    renderWithProviders(<IdeaCard idea={idea} {...h} />);
    const card = screen.getByTestId('social-idea-i1');
    expect(within(card).getByRole('heading', { level: 3, name: 'Monsoon indoor pods' })).toBeInTheDocument();
    expect(within(card).getByText('New')).toBeInTheDocument();
    expect(within(card).getByText('Rain outside, rallies inside.')).toBeInTheDocument();
    expect(within(card).getByText('#badminton #monsoon')).toBeInTheDocument();
    expect(within(card).getByText('Image')).toBeInTheDocument();
    expect(within(card).getByText('Indoor pods fill faster in July.')).toBeInTheDocument();
    expect(card.querySelectorAll('svg[data-testid="InstagramIcon"], svg[data-testid="LinkedInIcon"]')).toHaveLength(2);

    fireEvent.click(within(card).getByRole('button', { name: 'Use this idea' }));
    expect(h.onUse).toHaveBeenCalledWith(idea);
    fireEvent.click(within(card).getByRole('button', { name: 'Dismiss' }));
    expect(h.onStatus).toHaveBeenCalledWith(idea, 'DISMISSED');
    fireEvent.click(within(card).getByRole('button', { name: 'Delete' }));
    expect(h.onDelete).toHaveBeenCalledWith(idea);
  });

  it('offers Restore on a dismissed idea and leaves out empty tags and reason', () => {
    const idea = makeIdea({ status: 'DISMISSED', hashtags: [], why: null, format: 'VIDEO' });
    const h = handlers();
    renderWithProviders(<IdeaCard idea={idea} {...h} />);
    const card = screen.getByTestId('social-idea-i1');
    expect(within(card).getByText('Dismissed')).toBeInTheDocument();
    expect(within(card).getByText('Video')).toBeInTheDocument();
    expect(within(card).queryByText(/#/)).not.toBeInTheDocument();
    expect(within(card).queryByText('Indoor pods fill faster in July.')).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Restore' }));
    expect(h.onStatus).toHaveBeenCalledWith(idea, 'NEW');
  });
});

describe('IdeasTab', () => {
  beforeEach(() => {
    dialogsMock.confirm.mockReset();
    dialogsMock.notify.mockReset();
  });

  const pressed = (name: string) => screen.getByRole('button', { name, pressed: true });

  it('lists the new ideas and hands a picked one to onUse', async () => {
    const onUse = vi.fn();
    const idea = makeIdea();
    renderWithProviders(<IdeasTab onUse={onUse} />, { mocks: [ideasMock('NEW', [idea])] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByTestId('social-idea-i1')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(pressed('New')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use this idea' }));
    expect(onUse).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1', title: 'Monsoon indoor pods' }));
  });

  it('shows the empty notice when the filter has no ideas, and switches filters', async () => {
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [ideasMock('NEW', []), ideasMock(null, [makeIdea({ id: 'i9', title: 'Used one', status: 'USED' })])],
    });
    expect(await screen.findByText('No ideas here yet. Generate some above.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(await screen.findByTestId('social-idea-i9')).toBeInTheDocument();
    expect(pressed('All')).toBeInTheDocument();
    // Clicking the already-selected toggle sends null — the filter stays put.
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(pressed('All')).toBeInTheDocument();
  });

  it('shows the server error when the ideas cannot load', async () => {
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [{ request: { query: SOCIAL_IDEAS, variables: { status: 'NEW' } }, result: { errors: [{ message: 'Ideas are down' }] } }],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Ideas are down');
  });

  it('generates ideas, toasts the count and jumps back to the New filter', async () => {
    const made = [makeIdea({ id: 'g1' }), makeIdea({ id: 'g2' })];
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [
        ideasMock('NEW', []),
        ideasMock(null, []),
        {
          request: { query: GENERATE_SOCIAL_IDEAS, variables: { input: { brief: '', platforms: [], count: 5 } } },
          result: { data: { generateSocialIdeas: made.map(gqlIdea) } },
        },
      ],
    });
    await screen.findByText('No ideas here yet. Generate some above.');
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(pressed('All')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('social-idea-generate'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('2 new ideas are ready', 'success'));
    await waitFor(() => expect(pressed('New')).toBeInTheDocument());
  });

  it('counts zero ideas when the mutation comes back without data', async () => {
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [
        ideasMock('NEW', []),
        {
          request: { query: GENERATE_SOCIAL_IDEAS, variables: { input: { brief: '', platforms: [], count: 5 } } },
          result: { data: null },
        },
      ],
    });
    await screen.findByText('No ideas here yet. Generate some above.');
    fireEvent.click(screen.getByTestId('social-idea-generate'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('0 new ideas are ready', 'success'));
  });

  it('reports a failed generation and stays on the current filter', async () => {
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [
        ideasMock('NEW', []),
        {
          request: { query: GENERATE_SOCIAL_IDEAS, variables: { input: { brief: '', platforms: [], count: 5 } } },
          result: { errors: [{ message: 'AI quota reached' }] },
        },
      ],
    });
    await screen.findByText('No ideas here yet. Generate some above.');
    fireEvent.click(screen.getByTestId('social-idea-generate'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('AI quota reached', 'error'));
    expect(dialogsMock.notify).toHaveBeenCalledTimes(1);
  });

  it('dismisses an idea through the status mutation', async () => {
    const idea = makeIdea();
    const statusMutation = vi.fn(() => ({ data: { setSocialIdeaStatus: gqlIdea({ ...idea, status: 'DISMISSED' }) } }));
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [
        ideasMock('NEW', [idea]),
        { request: { query: SET_SOCIAL_IDEA_STATUS, variables: { id: 'i1', status: 'DISMISSED' } }, result: statusMutation },
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(statusMutation).toHaveBeenCalledTimes(1));
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('reports a status change the server refuses', async () => {
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [
        ideasMock('NEW', [makeIdea()]),
        {
          request: { query: SET_SOCIAL_IDEA_STATUS, variables: { id: 'i1', status: 'DISMISSED' } },
          result: { errors: [{ message: 'Idea not found' }] },
        },
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Idea not found', 'error'));
  });

  it('asks before deleting and does nothing when the confirm is declined', async () => {
    dialogsMock.confirm.mockResolvedValue(false);
    const deleteMutation = vi.fn(() => ({ data: { deleteSocialIdea: true } }));
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [
        ideasMock('NEW', [makeIdea()]),
        { request: { query: DELETE_SOCIAL_IDEA, variables: { id: 'i1' } }, result: deleteMutation },
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith({
        title: 'Delete this idea?',
        message: 'Monsoon indoor pods',
        destructive: true,
      }),
    );
    await Promise.resolve();
    expect(deleteMutation).not.toHaveBeenCalled();
  });

  it('deletes a confirmed idea', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const deleteMutation = vi.fn(() => ({ data: { deleteSocialIdea: true } }));
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [
        ideasMock('NEW', [makeIdea()]),
        { request: { query: DELETE_SOCIAL_IDEA, variables: { id: 'i1' } }, result: deleteMutation },
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteMutation).toHaveBeenCalledTimes(1));
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('reports a delete the server refuses', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    renderWithProviders(<IdeasTab onUse={vi.fn()} />, {
      mocks: [
        ideasMock('NEW', [makeIdea()]),
        { request: { query: DELETE_SOCIAL_IDEA, variables: { id: 'i1' } }, result: { errors: [{ message: 'Not allowed' }] } },
      ],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Not allowed', 'error'));
  });
});
