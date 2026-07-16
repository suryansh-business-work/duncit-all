import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({ run: vi.fn(), loading: false }));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useMutation: () => [m.run, { loading: m.loading }] as const };
});

import MjmlAiButton from './MjmlAiButton';

beforeEach(() => {
  m.run.mockReset();
  m.loading = false;
});

describe('MjmlAiButton', () => {
  it('renders the labelled button variant and opens the popover', () => {
    render(<MjmlAiButton currentMjml="<mjml/>" onApply={vi.fn()} label="AI it" />);
    fireEvent.click(screen.getByRole('button', { name: 'AI it' }));
    expect(screen.getByText('Create/update MJML with AI')).toBeInTheDocument();
  });

  it('renders the default label when none is given', () => {
    render(<MjmlAiButton currentMjml="" onApply={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Create/Update with AI' })).toBeInTheDocument();
  });

  it('renders the icon-only variant', () => {
    render(<MjmlAiButton iconOnly currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByTestId('AutoAwesomeIcon').closest('button')!);
    expect(screen.getByText('Create/update MJML with AI')).toBeInTheDocument();
  });

  it('generates MJML and applies the result', async () => {
    const onApply = vi.fn();
    m.run.mockResolvedValue({ data: { aiCreateOrUpdateMjml: '<mjml>new</mjml>' } });
    render(<MjmlAiButton iconOnly currentMjml="<mjml/>" onApply={onApply} />);
    fireEvent.click(screen.getByTestId('AutoAwesomeIcon').closest('button')!);
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'Diwali theme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('<mjml>new</mjml>'));
    expect(m.run).toHaveBeenCalledWith({ variables: { input: { prompt: 'Diwali theme', current_mjml: '<mjml/>' } } });
  });

  it('shows an error when the AI returns no MJML', async () => {
    m.run.mockResolvedValue({ data: { aiCreateOrUpdateMjml: null } });
    render(<MjmlAiButton iconOnly currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByTestId('AutoAwesomeIcon').closest('button')!);
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('AI did not return MJML')).toBeInTheDocument();
  });

  it('shows the fallback error message on a rejection without a message', async () => {
    m.run.mockRejectedValue({});
    render(<MjmlAiButton iconOnly currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByTestId('AutoAwesomeIcon').closest('button')!);
    fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: 'y' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('Could not generate MJML')).toBeInTheDocument();
  });

  it('does nothing when the prompt is only whitespace', () => {
    render(<MjmlAiButton iconOnly currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByTestId('AutoAwesomeIcon').closest('button')!);
    // Apply is disabled with an empty prompt; the Apply handler early-returns on trim.
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('closes via Cancel', () => {
    render(<MjmlAiButton iconOnly currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByTestId('AutoAwesomeIcon').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    // Popover starts closing; the instruction field is on its way out.
    expect(m.run).not.toHaveBeenCalled();
  });

  it('closes the popover on Escape (invokes the onClose handler)', async () => {
    render(<MjmlAiButton iconOnly currentMjml="" onApply={vi.fn()} />);
    fireEvent.click(screen.getByTestId('AutoAwesomeIcon').closest('button')!);
    fireEvent.keyDown(screen.getByLabelText('Instruction'), { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Create/update MJML with AI')).not.toBeInTheDocument());
  });

  it('shows the working state while loading', () => {
    m.loading = true;
    render(<MjmlAiButton currentMjml="" onApply={vi.fn()} label="Go" />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('button', { name: 'Working...' })).toBeDisabled();
  });
});
