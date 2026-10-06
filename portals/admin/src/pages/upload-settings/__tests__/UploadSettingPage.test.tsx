import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import { UPDATE_UPLOAD_SETTINGS, UPLOAD_SETTINGS, type UploadSettings } from '../queries';
import UploadSettingPage from '../UploadSettingPage';
import MobileUploadSettingPage from '../MobileUploadSettingPage';
import { makeSettings } from './fixtures';

/** Adds the `__typename`s MockedProvider expects on every object. */
const typed = (settings: UploadSettings) => ({
  __typename: 'UploadSetting',
  ...settings,
  crop_presets: settings.crop_presets.map((p) => ({ __typename: 'UploadCropPreset', ...p })),
});

const settingsMock = (fetches: { count: number }, surface = 'PORTALS'): MockedResponse => ({
  request: { query: UPLOAD_SETTINGS, variables: { surface } },
  result: () => {
    fetches.count += 1;
    return { data: { uploadSettings: typed(makeSettings({ surface: surface as UploadSettings['surface'] })) } };
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<UploadSettingPage surface="PORTALS" title="Portals uploads" subtitle="Rules for portals" />, {
    mocks,
  });

describe('UploadSettingPage', () => {
  it('shows the title, then the four accordions once the settings load', async () => {
    renderPage([settingsMock({ count: 0 })]);

    expect(screen.getByRole('heading', { name: 'Portals uploads' })).toBeInTheDocument();
    expect(screen.getByText('Rules for portals')).toBeInTheDocument();
    expect(await screen.findByText('Maximum upload sizes & formats')).toBeInTheDocument();
    expect(screen.getByText('Image crop resolution settings')).toBeInTheDocument();
    expect(screen.getByText('Compression (sharp images · FFmpeg videos)')).toBeInTheDocument();
    expect(screen.getByText('AI image monitoring')).toBeInTheDocument();
  });

  it('shows the load error instead of the accordions', async () => {
    renderPage([
      { request: { query: UPLOAD_SETTINGS, variables: { surface: 'PORTALS' } }, error: new Error('Settings unavailable') },
    ]);

    expect(await screen.findByText('Settings unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Maximum upload sizes & formats')).toBeNull();
  });

  it('saves a section for its surface, confirms with a toast and refetches', async () => {
    const fetches = { count: 0 };
    const sent: Record<string, unknown>[] = [];
    renderPage([
      settingsMock(fetches),
      {
        request: { query: UPDATE_UPLOAD_SETTINGS, variables: () => true },
        result: (variables: Record<string, unknown>) => {
          sent.push(variables);
          return { data: { updateUploadSettings: { ...typed(makeSettings()), updated_at: '2026-10-01T00:00:00.000Z' } } };
        },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Save sizes & formats' }));

    expect(await screen.findByText('Upload settings saved')).toBeInTheDocument();
    expect(sent).toEqual([
      {
        surface: 'PORTALS',
        input: {
          max_image_mb: 15,
          max_video_mb: 100,
          allowed_image_formats: ['jpg', 'png'],
          allowed_video_formats: ['mp4'],
        },
      },
    ]);
    await waitFor(() => expect(fetches.count).toBe(2));

    // The snackbar dismisses itself on Escape, like any MUI snackbar.
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Upload settings saved')).toBeNull());
  });

  it('shows the save error and no toast when the mutation fails', async () => {
    const fetches = { count: 0 };
    renderPage([
      settingsMock(fetches),
      {
        request: { query: UPDATE_UPLOAD_SETTINGS, variables: () => true },
        error: new Error('Not allowed to change upload settings'),
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'AI image monitoring' }));
    fireEvent.click(screen.getByRole('switch', { name: /Review every uploaded image with AI/ }));

    expect(await screen.findByText('Not allowed to change upload settings')).toBeInTheDocument();
    expect(screen.queryByText('Upload settings saved')).toBeNull();
    expect(fetches.count).toBe(1);
  });

  it('is mounted for its own surface by the per-surface pages', async () => {
    const fetches = { count: 0 };
    renderWithProviders(<MobileUploadSettingPage />, { mocks: [settingsMock(fetches, 'MOBILE')] });

    expect(screen.getByRole('heading', { name: 'Mobile App Upload Setting' })).toBeInTheDocument();
    expect(await screen.findByText('Maximum upload sizes & formats')).toBeInTheDocument();
    expect(fetches.count).toBe(1);
  });
});
