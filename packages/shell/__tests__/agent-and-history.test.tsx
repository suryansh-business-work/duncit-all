/**
 * The Agent's run results, and a staff message's edit history.
 *
 * Both exist for the same reason: a screen that only shows the current state
 * hides the thing an operator or a reader actually needs — which of ten items
 * failed and why, or what a message used to say before it was walked back.
 */
import { describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, render, screen } from '@testing-library/react';

import { AgentResults } from '../src/chrome/agent/AgentResults';
import type { AgentResultItem } from '../src/chrome/agent/queries';
import EditHistoryDialog from '../src/staff-chat/EditHistoryDialog';
import { STAFF_MESSAGE_EDITS } from '../src/staff-chat/queries';
import type { ChatFormats } from '../src/staff-chat/useChatSettings';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const item = (over: Partial<AgentResultItem> = {}): AgentResultItem => ({
  kind: 'pod',
  ok: true,
  id: 'p1',
  ref: 'DUN-POD-4821',
  title: 'Sunday Badminton',
  detail: 'Created',
  when: '2026-08-30T12:30:00.000Z',
  ...over,
});

const wrap = (ui: React.ReactNode) => render(<MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>{ui}</MockedProvider>);

describe('AgentResults', () => {
  it('renders nothing when the run made nothing at all', () => {
    const { container } = wrap(<AgentResults items={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('lists each item made, with its reference', () => {
    wrap(<AgentResults items={[item()]} />);

    expect(screen.getByText('Sunday Badminton')).toBeInTheDocument();
    expect(screen.getByText('DUN-POD-4821')).toBeInTheDocument();
  });

  // A batch that made seven of ten has to show which three did not and why —
  // that reason is the only thing that tells the operator what to fix.
  it('names an item that failed and why, distinctly from the ones that worked', () => {
    wrap(
      <AgentResults
        items={[item(), item({ id: 'p2', title: 'Broken Pod', ok: false, ref: null, detail: 'Venue not found' })]}
      />
    );

    expect(screen.getByText('Not created')).toBeInTheDocument();
    expect(screen.getByText(/Venue not found/)).toBeInTheDocument();
  });

  it('renders an item with no reference and no timestamp', () => {
    wrap(<AgentResults items={[item({ ref: null, when: null })]} />);

    expect(screen.getByText('Created')).toBeInTheDocument();
  });
});

describe('EditHistoryDialog', () => {
  const formats: ChatFormats = {
    time: { format: (d: Date) => d.toISOString().slice(11, 16) } as never,
    full: { format: (d: Date) => `full:${d.toISOString()}` } as never,
    day: { format: (d: Date) => d.toISOString().slice(0, 10) } as never,
  };

  const editsMock = (
    edits: readonly { text: string; at: string }[],
    over: Partial<MockedResponse> = {},
  ): MockedResponse =>
    ({
      request: { query: STAFF_MESSAGE_EDITS, variables: { id: 'm1' } },
      result: { data: { staffMessageEdits: edits.map((e) => ({ __typename: 'StaffMessageEdit', ...e })) } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const dialog = (mocks: readonly MockedResponse[], props: Record<string, unknown> = {}) => {
    const onClose = vi.fn();
    const view = render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
        <EditHistoryDialog
          open
          messageId="m1"
          current="Final wording"
          formats={formats}
          onClose={onClose}
          {...props}
        />
      </MockedProvider>
    );
    return { onClose, ...view };
  };

  it('waits on the history rather than showing an empty dialog', () => {
    dialog([editsMock([])]);

    expect(document.body.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  // The version they are looking at is last and labelled — a list of only the
  // old ones makes you guess which is which.
  it('lists the earlier wordings, with the current one last and named', async () => {
    dialog([editsMock([{ text: 'First draft', at: '2026-08-30T10:00:00.000Z' }])]);
    await settle();

    expect(screen.getByText('First draft')).toBeInTheDocument();
    expect(screen.getByText('Final wording')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('full:2026-08-30T10:00:00.000Z')).toBeInTheDocument();
  });

  it('names an entry with no timestamp generically', async () => {
    dialog([editsMock([{ text: 'First draft', at: '' }])]);
    await settle();

    expect(screen.getByText('Earlier')).toBeInTheDocument();
  });

  it('says there is no earlier version rather than an empty list', async () => {
    dialog([editsMock([])]);
    await settle();

    expect(screen.getByText('No earlier version was recorded.')).toBeInTheDocument();
  });

  it('states the reason when the history could not be read', async () => {
    dialog([editsMock([], { result: undefined, error: new Error('offline') })]);
    await settle();

    expect(screen.getByText('offline')).toBeInTheDocument();
  });

  it('asks for nothing while it is closed', () => {
    const asked = vi.fn();
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }}
        mocks={[
          {
            request: { query: STAFF_MESSAGE_EDITS, variables: { id: 'm1' } },
            result: () => {
              asked();
              return { data: { staffMessageEdits: [] } };
            },
          },
        ]}
      >
        <EditHistoryDialog
          open={false}
          messageId="m1"
          current="Final wording"
          formats={formats}
          onClose={vi.fn()}
        />
      </MockedProvider>
    );

    expect(asked).not.toHaveBeenCalled();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes through the caller', async () => {
    const { onClose } = dialog([editsMock([])]);
    await settle();

    screen.getByRole('button', { name: 'Close' }).click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

