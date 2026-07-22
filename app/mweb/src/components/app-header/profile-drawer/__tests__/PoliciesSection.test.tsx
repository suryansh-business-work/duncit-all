import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PoliciesSection from '../PoliciesSection';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

const policies = [
  { id: '1', slug: 'privacy', title: 'Privacy Policy' },
  { id: '2', slug: 'terms', title: 'Terms of Service' },
];

function renderSection(
  props: Partial<React.ComponentProps<typeof PoliciesSection>> = {},
) {
  const setPoliciesOpen = props.setPoliciesOpen ?? vi.fn();
  render(
    <MemoryRouter>
      <PoliciesSection
        publicPolicies={props.publicPolicies ?? policies}
        policiesOpen={props.policiesOpen ?? false}
        setPoliciesOpen={setPoliciesOpen}
      />
    </MemoryRouter>,
  );
  return { setPoliciesOpen };
}

describe('PoliciesSection', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders nothing when there are no policies', () => {
    const { container } = render(
      <MemoryRouter>
        <PoliciesSection
          publicPolicies={[]}
          policiesOpen={false}
          setPoliciesOpen={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the Policies header when policies exist', () => {
    renderSection();
    expect(screen.getByText('Policies')).toBeInTheDocument();
  });

  it('toggles open state when header is clicked', () => {
    const { setPoliciesOpen } = renderSection();
    fireEvent.click(screen.getByText('Policies'));
    expect(setPoliciesOpen).toHaveBeenCalledTimes(1);
    // verify the passed updater flips the boolean
    const updater = (setPoliciesOpen as any).mock.calls[0][0] as (
      v: boolean,
    ) => boolean;
    expect(updater(false)).toBe(true);
    expect(updater(true)).toBe(false);
  });

  it('shows policy items and navigates on click when open', () => {
    renderSection({ policiesOpen: true });
    const privacy = screen.getByText('Privacy Policy');
    const terms = screen.getByText('Terms of Service');
    expect(privacy).toBeInTheDocument();
    expect(terms).toBeInTheDocument();

    fireEvent.click(privacy);
    expect(mockNavigate).toHaveBeenCalledWith('/policies/privacy');

    fireEvent.click(terms);
    expect(mockNavigate).toHaveBeenCalledWith('/policies/terms');
  });
});
