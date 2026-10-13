import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BubbleMedia, { mediaFormatOf } from '../../src/pages/whatsapp-page/wa-aisensy/BubbleMedia';

describe('mediaFormatOf', () => {
  it('recognises the WhatsApp media header kinds and nothing else', () => {
    expect(mediaFormatOf('IMAGE')).toBe('IMAGE');
    expect(mediaFormatOf('LOCATION')).toBe('LOCATION');
    expect(mediaFormatOf('TEXT')).toBeNull();
    expect(mediaFormatOf('')).toBeNull();
  });
});

describe('BubbleMedia', () => {
  it('draws an IMAGE header as a picture, captioned with the file name', () => {
    render(<BubbleMedia format="IMAGE" media={{ url: 'https://cdn.example.test/blob', filename: 'court.png' }} />);
    const img = screen.getByRole('img', { name: 'court.png' });
    expect(img).toHaveAttribute('src', 'https://cdn.example.test/blob');
  });

  it('falls back to the header kind as the picture description when there is no file name', () => {
    render(<BubbleMedia format="IMAGE" media={{ url: 'https://cdn.example.test/blob', filename: '' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringMatching(/image/i));
  });

  it('draws a document that ends in a picture extension as a picture, ignoring a CDN query', () => {
    render(
      <BubbleMedia format="DOCUMENT" media={{ url: 'https://cdn.example.test/a.webp?v=3', filename: 'a.webp' }} />,
    );
    expect(screen.getByRole('img', { name: 'a.webp' })).toBeInTheDocument();
  });

  it('draws a document as a named chip, never as a picture, however the URL ends', () => {
    render(
      <BubbleMedia format="DOCUMENT" media={{ url: 'https://cdn.example.test/terms.pdf?v=2', filename: 'terms.pdf' }} />,
    );
    expect(screen.getByText('terms.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'terms.pdf' })).not.toBeInTheDocument();
  });

  it('shows the URL itself on the chip when the asset has no file name', () => {
    render(<BubbleMedia format="VIDEO" media={{ url: 'https://cdn.example.test/clip.mp4', filename: '' }} />);
    expect(screen.getByText('https://cdn.example.test/clip.mp4')).toBeInTheDocument();
  });

  it('draws the kind alone, as a placeholder, before any asset is chosen', () => {
    render(<BubbleMedia format="LOCATION" />);
    expect(screen.getByText(/location/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /./ })).not.toBeInTheDocument();
  });

  it('paints the placeholder in the WhatsApp dark background under a dark theme', () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <BubbleMedia format="IMAGE" />
      </ThemeProvider>,
    );
    const box = screen.getByText(/image/i).parentElement as HTMLElement;
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(17, 27, 33)');
  });

  it('paints it light under a light theme', () => {
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>
        <BubbleMedia format="IMAGE" />
      </ThemeProvider>,
    );
    const box = screen.getByText(/image/i).parentElement as HTMLElement;
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(240, 242, 245)');
  });
});
