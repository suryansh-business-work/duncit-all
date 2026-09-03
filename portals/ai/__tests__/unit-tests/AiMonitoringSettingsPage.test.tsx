import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import AiMonitoringSettingsPage from '../../src/pages/ai-monitoring/settings';
import {
  AI_MONITORING_SETTINGS,
  UPDATE_AI_MONITORING_SETTINGS,
  type AiMonitoringSettings,
} from '../../src/pages/ai-monitoring/queries';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/dialogs', async (io) => ({
  ...(await io<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

/**
 * AI Monitoring > Settings — the one place the notice and the check are
 * configured, for every surface the shared package renders on.
 *
 * The load-bearing part is the bullet list: it is one textarea here and a
 * string array on the server, so the page has to split it and drop the blank
 * lines a person inevitably leaves behind.
 */
const settings = (over: Partial<AiMonitoringSettings> = {}): AiMonitoringSettings =>
  ({
    __typename: 'AiMonitoringSettings',
    chip_enabled: true,
    chip_label: 'Checked by AI',
    dialog_title: 'How we check uploads',
    dialog_intro: 'Every image is reviewed before it goes live.',
    dialog_points: ['No faces of children', 'No contact details'],
    dialog_footnote: 'Ask support if something looks wrong.',
    dismiss_label: 'Got it',
    image_prompt: 'Describe anything unsafe in this image.',
    image_prompt_id: 'p-1',
    image_prompt_key: 'ai.image.scan',
    image_scan_model: 'gpt-4o-mini',
    ...over,
  }) as AiMonitoringSettings;

const loadMock = (over: Partial<AiMonitoringSettings> = {}): MockedResponse => ({
  request: { query: AI_MONITORING_SETTINGS },
  result: { data: { aiMonitoringSettings: settings(over) } },
  maxUsageCount: 5,
});

const saveMock = (points: string[], fail = false): MockedResponse => ({
  request: {
    query: UPDATE_AI_MONITORING_SETTINGS,
    variables: {
      input: {
        chip_enabled: true,
        chip_label: 'Checked by AI',
        dialog_title: 'How we check uploads',
        dialog_intro: 'Every image is reviewed before it goes live.',
        dialog_points: points,
        dialog_footnote: 'Ask support if something looks wrong.',
        dismiss_label: 'Got it',
        image_prompt: 'Describe anything unsafe in this image.',
      },
    },
  },
  ...(fail
    ? { error: new Error('not allowed') }
    : { result: { data: { updateAiMonitoringSettings: settings() } } }),
  maxUsageCount: 5,
});

const save = () => screen.getByRole('button', { name: 'Save settings' });

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('AiMonitoringSettingsPage', () => {
  it('loads the current wording into the form', async () => {
    renderWithProviders(<AiMonitoringSettingsPage />, { mocks: [loadMock()] });

    expect(screen.getByText('AI Monitoring Settings')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Checked by AI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('How we check uploads')).toBeInTheDocument();
    // The array arrives as one textarea, one bullet per line.
    expect((screen.getByLabelText(/Dialog bullets/i) as HTMLTextAreaElement).value).toBe(
      'No faces of children\nNo contact details',
    );
  });

  it('renders empty fields rather than "null" when nothing is configured yet', async () => {
    renderWithProviders(<AiMonitoringSettingsPage />, {
      mocks: [
        loadMock({
          chip_label: null,
          dialog_title: null,
          dialog_intro: null,
          dialog_footnote: null,
          dismiss_label: null,
          dialog_points: [],
        }),
      ],
    });

    // A fresh install has none of this copy; the boxes must be blank, not the
    // string "null".
    await waitFor(() => expect(screen.queryByDisplayValue('null')).not.toBeInTheDocument());
    expect(await screen.findByDisplayValue('Describe anything unsafe in this image.')).toBeInTheDocument();
  });

  it('splits the bullet textarea back into lines, dropping the blank ones', async () => {
    renderWithProviders(<AiMonitoringSettingsPage />, {
      mocks: [
        loadMock(),
        saveMock(['No faces of children', 'No weapons']),
      ],
    });

    await screen.findByDisplayValue('Checked by AI');
    const points = screen.getByLabelText(/Dialog bullets/i);
    // A person leaves blank lines and trailing spaces behind; the server must
    // not receive them as bullets.
    fireEvent.change(points, {
      target: { value: 'No faces of children\n\n   No weapons   \n\n' },
    });

    fireEvent.click(save());
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('AI Monitoring settings saved'));
  });

  it('reports a refused save instead of pretending it worked', async () => {
    renderWithProviders(<AiMonitoringSettingsPage />, {
      mocks: [
        loadMock(),
        saveMock(['No faces of children', 'No contact details'], true),
      ],
    });

    await screen.findByDisplayValue('Checked by AI');
    fireEvent.click(save());

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
