import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ImagePreview } from '../src/ImagePreview';

const SRC = 'https://cdn.example.com/passport.jpg';

describe('ImagePreview', () => {
  it('renders a captioned thumbnail at the default 96px edge', () => {
    render(<ImagePreview src={SRC} label="Passport photo" />);
    const trigger = screen.getByRole('button', { name: 'Enlarge Passport photo' });
    expect(trigger).toHaveStyle({ width: '96px', height: '96px' });
    expect(screen.getByAltText('Passport photo')).toHaveAttribute('src', SRC);
    expect(screen.getByText('Passport photo')).toHaveClass('MuiTypography-caption');
  });

  it('honors a custom thumbnail size', () => {
    render(<ImagePreview src={SRC} label="Police verification" size={64} />);
    expect(screen.getByRole('button', { name: 'Enlarge Police verification' })).toHaveStyle({
      width: '64px',
      height: '64px',
    });
  });

  // The dialog is what turns "click to open in a new tab" into "click to enlarge".
  it('opens the full-screen view on click and closes it again', () => {
    render(<ImagePreview src={SRC} label="Passport photo" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enlarge Passport photo' }));
    const dialog = screen.getByRole('dialog');
    // Thumbnail + enlarged copy both carry the label as their alt text.
    expect(screen.getAllByAltText('Passport photo')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Close Passport photo' }));
    expect(dialog).not.toBeVisible();
  });

  it('closes the full-screen view from the backdrop', () => {
    render(<ImagePreview src={SRC} label="Passport photo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Enlarge Passport photo' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).not.toBeVisible();
  });

  // A deleted/expired document URL must still be reachable, not a blank box.
  it('degrades to an external link when the image fails to load', () => {
    render(<ImagePreview src={SRC} label="Police verification" />);
    fireEvent.error(screen.getByAltText('Police verification'));

    expect(screen.queryByRole('button', { name: 'Enlarge Police verification' })).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Police verification' });
    expect(link).toHaveAttribute('href', SRC);
    expect(link).toHaveAttribute('target', '_blank');
  });
});
