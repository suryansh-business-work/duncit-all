import '@testing-library/jest-dom/vitest';
import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import ProfileAvatar from '../ProfileAvatar';
import { MY_STORIES, UPDATE_PROFILE_PHOTO } from '../queries';

// react-easy-crop needs real layout measurement; render a stub that reports the
// crop area once (in an effect) so the crop dialog flow stays testable in jsdom.
vi.mock('react-easy-crop', () => ({
  default: ({ onCropComplete }: { onCropComplete?: (a: unknown, b: unknown) => void }) => {
    useEffect(() => {
      onCropComplete?.({}, { x: 0, y: 0, width: 100, height: 100 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="cropper" />;
  },
}));

// The story viewer is exercised in the home-page tests; stub it here so opening
// it (and firing its delete) is asserted without the full media machinery.
vi.mock('../../../pages/home-page/HomeStatusViewer', () => ({
  default: ({ onDelete, onClose }: { onDelete?: (id: string) => void; onClose: () => void }) => (
    <div data-testid="story-viewer">
      <button data-testid="story-delete" onClick={() => onDelete?.('story-1')}>
        del
      </button>
      <button data-testid="story-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

const emptyStories = { request: { query: MY_STORIES }, result: { data: { myStories: [] } } };
const removeMock = {
  request: { query: UPDATE_PROFILE_PHOTO, variables: { input: { profile_photo: null } } },
  result: { data: { updateMyProfile: { __typename: 'User', user_id: 'u1', profile_photo: null } } },
};
const storedStory = {
  request: { query: MY_STORIES },
  result: {
    data: {
      myStories: [
        {
          __typename: 'Post',
          id: 'story-1',
          image_url: 'http://x/s.jpg',
          media_type: 'IMAGE',
          caption: '',
          created_at: '2026-06-09T10:00:00.000Z',
          expires_at: '2026-06-10T10:00:00.000Z',
        },
      ],
    },
  },
};
const noStories: MockedResponse[] = [emptyStories];
const oneStory: MockedResponse[] = [storedStory];

function setup(photo: string | null, mocks = noStories, onChanged = vi.fn()) {
  render(
    <MockedProvider mocks={mocks}>
      <ProfileAvatar photo={photo} name="Riya Sharma" onChanged={onChanged} />
    </MockedProvider>,
  );
  return { onChanged };
}

describe('ProfileAvatar — photo menu (item 9)', () => {
  it('shows Change only (no View/Remove) when there is no photo', () => {
    setup(null);
    fireEvent.click(screen.getByTestId('avatar-edit'));
    expect(screen.getByTestId('photo-action-change')).toBeInTheDocument();
    expect(screen.queryByTestId('photo-action-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('photo-action-remove')).not.toBeInTheDocument();
  });

  it('shows View/Change/Remove and opens the viewer for a photo', () => {
    setup('http://x/a.jpg');
    fireEvent.click(screen.getByTestId('avatar-edit'));
    fireEvent.click(screen.getByTestId('photo-action-view'));
    expect(screen.getByAltText('Profile photo')).toBeInTheDocument();
  });

  it('confirms a remove and refreshes the page', async () => {
    const { onChanged } = setup('http://x/a.jpg', [emptyStories, removeMock]);
    fireEvent.click(screen.getByTestId('avatar-edit'));
    fireEvent.click(screen.getByTestId('photo-action-remove'));
    expect(await screen.findByText('Remove photo?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText('Remove photo?')).not.toBeInTheDocument());
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('opens the crop dialog after a file is chosen', async () => {
    setup('http://x/a.jpg');
    fireEvent.click(screen.getByTestId('avatar-edit'));
    fireEvent.click(screen.getByTestId('photo-action-change'));
    const input = screen.getByTestId('avatar-file-input') as HTMLInputElement;
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('Adjust photo')).toBeInTheDocument();
  });
});

describe('ProfileAvatar — story interaction (item 12)', () => {
  it('clicking the avatar with no story opens the add-story file picker', async () => {
    setup(null, noStories);
    const storyInput = screen.getByTestId('avatar-story-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(storyInput, 'click');
    fireEvent.click(screen.getByTestId('avatar-button'));
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
  });

  it('clicking the avatar with an active story opens the viewer, then deletes', async () => {
    setup('http://x/a.jpg', oneStory);
    // Wait for the story query so hasStory flips on.
    await waitFor(() => expect(screen.getByTestId('avatar-button')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByLabelText('View your story')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('avatar-button'));
    expect(screen.getByTestId('story-viewer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('story-delete'));
    expect(await screen.findByText('Delete story?')).toBeInTheDocument();
  });

  it('the + add badge opens the story file picker', () => {
    setup('http://x/a.jpg', oneStory);
    const storyInput = screen.getByTestId('avatar-story-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(storyInput, 'click');
    fireEvent.click(screen.getByTestId('avatar-add-story'));
    expect(clickSpy).toHaveBeenCalled();
  });
});
