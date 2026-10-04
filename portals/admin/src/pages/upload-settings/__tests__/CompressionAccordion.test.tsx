import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CompressionAccordion from '../CompressionAccordion';
import { makeSettings } from './fixtures';

const renderOpen = (saving = false, settings = makeSettings()) => {
  const onSave = vi.fn();
  const view = render(<CompressionAccordion settings={settings} saving={saving} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: /Compression \(sharp images/ }));
  return { ...view, onSave };
};

const saveButton = () => screen.getByRole('button', { name: 'Save compression' });
const dimField = () => screen.getByRole('textbox', { name: 'Max image dimension (px)' });
const heightField = () => screen.getByRole('textbox', { name: 'Max video height (px)' });

describe('CompressionAccordion', () => {
  it('starts from the saved settings and saves them back with numeric caps', () => {
    const { onSave } = renderOpen();

    expect(screen.getByText('Image quality: 80')).toBeInTheDocument();
    expect(screen.getByText('Video CRF: 28 (lower = higher quality, larger file)')).toBeInTheDocument();
    expect(dimField()).toHaveValue('1920');
    expect(screen.getByText('Longest edge cap. Default 1920.')).toBeInTheDocument();
    expect(screen.getByText('Taller videos are scaled down. Default 1080.')).toBeInTheDocument();

    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({
      image_compression_enabled: true,
      image_quality: 80,
      image_max_dimension: 1920,
      video_compression_enabled: true,
      video_crf: 28,
      video_max_height: 1080,
    });
  });

  it('sends the edited switches, sliders and caps', () => {
    const { onSave } = renderOpen();

    fireEvent.change(screen.getByRole('slider', { name: 'Image quality' }), { target: { value: 65 } });
    fireEvent.change(screen.getByRole('slider', { name: 'Video CRF' }), { target: { value: 32 } });
    fireEvent.change(dimField(), { target: { value: '1280' } });
    fireEvent.change(heightField(), { target: { value: '720' } });
    fireEvent.click(screen.getByRole('switch', { name: /Compress videos server-side/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Compress images server-side/ }));

    expect(dimField()).toBeDisabled();
    expect(heightField()).toBeDisabled();
    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({
      image_compression_enabled: false,
      image_quality: 65,
      image_max_dimension: 1280,
      video_compression_enabled: false,
      video_crf: 32,
      video_max_height: 720,
    });
  });

  it.each([
    ['below the 320px floor', '200'],
    ['not a whole number', '12.5'],
  ])('blocks saving when the image dimension is %s', (_case, value) => {
    renderOpen();

    fireEvent.change(dimField(), { target: { value } });

    expect(screen.getByText('Minimum 320px.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it.each([
    ['below the 240px floor', '100'],
    ['empty', ''],
  ])('blocks saving when the video height is %s', (_case, value) => {
    renderOpen();

    fireEvent.change(heightField(), { target: { value } });

    expect(screen.getByText('Minimum 240px.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('disables Save while a save is in flight', () => {
    renderOpen(true);

    expect(saveButton()).toBeDisabled();
  });

  it('re-syncs the form when fresh settings arrive', () => {
    const { rerender, onSave } = renderOpen();
    fireEvent.change(dimField(), { target: { value: '999' } });

    rerender(
      <CompressionAccordion
        settings={makeSettings({ image_max_dimension: 2560, video_crf: 22, image_compression_enabled: false })}
        saving={false}
        onSave={onSave}
      />,
    );

    expect(dimField()).toHaveValue('2560');
    expect(dimField()).toBeDisabled();
    expect(screen.getByText('Video CRF: 22 (lower = higher quality, larger file)')).toBeInTheDocument();
  });
});
