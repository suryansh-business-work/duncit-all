import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { UPDATE } from '../queries';
import QuickEditPodDialog from '../QuickEditPodDialog';

const basePod = {
  id: 'doc1',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles, all levels.',
  pod_images_and_videos: [{ url: 'https://cdn.test/court.jpg', type: 'IMAGE' }],
  club_id: 'club1',
  venue_id: 'venue1',
  pod_mode: 'PHYSICAL',
};

const updateMock = (input: Record<string, unknown>, over: Partial<MockedResponse> = {}): MockedResponse => ({
  request: { query: UPDATE, variables: { id: 'doc1', input } },
  result: { data: { updatePod: { __typename: 'Pod', id: 'doc1' } } },
  ...over,
});

const renderDialog = (pod: unknown, mocks: MockedResponse[] = [], overrides: Record<string, unknown> = {}) => {
  const props = {
    clubName: (id: string) => `Club<${id}>`,
    venueName: (id: string) => `Venue<${id}>`,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    onPickImage: vi.fn(async () => null as string | null),
    ...overrides,
  };
  renderWithProviders(<QuickEditPodDialog pod={pod} {...props} />, { mocks });
  return props;
};

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('QuickEditPodDialog / rendering', () => {
  it('renders nothing when no pod is being edited', () => {
    renderDialog(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("prefills the pod's copy and shows its club and venue as read-only context", () => {
    renderDialog(basePod);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Quick edit pod')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('Sunday Badminton');
    expect(screen.getByRole('textbox', { name: /Description/ })).toHaveValue('Doubles, all levels.');
    expect(within(dialog).getByText('Club<club1>')).toBeInTheDocument();
    expect(within(dialog).getByText('Venue<venue1>')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Pod media' })).toHaveAttribute('src', 'https://cdn.test/court.jpg');
  });

  it('names a virtual pod as such instead of looking up a venue', () => {
    renderDialog({ ...basePod, pod_mode: 'VIRTUAL', venue_id: null });
    expect(within(screen.getByRole('dialog')).getByText('Virtual pod')).toBeInTheDocument();
  });

  it('starts empty for a pod with no title, description or media', () => {
    renderDialog({ id: 'doc1', club_id: 'club1', venue_id: 'venue1', pod_mode: 'PHYSICAL' });
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /Description/ })).toHaveValue('');
    expect(screen.getByText('No images yet.')).toBeInTheDocument();
  });

  it('closes on Cancel', () => {
    const props = renderDialog(basePod);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('QuickEditPodDialog / saving', () => {
  it('saves the edited copy and media, then reports it saved', async () => {
    const mocks = [
      updateMock({
        pod_title: 'Sunday Badminton Doubles',
        pod_description: 'Doubles, all levels.',
        pod_images_and_videos: [{ url: 'https://cdn.test/court.jpg', type: 'IMAGE' }],
      }),
    ];
    const props = renderDialog(basePod, mocks);
    fireEvent.change(screen.getByRole('textbox', { name: /Name/ }), {
      target: { value: 'Sunday Badminton Doubles' },
    });
    save();
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('saves a stored media item with no type as an image', async () => {
    const mocks = [
      updateMock({
        pod_title: 'Sunday Badminton',
        pod_description: 'Doubles, all levels.',
        pod_images_and_videos: [
          { url: 'https://cdn.test/legacy.jpg', type: 'IMAGE' },
          { url: 'https://cdn.test/new.jpg', type: 'IMAGE' },
        ],
      }),
    ];
    const props = renderDialog(
      { ...basePod, pod_images_and_videos: [{ url: 'https://cdn.test/legacy.jpg', type: null }] },
      mocks,
      { onPickImage: vi.fn(async () => 'https://cdn.test/new.jpg') },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add image' }));
    await waitFor(() => expect(screen.getAllByRole('img', { name: 'Pod media' })).toHaveLength(2));
    save();
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
  });

  it('shows the button busy while the save is in flight', async () => {
    const mocks = [
      updateMock(
        {
          pod_title: 'Sunday Badminton',
          pod_description: 'Doubles, all levels.',
          pod_images_and_videos: [{ url: 'https://cdn.test/court.jpg', type: 'IMAGE' }],
        },
        { delay: 30 },
      ),
    ];
    const props = renderDialog(basePod, mocks);
    save();
    expect(await screen.findByRole('button', { name: /Saving/ })).toBeInTheDocument();
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('shows the server message and stays open when the save fails', async () => {
    const mocks = [
      updateMock(
        {
          pod_title: 'Sunday Badminton',
          pod_description: 'Doubles, all levels.',
          pod_images_and_videos: [{ url: 'https://cdn.test/court.jpg', type: 'IMAGE' }],
        },
        { result: undefined, error: new Error('Pod not found') },
      ),
    ];
    const props = renderDialog(basePod, mocks);
    save();
    expect(await screen.findByText('Pod not found')).toBeInTheDocument();
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('lists every content rule a refused save broke under its headline', async () => {
    const refusal = Object.assign(new Error('Your pod content violates the community guidelines'), {
      extensions: {
        code: 'POD_CONTENT_REJECTED',
        violations: [
          { field: 'pod_description', type: 'CONTACT', message: 'No contact details', evidence: 'a@b.com' },
        ],
      },
    });
    const mocks = [
      updateMock(
        {
          pod_title: 'Sunday Badminton',
          pod_description: 'Doubles, all levels.',
          pod_images_and_videos: [{ url: 'https://cdn.test/court.jpg', type: 'IMAGE' }],
        },
        { result: undefined, error: refusal },
      ),
    ];
    const props = renderDialog(basePod, mocks);
    save();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your pod content violates the community guidelines');
    expect(alert).toHaveTextContent('• No contact details ("a@b.com")');
    expect(props.onSaved).not.toHaveBeenCalled();
  });
});
