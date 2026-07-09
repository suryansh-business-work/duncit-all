import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttachmentList from '../../src/components/AttachmentList';

describe('AttachmentList', () => {
  it('renders nothing when there are no attachments', () => {
    const { container } = render(<AttachmentList urls={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an image thumbnail, a video player and a document card', () => {
    render(
      <AttachmentList
        urls={[
          'https://cdn/photo.png',
          'https://cdn/clip.mp4',
          'https://cdn/report.pdf',
        ]}
      />,
    );
    // Image → <img> with the file name as alt.
    expect(screen.getByAltText('photo.png')).toBeInTheDocument();
    // Video → a <video> element (queried by tag since it has no role).
    expect(document.querySelector('video')).toBeTruthy();
    // Document → a card showing the file name + type badge.
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });
});
