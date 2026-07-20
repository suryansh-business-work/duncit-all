import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstimateCard from '../src/EstimateCard';
import { makeAdPricing } from './factories';

const pricing = makeAdPricing();

describe('EstimateCard', () => {
  it('shows skeletons while pricing is loading', () => {
    const { container } = render(<EstimateCard pricing={undefined} loading position="AUTO" durationDays={7} />);
    expect(screen.getByText('Estimated Cost')).toBeInTheDocument();
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('shows skeletons when pricing is missing even if not loading', () => {
    const { container } = render(<EstimateCard pricing={null} loading={false} position="AUTO" durationDays={7} />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('computes the per-day price times duration (plural days)', () => {
    render(<EstimateCard pricing={pricing} loading={false} position="HOME_BOTTOM" durationDays={7} />);
    expect(screen.getByText('Home Bottom · per day')).toBeInTheDocument();
    expect(screen.getByText('₹500')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('₹3,500')).toBeInTheDocument();
  });

  it('renders a singular day label for a one-day campaign', () => {
    render(<EstimateCard pricing={pricing} loading={false} position="SIDEBAR" durationDays={1} />);
    expect(screen.getByText('1 day')).toBeInTheDocument();
  });
});
