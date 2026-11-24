import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import AskDuncitHeader from '../AskDuncitHeader';
import { EmptyState } from '../Suggestions';

const noop = () => undefined;

describe('AskDuncitHeader', () => {
  it('marks the assistant as an experimental Beta and says what that means', () => {
    render(<AskDuncitHeader roleKey="MEMBER" showHistory={false} canHandOver={false} onHistory={noop} onNew={noop} onHandOver={noop} />);
    const beta = screen.getByTestId('ask-duncit-beta');
    expect(beta).toHaveTextContent('Beta');
    expect(beta).toHaveAttribute('title', expect.stringMatching(/experimental/i));
    expect(screen.getByTestId('ask-duncit-role')).toHaveTextContent('Member');
  });

  it('still starts a new chat from the header', () => {
    const onNew = vi.fn();
    render(<AskDuncitHeader roleKey={null} showHistory={false} canHandOver={false} onHistory={noop} onNew={onNew} onHandOver={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ask-duncit-role')).toBeNull();
  });
});

describe('EmptyState', () => {
  it('tells the person answers can be wrong, under the greeting', () => {
    render(<EmptyState />);
    expect(screen.getByTestId('ask-duncit-beta-hint')).toHaveTextContent(/answers can be wrong/i);
  });
});
