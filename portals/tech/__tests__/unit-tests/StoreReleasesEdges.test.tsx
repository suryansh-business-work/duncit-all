import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { releaseAdvice, releaseIssue, releasePage, releaseRow } from '../mocks/releases.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import ReleasesPage from '../../src/pages/app-builds/releases';
import ReleaseAdvice from '../../src/pages/app-builds/releases/ReleaseAdvice';
import ReleaseDetailsDialog from '../../src/pages/app-builds/releases/ReleaseDetailsDialog';
import ReleaseIssueFacts from '../../src/pages/app-builds/releases/ReleaseIssueFacts';
import LogRejectionDialog from '../../src/pages/app-builds/releases/log-rejection/LogRejectionDialog';
import { makeReleaseColumns } from '../../src/pages/app-builds/releases/releaseColumns';
import type { ReleaseActions } from '../../src/pages/app-builds/releases/useReleaseActions';

const mount = () =>
  renderWithProviders(<></>, {
    initialEntries: ['/releases'],
    routes: <Route path="/releases" element={<ReleasesPage />} />,
  });

const seed = (page = releasePage()) => {
  ops.q = { StoreReleases: { data: { storeReleases: page } } };
};

beforeEach(() => {
  resetOps();
  seed();
});

describe('ReleaseIssueFacts', () => {
  const facts = (row: ReturnType<typeof releaseRow>) => {
    render(<ReleaseIssueFacts row={row} />);
    return (label: string) => screen.getByText(label).nextElementSibling?.textContent;
  };

  it('says the store moved on, naming the state it moved to', () => {
    const fact = facts(
      releaseRow({
        issue: releaseIssue({ resolved_at: '2026-01-03T10:00:00.000Z', resolved_reason: 'STATE_CHANGED:READY_FOR_SALE' }),
      }),
    );
    expect(fact('Resolved')).toMatch(/^Store moved to .+ · /);
  });

  it('says the store no longer lists a version it dropped', () => {
    const fact = facts(
      releaseRow({ issue: releaseIssue({ resolved_at: '2026-01-03T10:00:00.000Z', resolved_reason: 'VERSION_GONE' }) }),
    );
    expect(fact('Resolved')).toMatch(/^The store no longer lists it/);
  });

  it('says the notice has not gone out yet, and counts reminders once it has', () => {
    const pending = facts(releaseRow({ issue: releaseIssue({ notified_at: null }) }));
    expect(pending('Notices')).toBe('Not sent yet');
  });

  it('adds the reminder count to a sent notice, with a dash when no reminder time is known', () => {
    const fact = facts(releaseRow({ issue: releaseIssue({ reminder_count: 2, last_reminded_at: null }) }));
    expect(fact('Notices')).toMatch(/^Mail and Slack sent .+ · 2 reminder\(s\), last —$/);
  });

  it('names an issue waiting on release rather than a rejection', () => {
    const fact = facts(releaseRow({ issue: releaseIssue({ kind: 'AWAITING_RELEASE' as never }) }));
    expect(fact('Issue')).toMatch(/^Awaiting release · /);
  });

  it('shows what was resubmitted, and a dash for the Apple review state a release has not got', () => {
    const fact = facts(
      releaseRow({
        review_state: '',
        issue: releaseIssue({ resubmitted_build_no: 'B-120', resubmitted_by: 'ops@example.test', resubmitted_at: null }),
      }),
    );
    expect(fact('Resubmitted')).toMatch(/^B-120 by ops@example\.test · —$/);
    expect(fact('Review')).toBe('—');
  });

  it('shows the track and rollout of a Google Play release instead of the Apple review columns', () => {
    const fact = facts(releaseRow({ store: 'GOOGLE_PLAY', track: 'production', rollout_pct: 20, issue: null }));
    expect(fact('Track · rollout')).toBe('production · 20%');
    expect(screen.queryByText('Review')).not.toBeInTheDocument();
    expect(screen.queryByText('Submitted')).not.toBeInTheDocument();
  });

  it('shows a Play track with no rollout as the track alone', () => {
    const fact = facts(releaseRow({ store: 'GOOGLE_PLAY', track: 'internal', rollout_pct: null, issue: null }));
    expect(fact('Track · rollout')).toBe('internal');
  });
});

describe('ReleaseAdvice', () => {
  it('lists only the groups of advice it has, and a dash for an unknown writing time', () => {
    render(
      <ReleaseAdvice advice={releaseAdvice({ causes: [], next_time: [], generated_at: null, confidence: 'MEDIUM' })} />,
    );
    expect(screen.getByText('Steps now')).toBeInTheDocument();
    expect(screen.queryByText('Likely causes')).not.toBeInTheDocument();
    expect(screen.queryByText('Next time')).not.toBeInTheDocument();
    expect(screen.getByText('Medium confidence')).toBeInTheDocument();
    expect(screen.getByText(/Written by test-model · —$/)).toBeInTheDocument();
  });

  it('leaves the confidence chip out for a level it does not know', () => {
    render(<ReleaseAdvice advice={releaseAdvice({ confidence: 'UNKNOWN' as never })} />);
    expect(screen.getByTestId('release-advice')).toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  it('says no advice could be written when the model gave neither advice nor a reason', () => {
    render(<ReleaseAdvice advice={releaseAdvice({ summary: '', error: '' })} />);
    expect(screen.getByText('No advice could be written for this issue.')).toBeInTheDocument();
  });
});

describe('ReleaseDetailsDialog', () => {
  const actions: ReleaseActions = {
    submitLatest: vi.fn(),
    resolve: vi.fn(),
    saveReviewerMessage: vi.fn(),
    logRejection: vi.fn(),
    busy: { submitting: false, resolving: false, savingMessage: false, logging: false },
  };
  const show = (row: ReturnType<typeof releaseRow> | null, storeUrl = '') =>
    render(<ReleaseDetailsDialog row={row} storeUrl={storeUrl} actions={actions} onClose={vi.fn()} onLogRejection={vi.fn()} />);

  it('shows nothing without a release', () => {
    show(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('describes a state it has no sentence for by naming the state', () => {
    show(releaseRow({ issue: releaseIssue({ state: 'IN_REVIEW_HOLD' }) }));
    expect(screen.getByTestId('release-issue-banner')).toHaveTextContent('The store reports this version as');
  });

  it('shows an issue waiting on release as a success, and a closed one as information', () => {
    const { unmount } = show(releaseRow({ issue: releaseIssue({ kind: 'AWAITING_RELEASE' as never, state: 'PENDING_DEVELOPER_RELEASE' }) }));
    expect(screen.getByTestId('release-issue-banner')).toHaveClass('MuiAlert-colorSuccess');
    unmount();

    show(releaseRow({ issue: releaseIssue({ resolved_at: '2026-01-03T10:00:00.000Z', resolved_reason: 'VERSION_GONE' }) }));
    expect(screen.getByTestId('release-issue-banner')).toHaveClass('MuiAlert-colorInfo');
    expect(screen.queryByRole('button', { name: 'Mark resolved' })).not.toBeInTheDocument();
  });

  it('shows a dash in the title for a release with no version or build number', () => {
    show(releaseRow({ version: '', build_number: '' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Version — · build —');
  });
});

describe('LogRejectionDialog', () => {
  it('can be closed while idle, and ignores a click outside while a log is in flight', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <LogRejectionDialog open initial={{ version: '', build_number: '' }} busy={false} onClose={onClose} onSubmit={vi.fn()} />,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<LogRejectionDialog open initial={{ version: '', build_number: '' }} busy onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Releases page / states', () => {
  it('shows a placeholder until the first read arrives', () => {
    ops.q.StoreReleases = { loading: true };
    mount();
    expect(screen.getByTestId('releases-loading')).toBeInTheDocument();
  });

  it('says the store is not connected, with no app name, for an unconfigured Play tab', async () => {
    seed(releasePage({ store: 'GOOGLE_PLAY', configured: false, rows: [], store_url: '' }));
    mount();
    fireEvent.click(await screen.findByTestId('releases-tab-play'));
    expect(await screen.findByText(/Google Play is not connected/)).toBeInTheDocument();
  });

  it('shows a dash when the store gave no app name', async () => {
    seed(releasePage({ app_name: '' }));
    mount();
    expect(await screen.findByText(/^Read from — at /)).toBeInTheDocument();
  });

  it('finds a release by its reviewer message, advice, version and build, and leaves out the rest', async () => {
    seed(
      releasePage({
        rows: [
          releaseRow({ id: 'r1', version: '2.4.0', issue: releaseIssue({ reviewer_message: 'Blank login page' }) }),
          releaseRow({ id: 'r2', version: '2.3.0', build_no: 'B-77', issue: null, status: 'LIVE', state: 'READY_FOR_SALE' }),
        ],
      }),
    );
    mount();
    await screen.findByText('2.4.0');

    fireEvent.change(screen.getByPlaceholderText('Search version, build, state or reason'), { target: { value: 'blank login' } });
    await waitFor(() => expect(screen.queryByText('2.3.0')).not.toBeInTheDocument());
    expect(screen.getByText('2.4.0')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search version, build, state or reason'), { target: { value: 'b-77' } });
    expect(await screen.findByText('2.3.0')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('2.4.0')).not.toBeInTheDocument());
  });

  it('closes the release dialog and the log dialog without sending anything', async () => {
    mount();
    const cell = await screen.findByText('2.4.0');
    fireEvent.click(cell.closest('[role="row"]') as HTMLElement);
    const details = await screen.findByRole('dialog');
    fireEvent.click(within(details).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Log rejection' }));
    const log = await screen.findByRole('dialog');
    fireEvent.click(within(log).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mutation('LogStoreRejection')).not.toHaveBeenCalled();
  });

  it('names a submitted build even when the server omitted it', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.SubmitLatestBuildToStore = vi.fn().mockResolvedValue({ data: {} });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Submit latest build' }));

    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledTimes(1));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Push started for  (v). Follow it on the Android or iOS table.');
  });

  it('leaves an open issue open when the operator declines to resolve it', async () => {
    ops.confirm.mockResolvedValue(false);
    mount();
    const cell = await screen.findByText('2.4.0');
    fireEvent.click(cell.closest('[role="row"]') as HTMLElement);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark resolved' }));

    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('ResolveStoreIssue')).not.toHaveBeenCalled();
    expect(ops.notifySuccess).not.toHaveBeenCalled();
  });
});

describe('release columns', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key} ${JSON.stringify(options.vars)}` : key;
  const column = (store: 'APP_STORE' | 'GOOGLE_PLAY', field: string) =>
    makeReleaseColumns(t, store).find((c) => c.field === field) as unknown as {
      valueGetter: (row: ReturnType<typeof releaseRow>) => unknown;
      cellRenderer?: (row: ReturnType<typeof releaseRow>) => React.ReactNode;
    };

  it('shows a dash for a release the store gave no version, build number, review state or build row', () => {
    const blank = releaseRow({ version: '', build_number: '', review_state: '', build_no: '', issue: null });

    expect(column('APP_STORE', 'version').valueGetter(blank)).toBe('—');
    expect(column('APP_STORE', 'build_number').valueGetter(blank)).toBe('—');
    expect(column('APP_STORE', 'review_state').valueGetter(blank)).toBe('—');
    expect(column('APP_STORE', 'build_no').valueGetter(blank)).toBe('—');
    expect(column('APP_STORE', 'issue.resubmitted_build_no').valueGetter(blank)).toBe('—');
    expect(column('APP_STORE', 'issue.state').valueGetter(blank)).toBe('');
  });

  it('reads a Play track with its rollout, or alone, or a dash with neither', () => {
    const track = column('GOOGLE_PLAY', 'track');

    expect(track.valueGetter(releaseRow({ track: 'production', rollout_pct: 20 }))).toBe('production · 20%');
    expect(track.valueGetter(releaseRow({ track: 'internal', rollout_pct: null }))).toBe('internal');
    expect(track.valueGetter(releaseRow({ track: '', rollout_pct: null }))).toBe('—');
  });

  it('draws the issue as rejected, awaiting release or resolved, each with its own tooltip source', () => {
    const cell = column('APP_STORE', 'issue.state').cellRenderer as (row: ReturnType<typeof releaseRow>) => React.ReactNode;
    const chip = (issue: ReturnType<typeof releaseIssue> | null) => {
      const { container, unmount } = render(<>{cell(releaseRow({ issue }))}</>);
      const found = container.querySelector('.MuiChip-root');
      const out = found ? { color: found.className, text: found.textContent } : null;
      unmount();
      return out;
    };

    expect(chip(null)).toBeNull();
    expect(chip(releaseIssue())?.color).toContain('MuiChip-colorError');
    expect(chip(releaseIssue({ kind: 'AWAITING_RELEASE' as never }))?.color).toContain('MuiChip-colorSuccess');
    expect(chip(releaseIssue({ resolved_at: '2026-01-03T10:00:00.000Z' }))?.color).toContain('MuiChip-colorDefault');
    // No advice and no reviewer message: the tooltip falls back to the store state.
    expect(chip(releaseIssue({ advice: null, reviewer_message: '' }))?.color).toContain('MuiChip-colorError');
  });
});
