import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { ReelExportForm, buildReelExportSchema, exportDefaults, toRenderOptions, type ReelExportFormValues } from '../../src/forms/reel-export';
import { codecOptions } from '../../src/forms/reel-export/reel-export.options';
import { useExportOptions } from '../../src/pages/reels/studio/export/useExportOptions';
import type { ReelExport } from '../../src/pages/reels/studio/export/useReelExport';
import type { ReelSpec } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';

const t = (key: string) => key;
const values = (over: Partial<ReelExportFormValues> = {}): ReelExportFormValues => ({ ...exportDefaults(12), ...over });

describe('the export options schema', () => {
  const schema = buildReelExportSchema(t, 12);

  it('accepts the defaults: H.264 in an MP4, high quality, the whole reel with sound', () => {
    expect(schema.safeParse(exportDefaults(12)).success).toBe(true);
  });

  it('refuses a codec the file type cannot carry, a stretch that ends before it starts, and a silent sound file', () => {
    const issues = (input: ReelExportFormValues) => (schema.safeParse(input).error?.issues ?? []).map((issue) => `${issue.path.join('.')}:${issue.message}`);
    expect(issues(values({ container: 'webm', video_codec: 'h264' }))).toEqual(['video_codec:ai.reels.exportOptions.codecMismatch']);
    expect(issues(values({ from_s: 6, to_s: 6 }))).toEqual(['to_s:ai.reels.exportOptions.rangeOrder']);
    expect(issues(values({ container: 'mp3', muted: true }))).toEqual(['muted:ai.reels.exportOptions.audioMuted']);
    // A sound-only file carries no video, so any codec left in the form is irrelevant.
    expect(issues(values({ container: 'wav', video_codec: 'vp8' }))).toEqual([]);
  });

  it('keeps the stretch inside the reel and the keyframe gap between 1 and 10 seconds', () => {
    expect(schema.safeParse(values({ to_s: 13 })).success).toBe(false);
    expect(schema.safeParse(values({ keyframe_s: 0 })).success).toBe(false);
    expect(schema.safeParse(values({ keyframe_s: 11 })).success).toBe(false);
  });

  it('lists only the codecs each file type can carry', () => {
    expect(codecOptions(t, 'mov').map((option) => option.value)).toEqual(['h264', 'h265']);
    expect(codecOptions(t, 'webm').map((option) => option.value)).toEqual(['vp9', 'vp8', 'av1']);
    expect(codecOptions(t, 'mp3')).toEqual([]);
  });
});

describe('toRenderOptions', () => {
  it('renders the whole reel with no frame range, and the sound codec that goes with the file', () => {
    expect(toRenderOptions(exportDefaults(12), 30, 360)).toEqual({
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      videoBitrate: 'high',
      audioBitrate: 'high',
      muted: false,
      scale: 1,
      hardwareAcceleration: 'no-preference',
      keyframeIntervalInSeconds: 5,
      frameRange: null,
      mimeType: 'video/mp4',
    });
  });

  it('turns a stretch into the frames it covers, and a silent or sound-only file into the right codecs', () => {
    expect(toRenderOptions(values({ from_s: 1, to_s: 2.5 }), 30, 360).frameRange).toEqual([30, 74]);
    expect(toRenderOptions(values({ container: 'webm', video_codec: 'vp9', muted: true, scale: '0.5' }), 30, 360)).toMatchObject({ audioCodec: null, muted: true, scale: 0.5, mimeType: 'video/webm' });
    expect(toRenderOptions(values({ container: 'mp3' }), 30, 360)).toMatchObject({ videoCodec: null, audioCodec: 'mp3', mimeType: 'audio/mpeg' });
  });
});

describe('ReelExportForm', () => {
  it('opens on the defaults and starts the export with them', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ReelExportForm open durationS={12} onClose={vi.fn()} onSubmit={onSubmit} />);
    const start = screen.getByTestId('reel-export-submit');
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(exportDefaults(12)));
  });

  it('gives a new file type its own codec, and hides what a sound-only or silent file does not have', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ReelExportForm open durationS={12} initialValues={values({ container: 'webm', video_codec: 'vp9', muted: true })} onClose={vi.fn()} onSubmit={onSubmit} />);
    // Silent: no sound quality to choose.
    expect(screen.queryByTestId('reel-export-audio-quality')).not.toBeInTheDocument();

    fireEvent.mouseDown(within(screen.getByTestId('reel-export-form')).getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'MOV (QuickTime)' }));
    fireEvent.click(screen.getByTestId('reel-export-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ container: 'mov', video_codec: 'h264' })));

    fireEvent.mouseDown(within(screen.getByTestId('reel-export-form')).getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'MP3 (sound only)' }));
    await waitFor(() => expect(screen.queryByTestId('reel-export-codec')).not.toBeInTheDocument());
    expect(screen.queryByTestId('reel-export-scale')).not.toBeInTheDocument();
    // A sound-only file cannot be silent, so the switch it hid is turned off for it.
    fireEvent.click(screen.getByTestId('reel-export-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ container: 'mp3', muted: false })));
  });

  it('holds Start while a stretch is wrong, and Reset puts the defaults back', async () => {
    renderWithProviders(<ReelExportForm open durationS={12} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId('reel-export-to'), { target: { value: '0' } });
    await waitFor(() => expect(screen.getByTestId('reel-export-submit')).toBeDisabled());
    fireEvent.click(screen.getByTestId('reel-export-defaults'));
    await waitFor(() => expect(screen.getByTestId('reel-export-submit')).toBeEnabled());
    expect(screen.getByTestId('reel-export-to')).toHaveValue(12);
  });
});

describe('useExportOptions', () => {
  const spec = { fps: 30, scenes: [{ id: 's1', duration_ms: 4000, transition_ms: 0 }] } as unknown as ReelSpec;
  const exporter = () => ({ start: vi.fn(async () => undefined) }) as unknown as ReelExport;

  it('opens the dialog, starts the render with the chosen options, and reopens on them', () => {
    const studio = exporter();
    const { result } = renderHook(() => useExportOptions(studio, spec));
    expect(result.current.durationS).toBe(4);
    act(() => result.current.show());
    expect(result.current.open).toBe(true);

    act(() => result.current.submit(values({ container: 'webm', video_codec: 'vp8', to_s: 2 })));
    expect(result.current.open).toBe(false);
    expect(studio.start).toHaveBeenCalledWith(expect.objectContaining({ container: 'webm', videoCodec: 'vp8', frameRange: [0, 59] }));
    expect(result.current.values).toMatchObject({ container: 'webm', to_s: 2 });
  });

  it('forgets a stretch longer than the reel has become', () => {
    const { result, rerender } = renderHook(({ current }) => useExportOptions(exporter(), current), { initialProps: { current: spec } });
    act(() => result.current.submit(values({ to_s: 4 })));
    rerender({ current: { ...spec, scenes: [{ id: 's1', duration_ms: 2000, transition_ms: 0 }] } as unknown as ReelSpec });
    expect(result.current.values).toBeUndefined();
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });
});
