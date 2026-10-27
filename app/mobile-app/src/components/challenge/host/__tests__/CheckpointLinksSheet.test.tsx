import { Share } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CheckpointLinksSheet } from '@/components/challenge/host/CheckpointLinksSheet';
import { PodChallengeCheckpointLinksDocument } from '@/graphql/challenge-tools';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

const LINKS = [
  {
    item_key: 'k1',
    label: 'Gate',
    url: 'https://duncit.com/c?checkpoint=t1.k1',
    qr_data_url: 'data:image/png;base64,AAA',
  },
  {
    item_key: 'k2',
    label: 'Bridge',
    url: 'https://duncit.com/c?checkpoint=t1.k2',
    qr_data_url: 'data:image/png;base64,BBB',
  },
];

const ui = (toolInstanceId: string | null, onClose = jest.fn()) => (
  <CheckpointLinksSheet challengeId="ch1" toolInstanceId={toolInstanceId} onClose={onClose} />
);

let share: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  request.mockResolvedValue({ podChallengeCheckpointLinks: LINKS });
  share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
});
afterEach(() => share.mockRestore());

describe('CheckpointLinksSheet', () => {
  it('fetches nothing and shows nothing while closed', () => {
    renderWithProviders(ui(null));
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByText('mweb.challenge.tools.checkpointQr')).toBeNull();
  });

  it('fetches the codes only for the tool that was opened and lists each with its QR image', async () => {
    renderWithProviders(ui('t1'));
    expect(screen.getByText('mweb.challenge.tools.checkpointQr')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.checkpointQrHint')).toBeOnTheScreen();
    expect(await screen.findByText('Gate')).toBeOnTheScreen();
    expect(screen.getByText('Bridge')).toBeOnTheScreen();
    expect(request).toHaveBeenCalledWith(
      PodChallengeCheckpointLinksDocument,
      { id: 'ch1', toolInstanceId: 't1' },
      { auth: true },
    );
    expect(screen.getByLabelText('mweb.challenge.tools.qrAlt|Gate')).toBeOnTheScreen();
  });

  it('shares a checkpoint link with its label', async () => {
    renderWithProviders(ui('t1'));
    await screen.findByText('Gate');
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-checkpoint-share-k2'));
    });
    expect(share).toHaveBeenCalledWith({
      message: 'Bridge\nhttps://duncit.com/c?checkpoint=t1.k2',
      url: 'https://duncit.com/c?checkpoint=t1.k2',
      title: 'Bridge',
    });
  });

  it('shows why a share failed', async () => {
    share.mockRejectedValueOnce(new Error('No share target'));
    renderWithProviders(ui('t1'));
    await screen.findByText('Gate');
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-checkpoint-share-k1'));
    });
    expect(await screen.findByText('No share target')).toBeOnTheScreen();
  });

  it('stays quiet when the person just closes the share sheet', async () => {
    share.mockRejectedValueOnce(new Error(''));
    renderWithProviders(ui('t1'));
    await screen.findByText('Gate');
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-checkpoint-share-k1'));
    });
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(screen.queryByTestId('notice-card')).toBeNull();
    expect(screen.getByText('Gate')).toBeOnTheScreen();
  });

  it('shows the error, not a spinner, when the codes cannot be fetched', async () => {
    request.mockRejectedValueOnce(new Error('Not a host'));
    renderWithProviders(ui('t1'));
    expect(await screen.findByText('Not a host')).toBeOnTheScreen();
    expect(screen.queryByText('Gate')).toBeNull();
  });

  it('starts fresh for another tool, dropping the earlier tool codes', async () => {
    const view = renderWithProviders(ui('t1'));
    await screen.findByText('Gate');
    request.mockResolvedValueOnce({
      podChallengeCheckpointLinks: [{ ...LINKS[0], item_key: 'k9', label: 'Summit' }],
    });
    view.rerender(ui('t2'));
    expect(await screen.findByText('Summit')).toBeOnTheScreen();
    expect(screen.queryByText('Gate')).toBeNull();
    expect(request).toHaveBeenLastCalledWith(
      PodChallengeCheckpointLinksDocument,
      { id: 'ch1', toolInstanceId: 't2' },
      { auth: true },
    );
  });

  it('ignores an answer that arrives after it was closed', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const view = renderWithProviders(ui('t1'));
    view.rerender(ui(null));
    await act(async () => resolve({ podChallengeCheckpointLinks: LINKS }));
    expect(screen.queryByText('Gate')).toBeNull();
  });

  it('ignores a failure that arrives after it was closed', async () => {
    let reject: (reason: Error) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((_, r) => (reject = r)));
    const view = renderWithProviders(ui('t1'));
    view.rerender(ui(null));
    await act(async () => reject(new Error('late failure')));
    expect(screen.queryByText('late failure')).toBeNull();
  });
});
