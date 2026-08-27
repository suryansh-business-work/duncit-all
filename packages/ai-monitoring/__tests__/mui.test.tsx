/**
 * The AI Monitoring chip and the dialog it opens.
 *
 * The chip's job is to be there: a person attaching a file has to be told it is
 * screened, so it renders on unknown config and only the admin switch may hide
 * it. The dialog is pure presentation of the copy the caller resolved, which is
 * what keeps the MUI and Tamagui halves saying the same sentences.
 */
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiMonitoringFallbackCopy } from '../src/copy';
import { AiMonitoringChip } from '../src/mui/AiMonitoringChip';
import { AiMonitoringDialog } from '../src/mui/AiMonitoringDialog';
import { AI_MONITORING_CONFIG } from '../src/mui/useAiMonitoringConfig';
import { AI_MONITORING_FALLBACK_FLAT } from '../src/mui/useTranslation';

const copy = aiMonitoringFallbackCopy((key: string) => key);

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

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
        <ThemeProvider theme={testTheme}>
        <AiMonitoringChip />
        </ThemeProvider>
      </MockedProvider>
    );
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('opens its dialog when pressed', async () => {
    render(
      <MockedProvider mocks={[]}>
        <ThemeProvider theme={testTheme}>
        <AiMonitoringChip />
        </ThemeProvider>
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
        <ThemeProvider theme={testTheme}>
        <AiMonitoringChip size="small" sx={{ mt: 1 }} />
        </ThemeProvider>
      </MockedProvider>
    );
    await settle();

    expect(container.querySelector('.MuiChip-sizeSmall')).not.toBeNull();
  });

  it('renders nothing once the admin switch arrives turned off', async () => {
    const disabledConfigMock = {
      request: { query: AI_MONITORING_CONFIG },
      result: {
        data: {
          aiMonitoringConfig: {
            __typename: 'AiMonitoringConfig',
            chip_enabled: false,
            chip_label: null,
            dialog_title: null,
            dialog_intro: null,
            dialog_points: [],
            dialog_footnote: null,
            dismiss_label: null,
          },
        },
      },
    };
    const { container } = render(
      <MockedProvider mocks={[disabledConfigMock]}>
        <ThemeProvider theme={testTheme}>
        <AiMonitoringChip />
        </ThemeProvider>
      </MockedProvider>
    );
    await settle();

    expect(container.innerHTML).toBe('');
  });

  it('closes its dialog again through the dismiss button', async () => {
    render(
      <MockedProvider mocks={[]}>
        <ThemeProvider theme={testTheme}>
        <AiMonitoringChip />
        </ThemeProvider>
      </MockedProvider>
    );
    await settle();

    fireEvent.click(document.body.querySelector('.MuiChip-root') as Element);
    await settle();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    // The dismiss label is the fallback bundle's copy, because no admin
    // override is mocked — the same string the reader would see offline.
    fireEvent.click(
      screen.getByRole('button', { name: AI_MONITORING_FALLBACK_FLAT['aiMonitoring.dismiss'] })
    );

    // MUI unmounts the dialog only after its exit transition.
    await waitFor(() => {
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    }, { timeout: 3000 });
  });
});

describe('AiMonitoringDialog', () => {
  it('renders nothing while it is closed', () => {
    render(<ThemeProvider theme={testTheme}><AiMonitoringDialog open={false} onClose={vi.fn()} copy={copy} /></ThemeProvider>);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders every sentence the caller resolved, in order', async () => {
    render(<ThemeProvider theme={testTheme}><AiMonitoringDialog open onClose={vi.fn()} copy={copy} /></ThemeProvider>);
    await settle();

    const text = document.body.textContent ?? '';
    for (const sentence of [copy.title, copy.intro, copy.footnote, ...copy.points]) {
      expect(text).toContain(sentence);
    }
  });

  it('closes through the caller callback rather than on its own', async () => {
    const onClose = vi.fn();
    render(<ThemeProvider theme={testTheme}><AiMonitoringDialog open onClose={onClose} copy={copy} /></ThemeProvider>);
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
