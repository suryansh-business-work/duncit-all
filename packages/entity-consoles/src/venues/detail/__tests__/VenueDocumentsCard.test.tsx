import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDate } from '@duncit/app-settings';
import VenueDocumentsCard from '../VenueDocumentsCard';
import { makeVenue } from './fixtures';

describe('VenueDocumentsCard', () => {
  it('lists each uploaded paper with its upload date and a link that opens it in a new tab', () => {
    const documents = [
      ...makeVenue().documents,
      { type: 'Lease Agreement', url: 'https://ik.imagekit.io/duncit/lease.pdf', uploaded_at: '2026-03-05T08:00:00.000Z' },
    ];
    render(<VenueDocumentsCard documents={documents} />);

    expect(screen.getByRole('heading', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.getByText('GST Certificate')).toBeInTheDocument();
    expect(screen.getByText(`Uploaded ${formatDate('2026-03-04T10:15:00.000Z')}`)).toBeInTheDocument();
    expect(screen.getByText('Lease Agreement')).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: 'View' });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://ik.imagekit.io/duncit/gst.pdf',
      'https://ik.imagekit.io/duncit/lease.pdf',
    ]);
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noreferrer');
  });

  it('says no documents were uploaded for an empty list', () => {
    render(<VenueDocumentsCard documents={[]} />);

    expect(screen.getByRole('heading', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.getByText('No documents uploaded.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
