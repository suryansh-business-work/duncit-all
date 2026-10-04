import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import OnboardingSettingsPage from './OnboardingSettingsPage';
import {
  ONBOARDING_INTRO_SETTINGS,
  UPDATE_ONBOARDING_INTRO_SETTINGS,
  type OnboardingIntroSettingsValues,
} from './onboarding-intro-settings';

// The rich-text editor is a contenteditable toolbar jsdom cannot drive; a
// textarea with the same value/onChange contract stands in for it.
vi.mock('@duncit/rich-text', () => ({
  DuncitRichTextInput: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (html: string, text: string) => void;
    ariaLabel?: string;
  }) => (
    <textarea aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value, e.target.value)} />
  ),
}));

const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
  notifyError: dialogsMock.notifyError,
}));

const saved: OnboardingIntroSettingsValues = {
  host_intro_html: '<p>Host with Duncit</p>',
  venue_intro_html: '',
  ecomm_intro_html: '',
  club_admin_intro_html: '<p>Run a club</p>',
  social_handles: {
    x_url: 'https://x.com/duncit',
    instagram_url: 'https://instagram.com/duncit',
    youtube_url: '',
    facebook_url: '',
    website_url: 'https://duncit.com',
  },
};
const edited: OnboardingIntroSettingsValues = { ...saved, venue_intro_html: '<p>List your venue</p>' };

// Server shape: the nested handles object carries its own typename, which the
// form must not send back in the mutation input.
const asIntro = (values: OnboardingIntroSettingsValues) => ({
  __typename: 'OnboardingIntro',
  ...values,
  social_handles: { __typename: 'OnboardingSocialHandles', ...values.social_handles },
});

const introMock = (opts: { failWith?: string } = {}): MockedResponse => ({
  request: { query: ONBOARDING_INTRO_SETTINGS },
  ...(opts.failWith
    ? { result: { errors: [new GraphQLError(opts.failWith)] } }
    : { result: { data: { onboardingIntro: asIntro(saved) } } }),
});

const updateMock = (opts: { failWith?: string; delay?: number } = {}): MockedResponse => ({
  request: { query: UPDATE_ONBOARDING_INTRO_SETTINGS, variables: { input: edited } },
  ...(opts.failWith
    ? { result: { errors: [new GraphQLError(opts.failWith)] } }
    : { result: { data: { updateOnboardingIntro: asIntro(edited) } } }),
  ...(opts.delay ? { delay: opts.delay } : {}),
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <OnboardingSettingsPage />
    </MockedProvider>,
  );

const editVenueIntro = async () => {
  const venue = await screen.findByLabelText('Venue intro');
  fireEvent.change(venue, { target: { value: edited.venue_intro_html } });
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('OnboardingSettingsPage', () => {
  it('loads each flow’s intro and only offers Save once something changes', async () => {
    renderPage([introMock()]);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByLabelText('Host intro')).toHaveValue('<p>Host with Duncit</p>');
    expect(screen.getByLabelText('Club Admin intro')).toHaveValue('<p>Run a club</p>');
    expect(screen.getByRole('textbox', { name: 'X' })).toHaveValue('https://x.com/duncit');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await editVenueIntro();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('saves the intros and says so', async () => {
    renderPage([introMock(), updateMock({ delay: 50 })]);
    await editVenueIntro();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Onboarding intro saved.'),
    );
  });

  it('shows a failed save on the page and in a toast', async () => {
    renderPage([introMock(), updateMock({ failWith: 'Intro too long' })]);
    await editVenueIntro();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Intro too long')).toBeInTheDocument();
    expect(dialogsMock.notifyError).toHaveBeenCalledWith('Intro too long');
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });

  it('shows why the intros could not be loaded', async () => {
    renderPage([introMock({ failWith: 'Not allowed' })]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Not allowed');
  });
});
