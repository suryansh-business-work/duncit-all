import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import EmailTemplateSettingsPage from '@/pages/email-templates/settings';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { SYSTEM_PROMPT, USER_PROMPT, promptsMock, settingsMock, themePreviewMock } from './settingsFixtures';

const renderPage = (mocks: MockedResponse[], route = '/email-templates/settings') =>
  renderWithApollo(<EmailTemplateSettingsPage />, mocks, { route });

const tab = (name: string) => screen.getByRole('tab', { name });

describe('EmailTemplateSettingsPage', () => {
  it('opens on Logos & Images and shows the brand library once settings load', async () => {
    renderPage([settingsMock()]);

    expect(screen.getByRole('heading', { level: 1, name: 'Email settings' })).toBeInTheDocument();
    expect(screen.getByText('The brand images, theme and AI instructions every CRM email uses.')).toBeInTheDocument();
    expect(tab('Logos & Images')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Theme Configuration')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('progressbar', { name: 'Loading email settings' })).toBeInTheDocument();

    expect(await screen.findByRole('img', { name: 'Acme wordmark' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Banners' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('opens the section the URL names', async () => {
    renderPage([settingsMock(), themePreviewMock()], '/email-templates/settings?tab=theme');

    expect(tab('Theme Configuration')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Save theme' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live preview' })).toBeInTheDocument();
  });

  it('falls back to Logos & Images for a section it does not know', async () => {
    renderPage([settingsMock()], '/email-templates/settings?tab=billing');

    expect(tab('Logos & Images')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Logos' })).toBeInTheDocument();
  });

  it('switches section by writing it to the URL', async () => {
    renderPage([settingsMock(), promptsMock([SYSTEM_PROMPT, USER_PROMPT])]);
    await screen.findByRole('img', { name: 'Acme wordmark' });

    fireEvent.click(tab('Prompt Injection'));

    expect(screen.getByTestId('location')).toHaveTextContent('/email-templates/settings?tab=prompts');
    expect(await screen.findByRole('heading', { name: 'Instructions for the AI' })).toBeInTheDocument();
    expect(tab('Prompt Injection')).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the prompts even when the brand settings fail to load', async () => {
    renderPage([settingsMock(new Error('Settings store offline')), promptsMock([SYSTEM_PROMPT])], '/email-templates/settings?tab=prompts');

    expect(await screen.findByRole('heading', { name: 'Instructions for the AI' })).toBeInTheDocument();
    expect(screen.queryByText('Settings store offline')).toBeNull();
  });

  it('reports settings that failed to load and loads them again on retry', async () => {
    renderPage([settingsMock(new Error('Settings store offline'), 1), settingsMock()]);

    expect(await screen.findByText('Settings store offline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('img', { name: 'Acme wordmark' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Settings store offline')).toBeNull());
  });

  it('goes back to the templates list', () => {
    renderPage([settingsMock()]);

    fireEvent.click(screen.getByRole('button', { name: 'Back to templates' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/email-templates$/);
  });
});
