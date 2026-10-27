import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import AuditChangesList from '../AuditChangesList';
import { AuditActionChip, AuditRiskChip } from '../AuditChips';
import AuditEntryCard from '../AuditEntryCard';
import FactLine from '../FactLine';
import PagedListBody from '../PagedListBody';
import PillChips from '../PillChips';
import QuickActionList from '../QuickActionList';
import type { AuditEntry } from '../audit-entry';
import { fallbackT } from '../../../i18n/fallback';

vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `at:${d}` }),
}));

const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  id: 'e1',
  action: 'UPDATE',
  source: 'CLUB_ADMIN',
  actor_name: 'Asha',
  note: '',
  changes: [],
  ai_risk: 'LOW',
  ai_summary: '',
  created_at: '2026-06-01T10:00:00.000Z',
  ...over,
} as AuditEntry);

describe('FactLine', () => {
  it('shows the value emphasised beside its label', () => {
    render(<FactLine value="12" label="Pods" />);
    expect(screen.getByTestId('fact-line')).toHaveTextContent('12 Pods');
  });
});

describe('PillChips', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  it('marks the selected chip and reports a pick', () => {
    const onChange = vi.fn();
    render(<PillChips label="Pick" options={options} value="a" onChange={onChange} />);
    expect(screen.getByText('Pick')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pick' })).toBeInTheDocument();
    expect(screen.getByTestId('pill-chips-a')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('pill-chips-b')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('pill-chips-b'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('can hide the visible heading and still name the group', () => {
    render(<PillChips label="Pick" options={options} value="a" onChange={vi.fn()} showLabel={false} />);
    expect(screen.queryByText('Pick')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pick' })).toBeInTheDocument();
  });
});

describe('QuickActionList', () => {
  it('links enabled rows, shows caption and badge, and renders a disabled row as a dead button', () => {
    render(
      <MemoryRouter>
        <QuickActionList
          testId="qa"
          actions={[
            { key: 'one', icon: <i />, label: 'Pods', caption: 'Manage', badge: '3 pending', to: '/pods' },
            { key: 'two', icon: <i />, label: 'Venues', to: '/venues', disabled: true },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByTestId('qa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pods/ })).toHaveAttribute('href', '/pods');
    expect(screen.getByText('Manage')).toBeInTheDocument();
    expect(screen.getByText('3 pending')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Venues/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Venues/ })).toBeDisabled();
  });
});

describe('PagedListBody', () => {
  const body = (over: Partial<Parameters<typeof PagedListBody>[0]> = {}) => {
    const onLoadMore = vi.fn();
    render(
      <PagedListBody
        loading={false}
        error={null}
        count={2}
        hasMore={false}
        emptyText="Nothing here"
        onLoadMore={onLoadMore}
        {...over}
      >
        <div data-testid="row">row</div>
      </PagedListBody>
    );
    return onLoadMore;
  };

  it('shows only the error when the first page failed', () => {
    body({ error: 'Boom', count: 0, loading: true });
    expect(screen.getByTestId('paged-list-body-error')).toHaveTextContent('Boom');
    expect(screen.queryByTestId('paged-list-body-loading')).not.toBeInTheDocument();
  });

  it('shows a spinner while the first page loads', () => {
    body({ loading: true, count: 0 });
    expect(screen.getByTestId('paged-list-body-loading')).toBeInTheDocument();
  });

  it('shows the empty text when there is nothing', () => {
    body({ count: 0 });
    expect(screen.getByTestId('paged-list-body-empty')).toHaveTextContent('Nothing here');
  });

  it('shows rows with no load-more when there are no more pages', () => {
    body();
    expect(screen.getByTestId('row')).toBeInTheDocument();
    expect(screen.queryByTestId('paged-list-body-load-more')).not.toBeInTheDocument();
    expect(screen.queryByTestId('paged-list-body-error')).not.toBeInTheDocument();
  });

  it('keeps the rows and shows a later-page error above them', () => {
    body({ error: 'Page 2 failed' });
    expect(screen.getByTestId('paged-list-body-error')).toHaveTextContent('Page 2 failed');
    expect(screen.getByTestId('row')).toBeInTheDocument();
  });

  it('loads more on press, and disables the button while loading', () => {
    const onLoadMore = body({ hasMore: true });
    fireEvent.click(screen.getByTestId('paged-list-body-load-more'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('paged-list-body-load-more')).toHaveTextContent(fallbackT('mweb.clubStudio.loadMore'));
  });

  it('disables load-more while another page is in flight', () => {
    body({ hasMore: true, loading: true });
    expect(screen.getByTestId('paged-list-body-load-more')).toBeDisabled();
  });
});

describe('AuditChangesList', () => {
  const changes = [
    { field: 'title', from: 'Old', to: 'New' },
    { field: 'spots', from: '', to: '' },
  ];

  it('lists each field diff with the empty marker for blank values and the note', () => {
    render(<AuditChangesList changes={changes} note="Because" />);
    const empty = fallbackT('clubAdmin.monitoring.emptyValue');
    expect(screen.getByTestId('audit-changes-list-title')).toHaveTextContent('title: Old → New');
    expect(screen.getByTestId('audit-changes-list-spots')).toHaveTextContent(`spots: ${empty} → ${empty}`);
    expect(screen.getByText('Because')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-changes-list-heading')).not.toBeInTheDocument();
  });

  it('shows the count heading and says so when a heading is asked for and there are no changes', () => {
    render(<AuditChangesList changes={[]} note="" heading />);
    expect(screen.getByTestId('audit-changes-list-heading')).toHaveTextContent(
      fallbackT('clubAdmin.monitoring.changesCount', { vars: { total: 0 } })
    );
    expect(screen.getByTestId('audit-changes-list-empty')).toHaveTextContent(fallbackT('clubAdmin.monitoring.noChanges'));
  });

  it('does not say "no changes" when there are some', () => {
    render(<AuditChangesList changes={changes} note="" heading />);
    expect(screen.queryByTestId('audit-changes-list-empty')).not.toBeInTheDocument();
  });

  it('stays bare without a heading when empty', () => {
    render(<AuditChangesList changes={[]} note="" />);
    expect(screen.queryByTestId('audit-changes-list-empty')).not.toBeInTheDocument();
  });
});

describe('Audit chips', () => {
  it('names the recorded action', () => {
    render(<AuditActionChip action="DELETE" />);
    expect(screen.getByTestId('audit-action-chip')).toBeInTheDocument();
  });

  it('shows the risk verdict bare, or prefixed when verbose', () => {
    const { unmount } = render(<AuditRiskChip risk="HIGH" />);
    const bare = screen.getByTestId('audit-risk-chip').textContent ?? '';
    expect(bare).not.toBe('');
    unmount();
    render(<AuditRiskChip risk="HIGH" verbose />);
    expect(screen.getByTestId('audit-risk-chip')).toHaveTextContent(
      fallbackT('clubAdmin.monitoring.aiRiskChip', { vars: { risk: bare } })
    );
  });
});

describe('AuditEntryCard', () => {
  it('shows the actor as the headline with source and time, plus the AI summary and children', () => {
    render(
      <AuditEntryCard entry={entry({ ai_summary: 'Looks fine' })}>
        <span data-testid="kid" />
      </AuditEntryCard>
    );
    expect(screen.getByTestId('audit-entry-card-title')).toHaveTextContent('Asha');
    expect(screen.getByTestId('audit-entry-card-meta')).toHaveTextContent('Asha');
    expect(screen.getByTestId('audit-entry-card-meta')).toHaveTextContent('at:2026-06-01T10:00:00.000Z');
    expect(screen.getByText(fallbackT('clubAdmin.pods.aiSummary', { vars: { summary: 'Looks fine' } }))).toBeInTheDocument();
    expect(screen.getByTestId('kid')).toBeInTheDocument();
    expect(screen.getByTestId('audit-entry-card').tagName).not.toBe('BUTTON');
  });

  it('uses the given title, an unknown-actor fallback and no summary line when blank', () => {
    render(<AuditEntryCard entry={entry({ actor_name: '' })} title="Pod Z" />);
    expect(screen.getByTestId('audit-entry-card-title')).toHaveTextContent('Pod Z');
    expect(screen.getByTestId('audit-entry-card-meta')).toHaveTextContent(fallbackT('clubAdmin.monitoring.unknownActor'));
    expect(screen.queryByText(/AI/)).not.toBeInTheDocument();
  });

  it('becomes a button that opens the entry when given a handler', () => {
    const onOpen = vi.fn();
    render(<AuditEntryCard entry={entry()} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('audit-entry-card'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
