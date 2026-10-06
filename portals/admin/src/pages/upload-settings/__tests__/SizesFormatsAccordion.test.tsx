import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SizesFormatsAccordion from '../SizesFormatsAccordion';
import { makeSettings } from './fixtures';

const renderAccordion = (saving = false, settings = makeSettings()) => {
  const onSave = vi.fn();
  const view = render(<SizesFormatsAccordion settings={settings} saving={saving} onSave={onSave} />);
  return { ...view, onSave };
};

const saveButton = () => screen.getByRole('button', { name: 'Save sizes & formats' });
const imageMbField = () => screen.getByRole('textbox', { name: 'Max image upload size (MB)' });
const videoMbField = () => screen.getByRole('textbox', { name: 'Max video upload size (MB)' });

describe('SizesFormatsAccordion', () => {
  it('opens expanded on the saved sizes and formats and saves them back as numbers', () => {
    const { onSave } = renderAccordion();

    expect(imageMbField()).toHaveValue('15');
    expect(screen.getByText('Default 15 MB.')).toBeInTheDocument();
    expect(screen.getByText('Default 100 MB.')).toBeInTheDocument();
    expect(screen.getByText('jpg')).toBeInTheDocument();
    expect(screen.getByText('mp4')).toBeInTheDocument();

    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({
      max_image_mb: 15,
      max_video_mb: 100,
      allowed_image_formats: ['jpg', 'png'],
      allowed_video_formats: ['mp4'],
    });
  });

  it('lower-cases a typed format and saves the edited sizes', () => {
    const { onSave } = renderAccordion();

    fireEvent.change(imageMbField(), { target: { value: '20' } });
    fireEvent.change(videoMbField(), { target: { value: '250' } });
    const imageFormats = screen.getByRole('combobox', { name: 'Allowed image formats' });
    fireEvent.change(imageFormats, { target: { value: 'WEBP' } });
    fireEvent.keyDown(imageFormats, { key: 'Enter' });
    const videoFormats = screen.getByRole('combobox', { name: 'Allowed video formats' });
    fireEvent.change(videoFormats, { target: { value: 'MOV' } });
    fireEvent.keyDown(videoFormats, { key: 'Enter' });
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith({
      max_image_mb: 20,
      max_video_mb: 250,
      allowed_image_formats: ['jpg', 'png', 'webp'],
      allowed_video_formats: ['mp4', 'mov'],
    });
  });

  it.each([
    ['zero', '0'],
    ['not a number', '1o'],
  ])('blocks saving when the image size is %s', (_case, value) => {
    renderAccordion();

    fireEvent.change(imageMbField(), { target: { value } });

    expect(screen.getByText('Enter a whole number of 1 or more.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('blocks saving when the video size is invalid', () => {
    renderAccordion();

    fireEvent.change(videoMbField(), { target: { value: '' } });

    expect(screen.getByText('Enter a whole number of 1 or more.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('blocks saving when a format list is empty', () => {
    renderAccordion(false, makeSettings({ allowed_video_formats: [] }));

    expect(saveButton()).toBeDisabled();
  });

  it('disables Save while a save is in flight', () => {
    renderAccordion(true);

    expect(saveButton()).toBeDisabled();
  });

  it('re-syncs when fresh settings arrive', () => {
    const { rerender, onSave } = renderAccordion();
    fireEvent.change(imageMbField(), { target: { value: '3' } });

    rerender(
      <SizesFormatsAccordion
        settings={makeSettings({ max_image_mb: 25, allowed_image_formats: ['avif'] })}
        saving={false}
        onSave={onSave}
      />,
    );

    expect(imageMbField()).toHaveValue('25');
    expect(screen.getByText('avif')).toBeInTheDocument();
    expect(screen.queryByText('jpg')).toBeNull();
  });
});
