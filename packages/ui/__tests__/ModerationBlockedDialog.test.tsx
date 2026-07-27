import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationBlockedDialog, type BlockedViolation } from '../src/ModerationBlockedDialog';

const VIOLATIONS: BlockedViolation[] = [
  { id: 'v1', message: 'Title contains banned words', type: 'PROFANITY', stepIndex: 0, stepTitle: 'Basics' },
  { id: 'v2', message: 'Cover image was rejected', type: 'IMAGE', stepIndex: 2, stepTitle: 'Media' },
];

describe('ModerationBlockedDialog', () => {
  it('stays closed when there is nothing to fix', () => {
    render(<ModerationBlockedDialog violations={[]} onJump={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('moderation-blocked-dialog')).not.toBeInTheDocument();
  });

  it('opens with the default title and description and lists every violation', () => {
    render(<ModerationBlockedDialog violations={VIOLATIONS} onJump={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('moderation-blocked-dialog')).toBeInTheDocument();
    expect(screen.getByText('Fix these before publishing')).toBeInTheDocument();
    expect(
      screen.getByText(/found content that breaks the community guidelines/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Title contains banned words')).toBeInTheDocument();
    expect(screen.getByText('Cover image was rejected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fix in basics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fix in media/i })).toBeInTheDocument();
  });

  it('accepts a custom title and description', () => {
    render(
      <ModerationBlockedDialog
        violations={VIOLATIONS}
        onJump={vi.fn()}
        onClose={vi.fn()}
        title="Product blocked"
        description="Sort these out and resubmit."
      />,
    );
    expect(screen.getByText('Product blocked')).toBeInTheDocument();
    expect(screen.getByText('Sort these out and resubmit.')).toBeInTheDocument();
    expect(screen.queryByText('Fix these before publishing')).not.toBeInTheDocument();
  });

  it('jumps to the step the clicked violation lives on', async () => {
    const onJump = vi.fn();
    render(<ModerationBlockedDialog violations={VIOLATIONS} onJump={onJump} onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId('moderation-fix-v2'));
    expect(onJump).toHaveBeenCalledWith(2);
  });

  it('closes from the Close button', async () => {
    const onClose = vi.fn();
    render(<ModerationBlockedDialog violations={VIOLATIONS} onJump={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('moderation-blocked-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<ModerationBlockedDialog violations={VIOLATIONS} onJump={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
