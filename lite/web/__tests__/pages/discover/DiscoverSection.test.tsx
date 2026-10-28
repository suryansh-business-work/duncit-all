import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscoverSection } from '../../../pages/discover/DiscoverSection';

describe('DiscoverSection', () => {
  it('is a region named by its own level-2 heading, holding its content and action', () => {
    render(
      <DiscoverSection title="Popular events" subtitle="Delhi" action={<button type="button">View all</button>} testId="band">
        <p>Garden Party</p>
      </DiscoverSection>,
    );
    const region = screen.getByRole('region', { name: 'Popular events' });
    expect(region).toHaveAttribute('data-testid', 'band');
    expect(within(region).getByRole('heading', { level: 2, name: 'Popular events' })).toBeInTheDocument();
    expect(within(region).getByText('Delhi')).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'View all' })).toBeInTheDocument();
    expect(within(region).getByText('Garden Party')).toBeInTheDocument();
  });

  it('gives two bands on one page distinct heading ids', () => {
    render(
      <>
        <DiscoverSection title="One" testId="one">
          <p>a</p>
        </DiscoverSection>
        <DiscoverSection title="Two" testId="two">
          <p>b</p>
        </DiscoverSection>
      </>,
    );
    const one = screen.getByTestId('one').getAttribute('aria-labelledby');
    const two = screen.getByTestId('two').getAttribute('aria-labelledby');
    expect(one).toBeTruthy();
    expect(one).not.toBe(two);
    expect(screen.getByRole('region', { name: 'Two' })).toBeInTheDocument();
  });

  it('leaves the subtitle out when there is none', () => {
    render(
      <DiscoverSection title="Categories" testId="band">
        <p>grid</p>
      </DiscoverSection>,
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'Categories' });
    expect(heading.parentElement?.children).toHaveLength(1);
  });
});
