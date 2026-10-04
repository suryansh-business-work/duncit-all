import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import {
  CREATE_SOMETHING_FOR_YOU,
  DELETE_SOMETHING_FOR_YOU,
  SOMETHING_FOR_YOU_ITEMS,
  UPDATE_SOMETHING_FOR_YOU,
} from '../queries';
import SomethingForYouPage from '../SomethingForYouPage';

/** The real field opens the shared media dialog (its own queries); the stub keeps its value contract. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: ({ label, value, onChange }: Readonly<{ label: string; value: string; onChange: (url: string) => void }>) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const refer = {
  __typename: 'SomethingForYouItem',
  id: 'sfy-1',
  title: 'Refer a friend',
  image_url: 'https://cdn.duncit.com/sfy/refer.png',
  bottom_text: 'Refer and Earn',
  action_type: 'ROUTE',
  link_path: '/earn',
  link_url: '',
  sort_order: 0,
  is_active: true,
};

/** Counts how often the list was fetched, so a refetch after a write is observable. */
const listMock = (fetches: { count: number }, items: unknown[] = [refer]): MockedResponse => ({
  request: { query: SOMETHING_FOR_YOU_ITEMS },
  result: () => {
    fetches.count += 1;
    return { data: { somethingForYouItems: items } };
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

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

describe('SomethingForYouPage — the list', () => {
  it('shows the empty notice when there are no cards', async () => {
    renderWithProviders(<SomethingForYouPage />, { mocks: [listMock({ count: 0 }, [])] });

    expect(await screen.findByText('No cards yet, so the section is hidden on Home.')).toBeInTheDocument();
  });

  it('shows the query error message', async () => {
    renderWithProviders(<SomethingForYouPage />, {
      mocks: [{ request: { query: SOMETHING_FOR_YOU_ITEMS }, error: new Error('Network down') }],
    });

    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });
});

describe('SomethingForYouPage — saving', () => {
  it('creates a new card at the end of the list and refetches', async () => {
    const fetches = { count: 0 };
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<SomethingForYouPage />, {
      mocks: [
        listMock(fetches),
        capture(CREATE_SOMETHING_FOR_YOU, { createSomethingForYouItem: { ...refer, id: 'sfy-2' } }, sent),
      ],
    });

    await screen.findByText('Refer a friend');
    fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New card')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Title/ }), { target: { value: 'Shop deals' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      input: {
        title: 'Shop deals',
        image_url: '',
        bottom_text: '',
        action_type: 'NONE',
        link_path: '',
        link_url: '',
        sort_order: 1,
        is_active: true,
      },
    });
    await waitFor(() => expect(fetches.count).toBe(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('updates an existing card by its id, without sending the id inside the input', async () => {
    const fetches = { count: 0 };
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<SomethingForYouPage />, {
      mocks: [
        listMock(fetches),
        capture(UPDATE_SOMETHING_FOR_YOU, { updateSomethingForYouItem: refer }, sent),
      ],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit card' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit card')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Title/ }), { target: { value: 'Refer & earn' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      itemId: 'sfy-1',
      input: {
        title: 'Refer & earn',
        image_url: 'https://cdn.duncit.com/sfy/refer.png',
        bottom_text: 'Refer and Earn',
        action_type: 'ROUTE',
        link_path: '/earn',
        link_url: '',
        sort_order: 0,
        is_active: true,
      },
    });
    await waitFor(() => expect(fetches.count).toBe(2));
  });
});

describe('SomethingForYouPage — cancelling the editor', () => {
  it('closes the dialog from Cancel without saving anything', async () => {
    const fetches = { count: 0 };
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<SomethingForYouPage />, {
      mocks: [listMock(fetches), capture(CREATE_SOMETHING_FOR_YOU, { createSomethingForYouItem: refer }, sent)],
    });

    await screen.findByText('Refer a friend');
    fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent).toEqual([]);
    expect(fetches.count).toBe(1);
  });
});

describe('SomethingForYouPage — deleting', () => {
  it('deletes the card once the confirmation is accepted and refetches', async () => {
    const fetches = { count: 0 };
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<SomethingForYouPage />, {
      mocks: [listMock(fetches), capture(DELETE_SOMETHING_FOR_YOU, { deleteSomethingForYouItem: true }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Delete card' }));
    const confirm = await screen.findByRole('dialog');
    expect(
      within(confirm).getByText('Delete "Refer a friend"? It disappears from Home on both mWeb and the app.'),
    ).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(sent).toEqual([{ itemId: 'sfy-1' }]));
    await waitFor(() => expect(fetches.count).toBe(2));
  });

  it('leaves the card alone when the confirmation is cancelled', async () => {
    const fetches = { count: 0 };
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<SomethingForYouPage />, {
      mocks: [listMock(fetches), capture(DELETE_SOMETHING_FOR_YOU, { deleteSomethingForYouItem: true }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Delete card' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent).toEqual([]);
    expect(fetches.count).toBe(1);
    expect(screen.getByText('Refer a friend')).toBeInTheDocument();
  });
});
