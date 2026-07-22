import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { describe, expect, it, vi } from 'vitest';
import BackoutConfirmDialog from '../BackoutConfirmDialog';

const POLICY_BY_SLUG = gql`
  query PolicyBySlug($slug: String!) {
    policyBySlug(slug: $slug) {
      id
      slug
      title
      content
      is_active
      updated_at
    }
  }
`;

const policyMock = {
  request: { query: POLICY_BY_SLUG, variables: { slug: 'backout-terms' } },
  result: {
    data: {
      policyBySlug: {
        id: 'p1',
        slug: 'backout-terms',
        title: 'Backout Terms',
        content: '<p>These are the live backout terms.</p>',
        is_active: true,
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    },
  },
};

function renderDialog(
  props: Partial<React.ComponentProps<typeof BackoutConfirmDialog>> = {},
  mocks = [policyMock],
) {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ...props,
  };
  return {
    ...baseProps,
    ...render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MemoryRouter initialEntries={['/pods/1']}>
          <BackoutConfirmDialog {...baseProps} />
        </MemoryRouter>
      </MockedProvider>,
    ),
  };
}

describe('BackoutConfirmDialog', () => {
  it('does not render content when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Backout from Pod?')).not.toBeInTheDocument();
  });

  it('renders title, warning copy and default action labels', () => {
    renderDialog();
    expect(screen.getByText('Backout from Pod?')).toBeInTheDocument();
    expect(
      screen.getByText(/you will get the refund only if someone fills your spot/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Confirm Backout' })).toBeEnabled();
  });

  it('does not show the refund alert when refundAmount is null', () => {
    renderDialog({ refundAmount: null });
    expect(
      screen.queryByText(/after the .* backout deduction/i),
    ).not.toBeInTheDocument();
  });

  it('renders the refund estimate with currency and deduction percent', () => {
    renderDialog({ refundAmount: 450, currency: '$', deductionPct: 10 });
    expect(screen.getByText('$450')).toBeInTheDocument();
    expect(
      screen.getByText(/after the 10% backout deduction/i),
    ).toBeInTheDocument();
  });

  it('renders the embedded policy content once the query resolves', async () => {
    renderDialog();
    await waitFor(() =>
      expect(
        screen.getByText('These are the live backout terms.'),
      ).toBeInTheDocument(),
    );
  });

  it('links to the full backout terms page and calls onClose on link click', () => {
    const { onClose } = renderDialog();
    const link = screen.getByRole('link', {
      name: /backout terms & conditions/i,
    });
    expect(link).toHaveAttribute('href', '/policies/backout-terms');
    fireEvent.click(link);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fires onClose and onConfirm on button clicks', () => {
    const { onClose, onConfirm } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Backout' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons and shows the busy label while busy', () => {
    renderDialog({ busy: true });
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    const confirm = screen.getByRole('button', { name: 'Backing out…' });
    expect(confirm).toBeDisabled();
  });
});
