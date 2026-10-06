import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CropPresetsAccordion from '../CropPresetsAccordion';
import { makeSettings } from './fixtures';

const renderOpen = (saving = false, settings = makeSettings()) => {
  const onSave = vi.fn();
  const view = render(<CropPresetsAccordion settings={settings} saving={saving} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Image crop resolution settings' }));
  return { ...view, onSave };
};

const saveButton = () => screen.getByRole('button', { name: 'Save crop presets' });
const defaultSelect = () => screen.getByRole('combobox', { name: 'Default crop' });
/** The row a preset's switch sits in — its width/height fields are its siblings. */
const presetRow = (label: string) =>
  screen.getByRole('switch', { name: `${label} enabled` }).closest('.MuiStack-root') as HTMLElement;

describe('CropPresetsAccordion', () => {
  it('lists each preset with its usage note, falling back for an unknown key', () => {
    renderOpen();

    expect(screen.getByText('Upload exactly as picked (default).')).toBeInTheDocument();
    expect(screen.getByText('Ad creatives, venues-card video and landscape hero media.')).toBeInTheDocument();
    expect(screen.getByText('Custom preset.')).toBeInTheDocument();
    expect(within(presetRow('No Crop')).getByRole('textbox', { name: 'Width' })).toBeDisabled();
    expect(defaultSelect()).toHaveTextContent('No Crop');
  });

  it('saves the edited presets and the chosen default', () => {
    const { onSave } = renderOpen();

    fireEvent.click(screen.getByRole('switch', { name: 'Custom wide enabled' }));
    fireEvent.change(within(presetRow('16:9')).getByRole('textbox', { name: 'Height' }), {
      target: { value: '1200' },
    });
    fireEvent.mouseDown(defaultSelect());
    fireEvent.click(screen.getByRole('option', { name: 'Custom wide' }));
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith({
      crop_presets: [
        { key: 'NO_CROP', label: 'No Crop', width: 0, height: 0, enabled: true },
        { key: 'RATIO_16_9', label: '16:9', width: 1920, height: 1200, enabled: true },
        { key: 'CUSTOM_WIDE', label: 'Custom wide', width: 1200, height: 400, enabled: true },
      ],
      default_crop_key: 'CUSTOM_WIDE',
    });
  });

  it('offers only enabled presets as the default', () => {
    renderOpen();

    fireEvent.mouseDown(defaultSelect());
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['No Crop', '16:9']);
  });

  it('clears the default and blocks saving when the default preset is switched off', () => {
    renderOpen(false, makeSettings({ default_crop_key: 'RATIO_16_9' }));
    expect(defaultSelect()).toHaveTextContent('16:9');

    fireEvent.click(screen.getByRole('switch', { name: '16:9 enabled' }));

    expect(defaultSelect()).not.toHaveTextContent('16:9');
    expect(saveButton()).toBeDisabled();
  });

  it('flags an enabled preset with no width and blocks saving', () => {
    renderOpen();

    fireEvent.change(within(presetRow('16:9')).getByRole('textbox', { name: 'Width' }), {
      target: { value: 'abc' },
    });

    expect(within(presetRow('16:9')).getByRole('textbox', { name: 'Width' })).toHaveValue('0');
    expect(within(presetRow('16:9')).getByRole('textbox', { name: 'Width' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enabled presets need a width and height greater than 0.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('flags an enabled preset with no height and blocks saving', () => {
    renderOpen();
    const height = within(presetRow('16:9')).getByRole('textbox', { name: 'Height' });

    fireEvent.change(height, { target: { value: '' } });

    expect(height).toHaveAttribute('aria-invalid', 'true');
    expect(within(presetRow('16:9')).getByRole('textbox', { name: 'Width' })).toHaveAttribute('aria-invalid', 'false');
    expect(saveButton()).toBeDisabled();
  });

  it('disables Save while a save is in flight', () => {
    renderOpen(true);

    expect(screen.queryByText('Enabled presets need a width and height greater than 0.')).toBeNull();
    expect(saveButton()).toBeDisabled();
  });

  it('re-syncs the presets when fresh settings arrive', () => {
    const { rerender, onSave } = renderOpen();

    rerender(
      <CropPresetsAccordion
        settings={makeSettings({
          default_crop_key: 'RATIO_16_9',
          crop_presets: [{ key: 'RATIO_16_9', label: '16:9', width: 1600, height: 900, enabled: true }],
        })}
        saving={false}
        onSave={onSave}
      />,
    );

    expect(screen.queryByRole('switch', { name: 'No Crop enabled' })).toBeNull();
    expect(within(presetRow('16:9')).getByRole('textbox', { name: 'Width' })).toHaveValue('1600');
    expect(defaultSelect()).toHaveTextContent('16:9');
  });
});
