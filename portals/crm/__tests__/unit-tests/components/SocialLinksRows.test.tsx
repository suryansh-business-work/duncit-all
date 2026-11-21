import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SocialLinksRows from '@/components/SocialLinksRows';

describe('SocialLinksRows', () => {
  it('renders one row per link, labelled with its name and linking out in a new tab', () => {
    render(
      <SocialLinksRows
        links={[
          { name: 'YouTube', url: 'https://youtube.com/@duncit' },
          { name: 'Facebook', url: 'https://facebook.com/duncit' },
        ]}
      />,
    );

    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://youtube.com/@duncit', 'https://facebook.com/duncit']);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer noopener');
    }
  });

  it('labels a link that has no name with its address', () => {
    render(<SocialLinksRows links={[{ name: '', url: 'https://linktr.ee/duncit' }]} />);
    // Once as the row label, once as the link text.
    expect(screen.getAllByText('https://linktr.ee/duncit')).toHaveLength(2);
  });

  it('renders nothing when the lead has no extra links', () => {
    const { container: empty } = render(<SocialLinksRows links={[]} />);
    expect(empty).toBeEmptyDOMElement();
    const { container: missing } = render(<SocialLinksRows links={null} />);
    expect(missing).toBeEmptyDOMElement();
    const { container: unset } = render(<SocialLinksRows links={undefined} />);
    expect(unset).toBeEmptyDOMElement();
  });
});
