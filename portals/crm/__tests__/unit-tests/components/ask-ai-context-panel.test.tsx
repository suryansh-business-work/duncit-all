import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AskAiContextPanel from '@/components/ask-ai/AskAiContextPanel';
import type { AskAiContext } from '@/api/askAi.gql';

const context: AskAiContext = {
  total_tokens: 12345,
  total_chars: 49152,
  built_at: '2026-11-21T10:00:00.000Z',
  sources: [
    { key: 'profile', items: 1, chars: 2048, tokens: 512, truncated: false },
    { key: 'notes', items: 14, chars: 6000, tokens: 1500, truncated: true },
    { key: 'calls', items: 3, chars: 41104, tokens: 10333, truncated: false },
    { key: 'website', items: 0, chars: 0, tokens: 0, truncated: false },
    { key: 'conversation', items: 0, chars: 0, tokens: 0, truncated: false },
  ],
};

describe('AskAiContextPanel', () => {
  it('shows a building state until the first context arrives', () => {
    render(<AskAiContextPanel context={null} loading />);

    expect(screen.getByRole('status')).toHaveTextContent('Reading this lead’s history…');
  });

  it('renders nothing when there is no context and nothing loading', () => {
    const { container } = render(<AskAiContextPanel context={null} loading={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('summarises tokens, size and the sources that had data', () => {
    render(<AskAiContextPanel context={context} loading={false} />);

    expect(screen.getByText('What the assistant knows')).toBeInTheDocument();
    expect(screen.getByText(`${(12345).toLocaleString()} tokens · 48.0 KB from 3 sources`)).toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('lists every source with its count and tokens, and flags trimmed ones', () => {
    render(<AskAiContextPanel context={context} loading={false} />);

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    const notes = within(screen.getByTestId('crm-ask-ai-source-notes'));
    expect(notes.getByText('Notes')).toBeInTheDocument();
    expect(notes.getByText(`14 items · ${(1500).toLocaleString()} tokens`)).toBeInTheDocument();
    expect(notes.getByText('Trimmed')).toBeInTheDocument();
    const calls = within(screen.getByTestId('crm-ask-ai-source-calls'));
    expect(calls.getByText('Calls and transcripts')).toBeInTheDocument();
    expect(calls.queryByText('Trimmed')).toBeNull();
    expect(within(screen.getByTestId('crm-ask-ai-source-website')).getByText('Website pages')).toBeInTheDocument();
    expect(within(screen.getByTestId('crm-ask-ai-source-conversation')).getByText('This conversation')).toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
  });

  it('shows the raw key for a source this build does not know yet', () => {
    render(<AskAiContextPanel context={{ ...context, sources: [{ key: 'invoices', items: 2, chars: 10, tokens: 3, truncated: false }] }} loading={false} />);

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByText('invoices')).toBeInTheDocument();
  });
});
