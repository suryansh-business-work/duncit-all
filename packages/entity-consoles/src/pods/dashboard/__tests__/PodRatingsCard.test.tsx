import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { POD_FEEDBACK_ASPECT_LABEL, type PodFeedbackAspect } from '@duncit/utils';
import PodRatingsCard from '../PodRatingsCard';

const [knownAspect] = Object.keys(POD_FEEDBACK_ASPECT_LABEL) as PodFeedbackAspect[];

describe('PodRatingsCard', () => {
  it('names each aspect with its shared label and shows its average and count', () => {
    render(<PodRatingsCard aspects={[{ aspect: knownAspect, average: 4.25, count: 31 }]} total={31} days={30} />);
    expect(screen.getByText('What guests scored')).toBeInTheDocument();
    expect(screen.getByText('31 ratings in the last 30 days')).toBeInTheDocument();
    expect(screen.getByText(POD_FEEDBACK_ASPECT_LABEL[knownAspect])).toBeInTheDocument();
    expect(screen.getByText('4.3 · 31')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /4\.3 Stars/ })).toBeInTheDocument();
  });

  it('falls back to the raw aspect name for an aspect the shared labels do not know', () => {
    render(<PodRatingsCard aspects={[{ aspect: 'PARKING', average: 2, count: 4 }]} total={4} days={7} />);
    expect(screen.getByText('PARKING')).toBeInTheDocument();
    expect(screen.getByText('2.0 · 4')).toBeInTheDocument();
  });

  it('says there were no ratings in the window when the total is zero', () => {
    render(<PodRatingsCard aspects={[]} total={0} days={90} />);
    expect(screen.getByText('No ratings in the last 90 days')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
