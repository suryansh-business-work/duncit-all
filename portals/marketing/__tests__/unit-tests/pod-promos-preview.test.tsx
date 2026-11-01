import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  createPodPromoMock,
  makePodPromoCandidate,
  makePodPromoPreview,
  makePodPromoSummary,
  podPromoCandidatesMock,
  podPromoSummaryMock,
  previewPodPromoMock,
} from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date) => `fmt:${d.toISOString()}` }),
}));

import PreviewDialog from '../../src/pages/pod-promos-page/preview/PreviewDialog';

afterEach(() => {
  vi.clearAllMocks();
});

const candidates = [
  makePodPromoCandidate(),
  makePodPromoCandidate({ id: 'pod2', title: 'Book Club Brunch', club_name: 'Readers', promo_status: 'PUBLISHED' }),
];

const renderDialog = (mocks: MockedResponse[], canManage = true) => {
  const onClose = vi.fn();
  const onPromoted = vi.fn();
  renderWithProviders(<PreviewDialog open canManage={canManage} onClose={onClose} onPromoted={onPromoted} />, { mocks });
  return { onClose, onPromoted };
};

describe('PreviewDialog', () => {
  it('lists upcoming pods with their start, club and any promotion they have', async () => {
    renderDialog([podPromoCandidatesMock(candidates)]);
    expect(screen.getByText('Pick a pod to see its banner and caption.')).toBeInTheDocument();
    const first = await screen.findByTestId('pod-candidate-pod1');
    expect(first).toHaveTextContent('Sunset Run');
    expect(first).toHaveTextContent('fmt:2026-11-05T12:30:00.000Z · Pune Runners');
    expect(within(screen.getByTestId('pod-candidate-pod2')).getByText('Published')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-promo-promote')).not.toBeInTheDocument();
  });

  it('renders the preview for the picked pod and promotes it now', async () => {
    const { onClose, onPromoted } = renderDialog([
      podPromoCandidatesMock(candidates),
      previewPodPromoMock('pod1'),
      createPodPromoMock('pod1'),
      podPromoSummaryMock(makePodPromoSummary()),
      podPromoCandidatesMock(candidates),
    ]);
    fireEvent.click(await screen.findByTestId('pod-candidate-pod1'));
    expect(await screen.findByText('With the current settings this posts fmt:2026-11-02T12:30:00.000Z.')).toBeInTheDocument();
    // The carousel, not one banner: each slide named for what it shows.
    expect(screen.getByRole('img', { name: 'Cover — banner slide for Sunset Run' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Book now — banner slide for Sunset Run' })).toBeInTheDocument();
    expect(screen.getByText(/Calm wellness · Portrait/)).toBeInTheDocument();
    expect(screen.getByTestId('preview-collaborators')).toHaveTextContent('With @blue.cafe');
    expect(screen.getByTestId('preview-caption')).toHaveTextContent('Run into the sunset with us.');
    expect(screen.getByText(/Caption from the built-in template/)).toBeInTheDocument();
    expect(screen.getByText('#DuncitPune')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Promote now' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sunset Run is being promoted', 'success'));
    expect(onPromoted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('says why the planner would not promote a pod, and why a promotion failed', async () => {
    const preview = makePodPromoPreview({ ineligible_reason: 'This club is not in the filters.', hashtags: [], ai_caption: true, collaborators: [], slides: [] });
    const { onPromoted } = renderDialog([podPromoCandidatesMock(candidates), previewPodPromoMock('pod1', preview), createPodPromoMock('pod1', 'Pick an account first')]);
    fireEvent.click(await screen.findByTestId('pod-candidate-pod1'));
    expect(await screen.findByText('This club is not in the filters.')).toBeInTheDocument();
    expect(screen.getByText(/Caption written by AI/)).toBeInTheDocument();
    expect(screen.queryByTestId('preview-collaborators')).not.toBeInTheDocument();
    expect(screen.getByText('No banner yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Promote now' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Pick an account first', 'error'));
    expect(onPromoted).not.toHaveBeenCalled();
  });

  it('says a pod is too close when the preview has no post time', async () => {
    renderDialog([podPromoCandidatesMock(candidates), previewPodPromoMock('pod1', makePodPromoPreview({ scheduled_at: null }))]);
    fireEvent.click(await screen.findByTestId('pod-candidate-pod1'));
    expect(await screen.findByText('This pod is too close to its start to be promoted.')).toBeInTheDocument();
  });

  it('will not promote a pod that already has a live promotion', async () => {
    renderDialog([podPromoCandidatesMock(candidates), previewPodPromoMock('pod2')]);
    fireEvent.click(await screen.findByTestId('pod-candidate-pod2'));
    expect(await screen.findByRole('button', { name: 'Already promoted' })).toBeDisabled();
  });

  it('shows the render error and keeps Promote now from an editor', async () => {
    renderDialog([podPromoCandidatesMock(candidates), previewPodPromoMock('pod1', undefined, 'The pod has no cover photo')], false);
    fireEvent.click(await screen.findByTestId('pod-candidate-pod1'));
    expect(await screen.findByText('The pod has no cover photo')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-promo-promote')).not.toBeInTheDocument();
  });

  it('searches pods by title, and says when none match or the list failed', async () => {
    renderDialog([podPromoCandidatesMock(candidates), podPromoCandidatesMock([], 'zzz'), podPromoCandidatesMock([], 'err', 'Pods are down')]);
    expect(await screen.findByTestId('pod-candidate-pod1')).toBeInTheDocument();
    const search = within(screen.getByTestId('pod-picker-search')).getByRole('textbox');
    fireEvent.change(search, { target: { value: ' zzz ' } });
    expect(await screen.findByText('No upcoming pods match.')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'err' } });
    expect(await screen.findByText('Pods are down')).toBeInTheDocument();
  });

  it('closes from its close button', () => {
    const { onClose } = renderDialog([podPromoCandidatesMock([])]);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
