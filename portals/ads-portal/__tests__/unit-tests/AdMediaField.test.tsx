import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import AdMediaField from '../../src/pages/create-ad-page/ad-request/AdMediaField';
import { renderWithProviders } from '../testkit';

const picker = vi.hoisted(() => ({ props: null as unknown as Record<string, any> }));

vi.mock('@duncit/media-picker', () => ({
  MediaPickerDialog: (props: Record<string, any>) => {
    picker.props = props;
    return props.open ? (
      <div data-testid="picker">
        <span data-testid="picker-accept">{props.accept}</span>
        <span data-testid="picker-title">{props.title}</span>
        <button onClick={() => props.onPicked('picked-url')}>pick</button>
        <button onClick={props.onClose}>close-dialog</button>
      </div>
    ) : null;
  },
}));

describe('AdMediaField', () => {
  it('uploads an image: opens the picker and forwards the picked url', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <AdMediaField adType="IMAGE" value="" onChange={onChange} />,
    );
    expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
    expect(screen.getByText('Upload the ad image')).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /upload image/i }));
    expect(screen.getByTestId('picker-accept')).toHaveTextContent('image/*');
    fireEvent.click(screen.getByRole('button', { name: 'pick' }));
    expect(onChange).toHaveBeenCalledWith('picked-url');
    // Picked closes the dialog.
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('renders a video preview, Replace label and custom error helper', () => {
    renderWithProviders(
      <AdMediaField
        adType="VIDEO"
        value="https://cdn/clip.mp4"
        onChange={vi.fn()}
        error
        helperText="Upload the ad media"
      />,
    );
    expect(screen.getByRole('button', { name: /replace video/i })).toBeInTheDocument();
    expect(screen.getByText('https://cdn/clip.mp4')).toBeInTheDocument();
    expect(screen.getByText('Upload the ad media')).toBeInTheDocument();
    expect(document.querySelector('video')).toHaveAttribute('src', 'https://cdn/clip.mp4');
  });

  it('renders an image preview and Replace label when an image is already set', () => {
    renderWithProviders(
      <AdMediaField adType="IMAGE" value="https://cdn/banner.png" onChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /replace image/i })).toBeInTheDocument();
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://cdn/banner.png');
    expect(img).toHaveAttribute('alt', 'Ad media preview');
  });

  it('closes the picker via its onClose', () => {
    renderWithProviders(<AdMediaField adType="IMAGE" value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /upload image/i }));
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close-dialog' }));
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });
});
