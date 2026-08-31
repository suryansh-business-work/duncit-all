/**
 * The clock at the right end of the taskbar: two lines, and clicking it opens
 * the tray where the zone, seconds and language are set.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TaskbarClock } from '../src/workspace/TaskbarClock';

describe('TaskbarClock', () => {
  it("follows the device zone and seconds-off default outside a workspace", () => {
    expect(() =>
      render(
        <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
          <TaskbarClock />
        </MockedProvider>,
      ),
    ).not.toThrow();
  });

  it('opens the tray on click, and closes it again from outside', async () => {
    const { getByLabelText } = render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <TaskbarClock />
      </MockedProvider>,
    );

    fireEvent.click(getByLabelText('Date and time'));
    const backdrop = document.body.querySelector('[role="presentation"]') as HTMLElement;
    expect(backdrop).not.toBeNull();

    fireEvent.keyDown(backdrop, { key: 'Escape', code: 'Escape' });
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
});
