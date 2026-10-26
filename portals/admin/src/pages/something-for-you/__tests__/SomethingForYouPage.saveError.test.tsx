import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import { CREATE_SOMETHING_FOR_YOU, SOMETHING_FOR_YOU_ITEMS } from '../queries';
import SomethingForYouPage from '../SomethingForYouPage';

/** The real field opens the shared media dialog (its own queries); the stub keeps its value contract. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: ({ label, value, onChange }: Readonly<{ label: string; value: string; onChange: (url: string) => void }>) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const REFUSAL = 'Enter the address this card opens';

const listMock = (fetches: { count: number }): MockedResponse => ({
  request: { query: SOMETHING_FOR_YOU_ITEMS },
  result: () => {
    fetches.count += 1;
    return { data: { somethingForYouItems: [] } };
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const refusedCreate = (sent: Record<string, unknown>[]): MockedResponse => ({
  request: { query: CREATE_SOMETHING_FOR_YOU, variables: () => true },
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return { errors: [new GraphQLError(REFUSAL)] };
  },
});

describe('SomethingForYouPage — a refused save', () => {
  it('keeps the dialog open with the server’s reason, does not refetch, and clears it on Cancel', async () => {
    const fetches = { count: 0 };
    const sent: Record<string, unknown>[] = [];
    renderWithProviders(<SomethingForYouPage />, { mocks: [listMock(fetches), refusedCreate(sent)] });

    await screen.findByText('No cards yet, so the section is hidden on Home.');
    fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Title/ }), { target: { value: 'Shop deals' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(REFUSAL)).toBeInTheDocument();
    expect(sent).toHaveLength(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(fetches.count).toBe(1);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    const reopened = await screen.findByRole('dialog');
    expect(within(reopened).queryByText(REFUSAL)).toBeNull();
  });
});
