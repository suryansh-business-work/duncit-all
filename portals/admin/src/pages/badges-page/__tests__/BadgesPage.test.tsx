import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import { BADGES, BADGE_CATEGORIES, BADGE_ROLES, CREATE_BADGE, DELETE_BADGE, UPDATE_BADGE } from '../queries';
import BadgesPage from '../BadgesPage';

/** The real field opens the shared media dialog (its own queries); the stub keeps its value contract. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: ({ label, value, onChange }: Readonly<{ label: string; value: string; onChange: (url: string) => void }>) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const firstPod = {
  __typename: 'Badge',
  id: 'b1',
  badge_id: 'first-pod',
  title: 'First Pod',
  description: 'Attend your first pod',
  image_url: 'https://cdn.duncit.com/badges/first-pod.png',
  condition_type: 'POD_ATTEND_COUNT',
  threshold: 1,
  category_id: 'cat-sports',
  role_key: '',
  sort_order: 1,
  is_active: true,
  updated_at: '2026-08-01T10:00:00.000Z',
};

const hostHero = {
  __typename: 'Badge',
  id: 'b2',
  badge_id: 'host-hero',
  title: 'Host Hero',
  description: 'Given by the Duncit team',
  image_url: '',
  condition_type: 'MANUAL',
  threshold: 1,
  category_id: null,
  role_key: '',
  sort_order: 2,
  is_active: false,
  updated_at: '2026-08-02T10:00:00.000Z',
};

const baseMocks = (): MockedResponse[] => [
  { request: { query: BADGES }, result: { data: { badges: [firstPod, hostHero] } }, maxUsageCount: Number.POSITIVE_INFINITY },
  {
    request: { query: BADGE_CATEGORIES },
    result: { data: { categories: [{ __typename: 'Category', id: 'cat-sports', name: 'Sports', level: 'SUPER' }] } },
  },
  {
    request: { query: BADGE_ROLES },
    result: { data: { roles: [{ __typename: 'Role', id: 'r-host', key: 'HOST', name: 'Host' }] } },
  },
];

/** Records the variables a mutation was sent with and answers it. */
const capture = (
  query: MockedResponse['request']['query'],
  data: Record<string, unknown>,
  sent: Record<string, unknown>[],
): MockedResponse => ({
  request: { query, variables: () => true },
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return { data };
  },
});

const pick = async (field: RegExp, option: string) => {
  fireEvent.mouseDown(await screen.findByRole('combobox', { name: field }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

describe('BadgesPage — the catalogue', () => {
  it('shows each badge with its artwork, condition goal and an Inactive chip when switched off', async () => {
    renderWithProviders(<BadgesPage />, { mocks: baseMocks() });

    expect(await screen.findByText('First Pod')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'First Pod' })).toHaveAttribute(
      'src',
      'https://cdn.duncit.com/badges/first-pod.png',
    );
    expect(screen.getByText('Pods attended ≥ 1')).toBeInTheDocument();

    const hero = screen.getByText('Host Hero').closest('.MuiCard-root') as HTMLElement;
    expect(within(hero).getByText('Inactive')).toBeInTheDocument();
    expect(within(hero).queryByRole('img')).toBeNull();
    expect(screen.getAllByText('Inactive')).toHaveLength(1);
  });
});

describe('BadgesPage — editing', () => {
  it('opens a badge for editing and saves it, sending no category as null', async () => {
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<BadgesPage />, {
      mocks: [...baseMocks(), capture(UPDATE_BADGE, { updateBadge: { __typename: 'Badge', id: 'b2' } }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Host Hero' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit badge')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: /Title/ })).toHaveValue('Host Hero');

    fireEvent.click(within(dialog).getByTestId('badge-form-active'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      id: 'b2',
      input: {
        title: 'Host Hero',
        description: 'Given by the Duncit team',
        image_url: '',
        condition_type: 'MANUAL',
        threshold: 1,
        role_key: '',
        sort_order: 2,
        is_active: true,
        category_id: null,
      },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps a badge’s stored category when it is re-saved', async () => {
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<BadgesPage />, {
      mocks: [...baseMocks(), capture(UPDATE_BADGE, { updateBadge: { __typename: 'Badge', id: 'b1' } }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit First Pod' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ id: 'b1', input: { category_id: 'cat-sports', is_active: true } });
  });
});

describe('BadgesPage — creating', () => {
  it('creates a category-scoped badge with the category picked', async () => {
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<BadgesPage />, {
      mocks: [...baseMocks(), capture(CREATE_BADGE, { createBadge: { __typename: 'Badge', id: 'b3' } }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'New badge' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Create badge' })).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Title/ }), { target: { value: 'Sports Star' } });

    await pick(/^Condition/, 'Pods attended in a category');
    await pick(/^Category/, 'Sports · SUPER');
    fireEvent.click(await screen.findByRole('button', { name: 'Create badge' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      input: { title: 'Sports Star', condition_type: 'CATEGORY_POD_ATTEND_COUNT', category_id: 'cat-sports' },
    });
  });

  it('points a role badge at the partner role picked, with the threshold locked', async () => {
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<BadgesPage />, {
      mocks: [...baseMocks(), capture(CREATE_BADGE, { createBadge: { __typename: 'Badge', id: 'b4' } }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'New badge' }));
    fireEvent.change(within(await screen.findByRole('dialog')).getByRole('textbox', { name: /Title/ }), {
      target: { value: 'Host Unlocked' },
    });

    await pick(/^Condition/, 'Partner role granted');
    await pick(/^Partner role/, 'Host');
    expect(await screen.findByRole('spinbutton', { name: 'Threshold' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Create badge' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      input: { title: 'Host Unlocked', condition_type: 'ROLE_GRANTED', role_key: 'HOST', category_id: null },
    });
  });

  it('closes the dialog from Cancel without saving', async () => {
    renderWithProviders(<BadgesPage />, { mocks: baseMocks() });
    fireEvent.click(await screen.findByRole('button', { name: 'New badge' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('BadgesPage — deleting', () => {
  it('deletes a badge once the confirmation is accepted', async () => {
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<BadgesPage />, {
      mocks: [...baseMocks(), capture(DELETE_BADGE, { deleteBadge: true }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Host Hero' }));
    const confirm = await screen.findByRole('dialog');
    expect(
      within(confirm).getByText('Delete the badge "Host Hero"? It disappears from every member profile.'),
    ).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(sent).toEqual([{ id: 'b2' }]));
  });

  it('leaves the badge alone when the confirmation is cancelled', async () => {
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<BadgesPage />, {
      mocks: [...baseMocks(), capture(DELETE_BADGE, { deleteBadge: true }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Delete First Pod' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual([]);
  });
});
