import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  useQuery: useQueryMock,
}));
vi.mock('@duncit/category', () => import('./mocks/categoryMock'));
vi.mock('@duncit/location', () => import('./mocks/locationMock'));

import ClubSections from '../src/ClubSections';
import { ClubFormDataProvider } from '../src/context';
import type { ClubFormConfig, ClubFormData, ClubFormValues } from '../src/types';
import { FormHarness } from './formHarness';

function renderSections(config: ClubFormConfig, onMethods?: (m: UseFormReturn<ClubFormValues>) => void) {
  const data: ClubFormData = { config, initialAdmins: [] };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FormHarness onMethods={onMethods}>
      <ClubFormDataProvider value={data}>{children}</ClubFormDataProvider>
    </FormHarness>
  );
  return render(<ClubSections />, { wrapper: Wrapper });
}

const withAdmins: ClubFormConfig = { showAdmins: true, showVerified: true, showIsActive: true };
const sectionButton = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined }));
afterEach(() => useQueryMock.mockReset());

describe('ClubSections', () => {
  it('includes the Club Admins section only when governance is on', () => {
    const { unmount } = renderSections(withAdmins);
    expect(screen.getByText('5. Club Admins')).toBeInTheDocument();
    expect(screen.getByText('1. Basic Information')).toBeInTheDocument();
    unmount();

    renderSections({ showAdmins: false, showVerified: false, showIsActive: false });
    expect(screen.queryByText('5. Club Admins')).not.toBeInTheDocument();
    expect(screen.queryByText(/Club Admins/)).not.toBeInTheDocument();
  });

  it('expands all and collapses all sections', async () => {
    const user = userEvent.setup();
    renderSections(withAdmins);
    const expandAll = screen.getByRole('button', { name: /Expand all/ });
    const collapseAll = screen.getByRole('button', { name: /Collapse all/ });

    // Only Basic is open initially.
    expect(sectionButton(/Basic Information/)).toHaveAttribute('aria-expanded', 'true');
    expect(sectionButton(/Media & Moments/)).toHaveAttribute('aria-expanded', 'false');

    await user.click(expandAll);
    expect(sectionButton(/Media & Moments/)).toHaveAttribute('aria-expanded', 'true');
    expect(expandAll).toBeDisabled();

    await user.click(collapseAll);
    expect(sectionButton(/Basic Information/)).toHaveAttribute('aria-expanded', 'false');
    expect(collapseAll).toBeDisabled();
  });

  it('toggles a single section open then closed', async () => {
    const user = userEvent.setup();
    renderSections(withAdmins);
    const media = sectionButton(/Media & Moments/);
    expect(media).toHaveAttribute('aria-expanded', 'false');
    await user.click(media);
    expect(media).toHaveAttribute('aria-expanded', 'true');
    await user.click(media);
    expect(media).toHaveAttribute('aria-expanded', 'false');
  });

  it('auto-expands sections with validation errors and shows the required count', () => {
    let methods: UseFormReturn<ClubFormValues> | undefined;
    renderSections(withAdmins, (m) => { methods = m; });
    expect(sectionButton(/Media & Moments/)).toHaveAttribute('aria-expanded', 'false');

    act(() => {
      methods?.setError('feature_text', { message: 'Add at least one feature image' });
      methods?.setError('club_name', { message: 'Club name is required' });
    });

    expect(sectionButton(/Media & Moments/)).toHaveAttribute('aria-expanded', 'true');
    // Both the basic (club_name) and media (feature_text) sections show a chip.
    expect(screen.getAllByText('1 required')).toHaveLength(2);
  });

  it('ignores errors for fields not mapped to any section', () => {
    let methods: UseFormReturn<ClubFormValues> | undefined;
    renderSections(withAdmins, (m) => { methods = m; });
    act(() => methods?.setError('club_id', { message: 'nope' }));
    // No section maps to club_id, so nothing new expands and no chip appears.
    expect(sectionButton(/Media & Moments/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('1 required')).not.toBeInTheDocument();
  });
});
