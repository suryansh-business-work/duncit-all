import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import LaunchMediaDialog from '../LaunchMediaDialog';
import { LAUNCH_PAGE_MEDIA, UPDATE_LAUNCH_PAGE_MEDIA } from '../queries';

/** The real picker opens the media library; the stub is a plain URL input under the same label. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: ({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const STORED = {
  hero_video_url: 'https://cdn.duncit.com/launch/hero.mp4',
  hero_image_url: 'https://cdn.duncit.com/launch/hero.jpg',
  host_video_url: '',
  host_image_url: '',
  venue_video_url: '',
  venue_image_url: '',
  club_admin_video_url: '',
  club_admin_image_url: '',
};

const NEW_HERO = 'https://cdn.duncit.com/launch/hero-v2.mp4';
const NEW_CLUB_IMAGE = 'https://cdn.duncit.com/launch/club-admin.jpg';
const SAVED = { ...STORED, hero_video_url: NEW_HERO, club_admin_image_url: NEW_CLUB_IMAGE };

const mediaPayload = (media: typeof STORED) => ({
  __typename: 'Branding',
  launch_media: { __typename: 'LaunchPageMedia', ...media },
});

const mediaQuery: MockedResponse = {
  request: { query: LAUNCH_PAGE_MEDIA },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { branding: mediaPayload(STORED) } },
};

const saveRequest = {
  query: UPDATE_LAUNCH_PAGE_MEDIA,
  variables: { input: { launch_media: SAVED } },
};

const renderDialog = (saveMock: MockedResponse) => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  renderWithProviders(<LaunchMediaDialog open onClose={onClose} onSaved={onSaved} />, {
    mocks: [mediaQuery, saveMock],
  });
  return { onClose, onSaved };
};

/** Waits for the stored set, then swaps the hero video and the club admin image for new uploads. */
const editAndSave = async () => {
  const hero = within(await screen.findByTestId('launch-media-hero'));
  await waitFor(() => expect(hero.getByLabelText('Video')).toHaveValue(STORED.hero_video_url));
  expect(hero.getByLabelText('Backup image')).toHaveValue(STORED.hero_image_url);
  fireEvent.change(hero.getByLabelText('Video'), { target: { value: NEW_HERO } });
  const clubAdmin = within(screen.getByTestId('launch-media-club_admin'));
  fireEvent.change(clubAdmin.getByLabelText('Backup image'), { target: { value: NEW_CLUB_IMAGE } });
  fireEvent.click(screen.getByTestId('launch-media-save'));
};

describe('LaunchMediaDialog — saving', () => {
  it('saves the whole edited set, then tells the page and closes', async () => {
    const onMutate = vi.fn();
    const { onClose, onSaved } = renderDialog({
      request: saveRequest,
      result: () => {
        onMutate();
        return { data: { updateBranding: mediaPayload(SAVED) } };
      },
    });

    await editAndSave();

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onMutate).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the server’s reason and stays open when the save is refused', async () => {
    const { onClose, onSaved } = renderDialog({
      request: saveRequest,
      result: { errors: [{ message: 'Only a super admin can change branding' }] },
    });

    await editAndSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('Only a super admin can change branding');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to its own message when the refusal carries no reason', async () => {
    const { onSaved } = renderDialog({
      request: saveRequest,
      result: { errors: [{ message: '' }] },
    });

    await editAndSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the launch page media.');
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('LaunchMediaDialog — loading the set', () => {
  it('shows why the stored set could not be read and keeps Save disabled', async () => {
    renderWithProviders(<LaunchMediaDialog open onClose={vi.fn()} onSaved={vi.fn()} />, {
      mocks: [{ request: { query: LAUNCH_PAGE_MEDIA }, result: { errors: [{ message: 'Branding is unavailable' }] } }],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Branding is unavailable');
    expect(screen.queryByTestId('launch-media-hero')).not.toBeInTheDocument();
    expect(screen.getByTestId('launch-media-save')).toBeDisabled();
  });
});
