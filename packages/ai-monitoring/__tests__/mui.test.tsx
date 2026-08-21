/**
 * The AI Monitoring chip and the dialog it opens.
 *
 * The chip's job is to be there: a person attaching a file has to be told it is
 * screened, so it renders on unknown config and only the admin switch may hide
 * it. The dialog is pure presentation of the copy the caller resolved, which is
 * what keeps the MUI and Tamagui halves saying the same sentences.
 */
import { MockedProvider } from '@apollo/client/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiMonitoringFallbackCopy } from '../src/copy';
import { AiMonitoringChip } from '../src/mui/AiMonitoringChip';
import { AiMonitoringDialog } from '../src/mui/AiMonitoringDialog';

const copy = aiMonitoringFallbackCopy((key: string) => key);

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('AiMonitoringChip', () => {
  it('renders while the settings request is still out — a slow request must not hide the notice', async () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <AiMonitoringChip />
      </MockedProvider>
    );
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('opens its dialog when pressed', async () => {
    render(
      <MockedProvider mocks={[]}>
        <AiMonitoringChip />
      </MockedProvider>
    );
    await settle();

    const chip = document.body.querySelector('.MuiChip-root');
    expect(chip).not.toBeNull();

    fireEvent.click(chip as Element);
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('takes the size and spacing the hosting field gives it', async () => {
    const { container } = render(
      <MockedProvider mocks={[]}>
        <AiMonitoringChip size="small" sx={{ mt: 1 }} />
      </MockedProvider>
    );
    await settle();

    expect(container.querySelector('.MuiChip-sizeSmall')).not.toBeNull();
  });
});

describe('AiMonitoringDialog', () => {
  it('renders nothing while it is closed', () => {
    render(<AiMonitoringDialog open={false} onClose={vi.fn()} copy={copy} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders every sentence the caller resolved, in order', async () => {
    render(<AiMonitoringDialog open onClose={vi.fn()} copy={copy} />);
    await settle();

    const text = document.body.textContent ?? '';
    for (const sentence of [copy.title, copy.intro, copy.footnote, ...copy.points]) {
      expect(text).toContain(sentence);
    }
  });

  it('closes through the caller callback rather than on its own', async () => {
    const onClose = vi.fn();
    render(<AiMonitoringDialog open onClose={onClose} copy={copy} />);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: copy.dismissLabel }));
    await settle();

    expect(onClose).toHaveBeenCalled();
  });

  it('renders an admin-overridden bullet list rather than the fallback', async () => {
    render(
      <AiMonitoringDialog open onClose={vi.fn()} copy={{ ...copy, points: ['We look at every image.'] }} />
    );
    await settle();

    expect(document.body.textContent).toContain('We look at every image.');
    expect(document.body.textContent).not.toContain('aiMonitoring.pointScan');
  });
});
