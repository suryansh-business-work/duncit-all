/**
 * A fenced code block: the small four-token highlighter, the language label,
 * and the copy button's own "Copied" flash.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CodeBlock from '../src/staff-chat/CodeBlock';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('CodeBlock', () => {
  it('names the language when it was given', () => {
    const { container } = render(<CodeBlock code="const x = 1;" language="ts" />);

    expect(container.textContent).toContain('ts');
  });

  it('labels itself generically when no language came with the fence', () => {
    const { container } = render(<CodeBlock code="const x = 1;" />);

    expect(container.textContent).toContain('code');
  });

  it('colours comments, strings, numbers and keywords, leaving the rest plain', () => {
    const { container } = render(
      <CodeBlock code={"// a note\nconst total = 42;\nconst name = 'Asha';"} language="ts" />
    );

    const spans = [...container.querySelectorAll('code span')].map((s) => s.textContent);
    expect(spans).toContain('// a note');
    expect(spans).toContain('const');
    expect(spans).toContain('42');
    expect(spans).toContain("'Asha'");
  });

  it('copies the code, and flashes Copied before reverting', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { container } = render(<CodeBlock code="const x = 1;" language="ts" />);

    await act(async () => {
      fireEvent.click(container.querySelector('button') as HTMLElement);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('const x = 1;');
    expect(container.querySelector('svg[data-testid="CheckIcon"]')).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1400);
    });

    expect(container.querySelector('svg[data-testid="ContentCopyIcon"]')).not.toBeNull();
  });

  it('does nothing when copying without a clipboard API at all', () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: undefined });
    const { container } = render(<CodeBlock code="const x = 1;" />);

    expect(() => {
      fireEvent.click(container.querySelector('button') as HTMLElement);
    }).not.toThrow();
  });

  it('swallows a clipboard that refuses, without flashing Copied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('no permission'));
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { container } = render(<CodeBlock code="const x = 1;" />);

    await act(async () => {
      fireEvent.click(container.querySelector('button') as HTMLElement);
      await Promise.resolve();
    });

    expect(container.querySelector('svg[data-testid="ContentCopyIcon"]')).not.toBeNull();
  });
});
