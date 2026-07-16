import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../src/PageHeader';

describe('PageHeader', () => {
  it('renders just the title block (no subtitle, no actions)', () => {
    render(<PageHeader title="Dashboard" />);
    const title = screen.getByText('Dashboard');
    expect(title).toHaveClass('MuiTypography-h5');
    expect(title).toHaveStyle({ fontWeight: '800' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<PageHeader title="Users" subtitle="All the people" />);
    expect(screen.getByText('All the people')).toHaveClass('MuiTypography-body2');
  });

  it('wraps in a space-between row when actions are provided', () => {
    render(
      <PageHeader
        title="Leads"
        subtitle="Pipeline"
        actions={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  it('respects titleVariant and titleWeight overrides', () => {
    render(<PageHeader title="Big" titleVariant="h4" titleWeight={600} />);
    const title = screen.getByText('Big');
    expect(title).toHaveClass('MuiTypography-h4');
    expect(title).toHaveStyle({ fontWeight: '600' });
  });
});
