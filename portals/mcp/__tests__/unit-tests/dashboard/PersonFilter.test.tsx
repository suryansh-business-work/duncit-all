import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MCP_PERSON_LOOKUP } from '../../../src/pages/dashboard/queries';
import { renderWithProviders } from '../../testkit';

const m = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifyError: m.error,
}));

import PersonFilter from '../../../src/pages/dashboard/PersonFilter';

const lookup = (email: string, rows: Array<{ id: string; user_id: string }>): MockedResponse => ({
  request: { query: MCP_PERSON_LOOKUP, variables: { email } },
  result: {
    data: {
      mcpToolCallsTable: {
        __typename: 'McpToolCallTablePage',
        rows: rows.map((row) => ({ __typename: 'McpToolCall', ...row })),
      },
    },
  },
});

const open = () => fireEvent.mouseDown(screen.getByRole('combobox'));
const pick = (name: string) => fireEvent.click(screen.getByRole('option', { name }));

afterEach(() => m.error.mockReset());

describe('PersonFilter', () => {
  it('offers everyone the window has calls from, but not the people without an email', () => {
    renderWithProviders(<PersonFilter emails={['asha@duncit.com', 'unknown', 'ravi@duncit.com']} value={null} onChange={vi.fn()} />);
    open();
    expect(screen.getByRole('option', { name: 'Everyone' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'asha@duncit.com' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ravi@duncit.com' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'unknown' })).not.toBeInTheDocument();
  });

  it('narrows to a person by the id behind their email', async () => {
    const onChange = vi.fn();
    renderWithProviders(<PersonFilter emails={['asha@duncit.com']} value={null} onChange={onChange} />, {
      mocks: [lookup('asha@duncit.com', [{ id: 'call-1', user_id: 'user-1' }])],
    });
    open();
    pick('asha@duncit.com');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ email: 'asha@duncit.com', userId: 'user-1' }));
    expect(m.error).not.toHaveBeenCalled();
  });

  it('says so, and keeps the filter as it was, when no call names that person any more', async () => {
    const onChange = vi.fn();
    renderWithProviders(<PersonFilter emails={['gone@duncit.com']} value={null} onChange={onChange} />, {
      mocks: [lookup('gone@duncit.com', [])],
    });
    open();
    pick('gone@duncit.com');
    await waitFor(() =>
      expect(m.error).toHaveBeenCalledWith('We could not find that person’s calls. Pick another or try again.'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports a failed lookup instead of filtering to nobody', async () => {
    const onChange = vi.fn();
    renderWithProviders(<PersonFilter emails={['asha@duncit.com']} value={null} onChange={onChange} />, {
      mocks: [{ request: { query: MCP_PERSON_LOOKUP, variables: { email: 'asha@duncit.com' } }, error: new Error('Failed to fetch') }],
    });
    open();
    pick('asha@duncit.com');
    await waitFor(() => expect(m.error).toHaveBeenCalledWith(expect.stringContaining('Unable to connect to server')));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('goes back to everyone without a lookup', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <PersonFilter emails={[]} value={{ email: 'asha@duncit.com', userId: 'user-1' }} onChange={onChange} />,
    );
    open();
    expect(screen.getByRole('option', { name: 'asha@duncit.com' })).toBeInTheDocument();
    pick('Everyone');
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
