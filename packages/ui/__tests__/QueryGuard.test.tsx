import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryGuard } from '../src/QueryGuard';

describe('QueryGuard', () => {
  it('shows a centered spinner while loading', () => {
    const { container } = render(
      <QueryGuard loading spinnerSize={24} spinnerSx={{ py: 2 }}>
        <div>content</div>
      </QueryGuard>,
    );
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('renders an error Alert using parseApiError when no errorText is given', () => {
    render(<QueryGuard error={{ message: 'Boom happened' }}>ok</QueryGuard>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Boom happened');
    expect(alert).toHaveClass('MuiAlert-standard', 'MuiAlert-colorError');
  });

  it('prefers an explicit errorText over parseApiError', () => {
    render(
      <QueryGuard error={new Error('raw')} errorText="Friendly message">
        ok
      </QueryGuard>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Friendly message');
  });

  it('shows a not-found Alert with the default info severity and text', () => {
    render(<QueryGuard notFound>ok</QueryGuard>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Not found.');
    expect(alert).toHaveClass('MuiAlert-standard', 'MuiAlert-colorInfo');
  });

  it('supports a custom not-found severity and text', () => {
    render(
      <QueryGuard notFound notFoundSeverity="warning" notFoundText="No venue">
        ok
      </QueryGuard>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No venue');
    expect(alert).toHaveClass('MuiAlert-standard', 'MuiAlert-colorWarning');
  });

  it('draws the given skeleton instead of the spinner while loading, then the content', () => {
    const skeleton = <div role="status" aria-label="Loading the pod">placeholder</div>;
    const { container, rerender } = render(
      <QueryGuard loading skeleton={skeleton}>
        <div>content</div>
      </QueryGuard>,
    );
    expect(screen.getByRole('status', { name: 'Loading the pod' })).toHaveTextContent('placeholder');
    expect(container.querySelector('.MuiCircularProgress-root')).not.toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();

    rerender(
      <QueryGuard loading={false} skeleton={skeleton}>
        <div>content</div>
      </QueryGuard>,
    );
    expect(screen.queryByRole('status', { name: 'Loading the pod' })).not.toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders node children once all guards pass', () => {
    render(
      <QueryGuard>
        <div>the page</div>
      </QueryGuard>,
    );
    expect(screen.getByText('the page')).toBeInTheDocument();
  });

  it('invokes a function child lazily once the guards pass', () => {
    render(<QueryGuard>{() => <div>deferred</div>}</QueryGuard>);
    expect(screen.getByText('deferred')).toBeInTheDocument();
  });
});
