/**
 * Onboarding Portal > Earn with Duncit: the featured image on each Earn card.
 *
 * The product-seller (E-Commerce Brand) card follows the `is_product_visible`
 * flag like the rest of e-commerce. While the flag is off its field is hidden,
 * but the stored image still rides along on a save so it is never cleared.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router';
import { PUBLIC_FEATURE_FLAGS } from '@duncit/app-settings';
import EarnConfigPage from './EarnConfigPage';
import {
  EARN_CARD_IMAGES,
  UPDATE_EARN_CARD_IMAGES,
  type EarnCardImagesValues,
} from './earn-card-images';

const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
  notifyError: dialogsMock.notifyError,
}));

const saved: EarnCardImagesValues = {
  host: 'https://cdn.duncit.com/earn/host.jpg',
  venue: '',
  ecomm: 'https://cdn.duncit.com/earn/brand.jpg',
  club: '',
  freelancer: 'https://cdn.duncit.com/earn/freelancer.jpg',
};

const asIntro = (values: EarnCardImagesValues) => ({
  __typename: 'OnboardingIntro',
  earn_card_images: { __typename: 'EarnCardImages', ...values },
});

const imagesMock = (opts: { failWith?: string } = {}): MockedResponse => ({
  request: { query: EARN_CARD_IMAGES },
  ...(opts.failWith
    ? { result: { errors: [new GraphQLError(opts.failWith)] } }
    : { result: { data: { onboardingIntro: asIntro(saved) } } }),
});

const flagMock = (productVisible: boolean): MockedResponse => ({
  request: { query: PUBLIC_FEATURE_FLAGS },
  result: {
    data: {
      publicFeatureFlags: [{ __typename: 'PublicFeatureFlag', key: 'is_product_visible', enabled: productVisible }],
    },
  },
});

const updateMock = (
  values: EarnCardImagesValues,
  opts: { failWith?: string; delay?: number } = {},
): MockedResponse => ({
  request: { query: UPDATE_EARN_CARD_IMAGES, variables: { input: { earn_card_images: values } } },
  ...(opts.failWith
    ? { result: { errors: [new GraphQLError(opts.failWith)] } }
    : { result: { data: { updateOnboardingIntro: asIntro(values) } } }),
  ...(opts.delay ? { delay: opts.delay } : {}),
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {/* The shared media picker reads the theme's breakpoints and the URL's tab. */}
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <EarnConfigPage />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );

const hostField = () => screen.findByRole('textbox', { name: 'Host card' });

afterEach(() => {
  vi.clearAllMocks();
});

describe('EarnConfigPage', () => {
  it('opens every card on its stored image and only offers Save once something changes', async () => {
    renderPage([imagesMock(), flagMock(true)]);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await hostField()).toHaveValue('https://cdn.duncit.com/earn/host.jpg');
    expect(screen.getByRole('textbox', { name: 'Venue card' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Club Admin card' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Freelancer card' })).toHaveValue(
      'https://cdn.duncit.com/earn/freelancer.jpg',
    );
    expect(await screen.findByRole('textbox', { name: 'E-Commerce Brand card' })).toHaveValue(
      'https://cdn.duncit.com/earn/brand.jpg',
    );
    expect(screen.getByRole('heading', { name: 'Earn with Duncit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('hides the E-Commerce Brand card while products are off, yet keeps its image on a save', async () => {
    const edited = { ...saved, venue: 'https://cdn.duncit.com/earn/venue.jpg' };
    renderPage([imagesMock(), flagMock(false), updateMock(edited)]);

    fireEvent.change(await screen.findByRole('textbox', { name: 'Venue card' }), {
      target: { value: 'https://cdn.duncit.com/earn/venue.jpg' },
    });
    expect(screen.queryByTestId('earn-card-image-ecomm')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'E-Commerce Brand card' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // The mutation only answers when the hidden card's stored image is in the input.
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Earn card images saved.'));
  });

  it('saves the edited image with all five cards and says so', async () => {
    const edited = { ...saved, host: 'https://cdn.duncit.com/earn/host-new.jpg' };
    renderPage([imagesMock(), flagMock(true), updateMock(edited, { delay: 300 })]);

    fireEvent.change(await hostField(), { target: { value: 'https://cdn.duncit.com/earn/host-new.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled());
    await waitFor(
      () => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Earn card images saved.'),
      { timeout: 4000 },
    );
    expect(dialogsMock.notifyError).not.toHaveBeenCalled();
  });

  it('shows a failed save on the page and in a toast, keeping the edit', async () => {
    const edited = { ...saved, club: 'https://cdn.duncit.com/earn/club.jpg' };
    renderPage([imagesMock(), flagMock(true), updateMock(edited, { failWith: 'Image host is down' })]);

    fireEvent.change(await screen.findByRole('textbox', { name: 'Club Admin card' }), {
      target: { value: 'https://cdn.duncit.com/earn/club.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Image host is down')).toBeInTheDocument();
    expect(dialogsMock.notifyError).toHaveBeenCalledWith('Image host is down');
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Club Admin card' })).toHaveValue('https://cdn.duncit.com/earn/club.jpg');
  });

  it('refuses a link that is not a full http(s) address and sends nothing', async () => {
    renderPage([imagesMock(), flagMock(true)]);

    fireEvent.change(await hostField(), { target: { value: 'ftp://files.example/host.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a full link starting with https://')).toBeInTheDocument();
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });

  it('shows why the images could not be loaded', async () => {
    renderPage([imagesMock({ failWith: 'Not allowed' }), flagMock(true)]);

    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Not allowed');
  });
});
