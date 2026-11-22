import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import ThemePanel from '@/pages/email-templates/settings/ThemePanel';
import ThemePreview from '@/pages/email-templates/settings/ThemePreview';
import { RENDER_CRM_EMAIL_THEME_PREVIEW, UPDATE_CRM_EMAIL_THEME } from '@/api/emailSettings.gql';
import { themeToForm } from '@/forms/email-theme';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { savedTheme, settingsDoc, settingsMock, themePreviewMock } from './settingsFixtures';

const { notifySuccess } = vi.hoisted(() => ({ notifySuccess: vi.fn() }));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess,
}));

/** The preview renders on a 450 ms debounce. */
const PREVIEW_WAIT = { timeout: 3000 };
const valid = themeToForm(savedTheme);

/** A preview mock that records the variables of every render it answers. */
const recordingPreview = (html = '<p>Themed starter</p>') => {
  const answer = vi.fn(() => ({ data: { renderCrmEmailThemePreview: { html, errors: [] as string[] } } }));
  const mock: MockedResponse = { request: { query: RENDER_CRM_EMAIL_THEME_PREVIEW, variables: () => true }, result: answer, maxUsageCount: 20 };
  return { mock, answer };
};

const iframe = () => screen.getByTitle('Live preview');
const save = () => screen.getByTestId('email-theme-save');

beforeEach(() => {
  notifySuccess.mockClear();
});

describe('ThemePanel', () => {
  it('previews a real email under the saved theme beside the form', async () => {
    const preview = recordingPreview();
    renderWithApollo(<ThemePanel settings={settingsDoc()} />, [settingsMock(), preview.mock]);

    expect(screen.getByText(/The theme is applied when an email is rendered/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live preview' })).toBeInTheDocument();
    await waitFor(() => expect(iframe()).toHaveAttribute('srcdoc', '<p>Themed starter</p>'), PREVIEW_WAIT);
    expect(preview.answer).toHaveBeenLastCalledWith({ theme: valid });
  });

  it('re-renders the preview as a colour changes, before anything is saved', async () => {
    const preview = recordingPreview();
    renderWithApollo(<ThemePanel settings={settingsDoc()} />, [settingsMock(), preview.mock]);
    await waitFor(() => expect(preview.answer).toHaveBeenCalled(), PREVIEW_WAIT);

    fireEvent.change(screen.getByTestId('theme-primary_color'), { target: { value: '#0A7D4F' } });

    await waitFor(() => expect(preview.answer).toHaveBeenLastCalledWith({ theme: { ...valid, primary_color: '#0A7D4F' } }), PREVIEW_WAIT);
  });

  it('saves every field of the edited theme and confirms it', async () => {
    const stored = { ...savedTheme, primary_color: '#123456' };
    const update = vi.fn(() => ({ data: { updateCrmEmailTheme: settingsDoc({ theme: stored }) } }));
    renderWithApollo(<ThemePanel settings={settingsDoc()} />, [
      themePreviewMock(),
      { request: { query: UPDATE_CRM_EMAIL_THEME, variables: () => true }, result: update },
      settingsMock(settingsDoc({ theme: stored })),
    ]);

    fireEvent.change(screen.getByTestId('theme-primary_color'), { target: { value: '#123456' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());

    await waitFor(() => expect(update).toHaveBeenCalledWith({ input: { ...valid, primary_color: '#123456' } }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Theme saved. CRM emails now use it.'));
  });

  it('shows why a save failed and keeps the edit', async () => {
    renderWithApollo(<ThemePanel settings={settingsDoc()} />, [
      themePreviewMock(),
      { request: { query: UPDATE_CRM_EMAIL_THEME, variables: () => true }, error: new Error('Theme store unavailable') },
    ]);

    fireEvent.change(screen.getByTestId('theme-card_color'), { target: { value: '#FAFAFA' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());

    expect(await screen.findByText('Theme store unavailable')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId('theme-card_color')).toHaveValue('#FAFAFA');
    expect(save()).toBeEnabled();
  });
});

describe('ThemePreview', () => {
  it('asks the server for nothing until there is a valid theme', async () => {
    const preview = recordingPreview();
    renderWithApollo(<ThemePreview theme={null} />, [preview.mock]);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
    });
    expect(preview.answer).not.toHaveBeenCalled();
    expect(iframe()).toHaveAttribute('srcdoc', '');
  });

  it('renders once typing pauses, for the latest theme only', async () => {
    const preview = recordingPreview('<p>Latest</p>');
    // Apollo goes in as the wrapper so rerender keeps it around the preview.
    const { rerender } = render(<ThemePreview theme={valid} />, {
      wrapper: ({ children }) => (
        <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[preview.mock]}>
          {children}
        </MockedProvider>
      ),
    });

    const latest = { ...valid, accent_color: '#00AAFF' };
    rerender(<ThemePreview theme={{ ...valid, accent_color: '#0000FF' }} />);
    rerender(<ThemePreview theme={latest} />);

    await waitFor(() => expect(iframe()).toHaveAttribute('srcdoc', '<p>Latest</p>'), PREVIEW_WAIT);
    expect(preview.answer).toHaveBeenCalledTimes(1);
    expect(preview.answer).toHaveBeenCalledWith({ theme: latest });
  });

  it('shows the first MJML error the server reports', async () => {
    renderWithApollo(<ThemePreview theme={valid} />, [themePreviewMock({ html: '<p>Partial</p>', errors: ['Invalid colour in mj-button', 'Second'] })]);

    expect(await screen.findByText('Invalid colour in mj-button', {}, PREVIEW_WAIT)).toBeInTheDocument();
    expect(screen.queryByText('Second')).toBeNull();
    expect(iframe()).toHaveAttribute('srcdoc', '<p>Partial</p>');
  });

  it('reports a render that could not reach the server', async () => {
    renderWithApollo(<ThemePreview theme={valid} />, [themePreviewMock(new Error('Renderer offline'))]);

    expect(await screen.findByText('Renderer offline', {}, PREVIEW_WAIT)).toBeInTheDocument();
  });

  it('switches between desktop and phone widths in a sandboxed frame', () => {
    renderWithApollo(<ThemePreview theme={null} />, []);

    expect(iframe()).toHaveAttribute('sandbox', '');
    expect(screen.getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'true');
    expect(iframe()).toHaveStyle({ width: '640px' });

    fireEvent.click(screen.getByRole('button', { name: 'Phone' }));
    expect(screen.getByRole('button', { name: 'Phone' })).toHaveAttribute('aria-pressed', 'true');
    expect(iframe()).toHaveStyle({ width: '375px' });

    // Pressing the selected width again keeps it rather than clearing the choice.
    fireEvent.click(screen.getByRole('button', { name: 'Phone' }));
    expect(screen.getByRole('button', { name: 'Phone' })).toHaveAttribute('aria-pressed', 'true');
  });
});
