import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { TestsScenarioCoverage } from '@duncit/gql-types';
import { renderWithProviders } from '../testkit';
import ScenarioCard from '../../src/pages/dashboard/ScenarioCard';

const coverage = (over: Partial<TestsScenarioCoverage> = {}): TestsScenarioCoverage => ({
  flows: 473,
  automated: 294,
  automated_pct: 62.2,
  sub_flows: 10,
  looks_good: 4,
  needs_review: 1,
  not_reviewed: 5,
  pct: 40,
  ...over,
});

describe('Dashboard scenario card', () => {
  it('shows how many flows a live spec tests beside the review meters', () => {
    renderWithProviders(<ScenarioCard scenario={coverage()} />);

    expect(screen.getByText('Flows a spec tests')).toBeInTheDocument();
    expect(screen.getByText('294 / 473')).toBeInTheDocument();
    expect(screen.getByText('62.2%')).toBeInTheDocument();
    expect(screen.getByText('Looks good')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('says there is no data when no flow is automated to measure against', () => {
    renderWithProviders(<ScenarioCard scenario={coverage({ automated: 0, automated_pct: null })} />);

    expect(screen.getByText('0 / 473')).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('shows the empty state for an empty catalogue', () => {
    renderWithProviders(
      <ScenarioCard scenario={coverage({ flows: 0, automated: 0, automated_pct: null, sub_flows: 0, pct: null })} />
    );

    expect(screen.getByText('The E2E flow catalogue is empty.')).toBeInTheDocument();
    expect(screen.queryByText('Flows a spec tests')).not.toBeInTheDocument();
  });
});
