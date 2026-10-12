import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import PodCancellationRiskSection from '../PodCancellationRiskSection';
import { POD_CANCELLATION_RISK, type PodCancellationRiskView } from '../queries';

// Copy and the card chrome come from the pod-details package; echoing the key
// and the values makes visible exactly what this section chose to say.
vi.mock('@duncit/pod-details', () => ({
  usePodDetailsTranslation: () => ({
    t: (key: string, options?: { vars?: Record<string, string | number> }) =>
      options?.vars ? `${key} ${JSON.stringify(options.vars)}` : key,
  }),
  SectionCard: ({
    title,
    loading,
    action,
    children,
  }: {
    title: string;
    loading: boolean;
    action: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section aria-label={title} data-loading={String(loading)}>
      {action}
      {children}
    </section>
  ),
}));
vi.mock('../RiskPanels', () => ({
  FinancePanel: () => <div data-testid="finance" />,
  AttendeesPanel: () => <div data-testid="attendees" />,
  FixList: () => <div data-testid="fixes" />,
  AlertsLine: () => <div data-testid="alerts" />,
}));

const riskData = (over: Partial<PodCancellationRiskView> = {}) => ({
  __typename: 'PodCancellationRisk',
  pod_id: 'pod-1',
  state: 'AT_RISK',
  at_risk: true,
  hours_until_start: 20.6,
  lead_hours: 24,
  window_hours: 72,
  alert_hours: 6,
  cancel_at: '2026-10-20T10:00:00.000Z',
  currency_symbol: '₹',
  collected_total: 1000,
  venue_amount: 2500,
  shortfall: 1500,
  waterfall: null,
  attendees: null,
  alerted_at: null,
  alert_count: 0,
  next_alert_at: null,
  ...over,
});

const riskMock = (data: Record<string, unknown> | Error): MockedResponse => ({
  request: { query: POD_CANCELLATION_RISK, variables: { id: 'pod-1' } },
  ...(data instanceof Error
    ? { error: data }
    : { result: { data: { podCancellationRisk: data } } }),
});

const mount = (mocks: MockedResponse[], props: { podId?: string; cancelled?: boolean } = {}) =>
  render(
    <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
      <PodCancellationRiskSection
        podId={props.podId ?? 'pod-1'}
        cancelled={props.cancelled ?? false}
      />
    </MockedProvider>,
  );

describe('PodCancellationRiskSection', () => {
  it('renders nothing for a pod that is not at risk', async () => {
    const { container } = mount([riskMock(riskData({ at_risk: false, state: 'HEALTHY' }))]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
  });

  it('lays out the report when the pod is at risk, with hours rounded and the cancel time', async () => {
    mount([riskMock(riskData())]);

    const section = await screen.findByRole('region', { name: 'admin.podRisk.title' });
    expect(section).toBeInTheDocument();
    expect(screen.getByText(/admin\.podRisk\.lead \{"cancelAt":".+"\}/)).toBeInTheDocument();
    expect(screen.getByText('admin.podRisk.hoursLeft {"hours":21,"lead":24}')).toBeInTheDocument();
    expect(screen.getByText('admin.pods.cancellationRisk')).toBeInTheDocument();
    for (const id of ['finance', 'attendees', 'fixes', 'alerts']) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it('shows a dash when no cancellation time has been computed', async () => {
    mount([riskMock(riskData({ cancel_at: null }))]);
    expect(await screen.findByText('admin.podRisk.lead {"cancelAt":"—"}')).toBeInTheDocument();
  });

  it('warns that the report could not load rather than hiding the failure', async () => {
    mount([riskMock(new GraphQLError('risk unavailable'))]);
    expect(await screen.findByText('admin.podRisk.loadFailed')).toBeInTheDocument();
  });

  it('does not ask for a cancelled pod, which has nothing left to be at risk of', async () => {
    const { container } = mount([riskMock(riskData())], { cancelled: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
  });

  it('does not ask without a pod id', async () => {
    const { container } = mount([], { podId: '' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
