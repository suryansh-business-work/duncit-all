import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WhereBlock } from '../../../pages/event/WhereBlock';
import { eventFixture, renderWithProviders } from '../../test-utils';

describe('WhereBlock', () => {
  it('names the venue, then the address and the city under it', () => {
    renderWithProviders(<WhereBlock event={eventFixture()} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Lodhi Garden' })).toBeInTheDocument();
    expect(screen.getByText('Lodhi Road, New Delhi')).toBeInTheDocument();
    expect(screen.getByText('Delhi')).toBeInTheDocument();
  });

  it('uses the address as the heading when there is no venue, without repeating it', () => {
    renderWithProviders(<WhereBlock event={eventFixture({ venue_name: null, city_name: null })} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Lodhi Road, New Delhi' })).toBeInTheDocument();
    expect(screen.getAllByText('Lodhi Road, New Delhi')).toHaveLength(1);
  });

  it('links to the map in a new tab only when the host gave one', () => {
    const { unmount } = renderWithProviders(<WhereBlock event={eventFixture({ map_url: 'https://maps.example/lodhi' })} />);
    const link = screen.getByRole('link', { name: 'Open in maps' });
    expect(link).toHaveAttribute('href', 'https://maps.example/lodhi');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    unmount();

    renderWithProviders(<WhereBlock event={eventFixture({ map_url: null })} />);
    expect(screen.queryByRole('link', { name: 'Open in maps' })).not.toBeInTheDocument();
  });

  it('gives an online event the join link once the reader may see it', () => {
    renderWithProviders(<WhereBlock event={eventFixture({ location_type: 'VIRTUAL', virtual_link: 'https://meet.example/garden' })} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Online' })).toBeInTheDocument();
    const join = screen.getByRole('link', { name: 'Open the join link' });
    expect(join).toHaveAttribute('href', 'https://meet.example/garden');
    expect(join).toHaveAttribute('target', '_blank');
    expect(screen.queryByText('Lodhi Road, New Delhi')).not.toBeInTheDocument();
  });

  it('tells a reader who has not registered that the online link comes later', () => {
    renderWithProviders(<WhereBlock event={eventFixture({ location_type: 'VIRTUAL', virtual_link: null })} />);

    expect(screen.getByText('Online — the link is shared once you register.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
