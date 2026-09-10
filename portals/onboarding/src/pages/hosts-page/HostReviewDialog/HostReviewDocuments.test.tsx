import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import HostReviewDocuments from './HostReviewDocuments';

const PASSPORT = 'https://cdn.example.com/passport.jpg';
const POLICE = 'https://cdn.example.com/police.jpg';

describe('HostReviewDocuments', () => {
  it('renders both documents as images, not links out of the dialog', () => {
    render(<HostReviewDocuments passportUrl={PASSPORT} policeVerificationUrl={POLICE} />);
    expect(screen.getByAltText('Passport photo')).toHaveAttribute('src', PASSPORT);
    expect(screen.getByAltText('Police verification')).toHaveAttribute('src', POLICE);
    expect(screen.queryByTestId('review-no-documents')).not.toBeInTheDocument();
  });

  it('enlarges a document in place when its thumbnail is clicked', () => {
    render(<HostReviewDocuments passportUrl={PASSPORT} policeVerificationUrl={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enlarge Passport photo' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders only the document that is on file', () => {
    render(<HostReviewDocuments passportUrl={null} policeVerificationUrl={POLICE} />);
    expect(screen.queryByAltText('Passport photo')).not.toBeInTheDocument();
    expect(screen.getByAltText('Police verification')).toBeInTheDocument();
  });

  it('warns when neither document has been uploaded', () => {
    render(<HostReviewDocuments />);
    expect(screen.getByTestId('review-no-documents')).toBeInTheDocument();
  });
});
