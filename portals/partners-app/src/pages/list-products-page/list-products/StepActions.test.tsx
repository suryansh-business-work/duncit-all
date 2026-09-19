import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import StepActions from './StepActions';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

interface Flags {
  isFirst?: boolean;
  isLast?: boolean;
  loading?: boolean;
  moderating?: boolean;
}

const renderActions = ({ isFirst = false, isLast = false, loading = false, moderating = false }: Flags = {}) => {
  const onBack = vi.fn();
  const onNext = vi.fn();
  renderWithProviders(
    <form>
      <StepActions
        isFirst={isFirst}
        isLast={isLast}
        loading={loading}
        moderating={moderating}
        submitLabel="Submit for approval"
        onBack={onBack}
        onNext={onNext}
      />
    </form>,
  );
  return { onBack, onNext };
};

describe('StepActions', () => {
  it('cannot go back from the first step but moves on with Next', () => {
    const { onBack, onNext } = renderActions({ isFirst: true });

    const back = screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement;
    expect(back.disabled).toBe(true);
    fireEvent.click(back);
    expect(onBack).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ai-monitoring-chip')).toBeNull();
  });

  it('goes back from a middle step', () => {
    const { onBack } = renderActions();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('swaps Next for the AI pill and the submit button on the last step', () => {
    renderActions({ isLast: true });

    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.getByTestId('ai-monitoring-chip')).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Submit for approval' });
    expect(submit.getAttribute('type')).toBe('submit');
    expect(screen.queryByTestId('ai-checking-indicator')).toBeNull();
  });

  it('shows the AI check running and locks Back while the listing saves', () => {
    renderActions({ isLast: true, loading: true, moderating: true });

    expect(screen.getByTestId('ai-checking-indicator')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
