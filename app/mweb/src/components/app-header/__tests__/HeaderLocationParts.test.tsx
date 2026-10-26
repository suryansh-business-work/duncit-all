import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import HeaderDeliveryAddress from '../HeaderDeliveryAddress';
import HeaderLocationButton from '../HeaderLocationButton';
import LocationCityGrid from '../LocationCityGrid';
import LocationMapPreview from '../LocationMapPreview';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ delivery: vi.fn(), key: 'MAPKEY' }));

vi.mock('../../../hooks/useDeliveryAddress', () => ({ useDeliveryAddress: h.delivery }));
vi.mock('../../../config/runtimeConfig', () => ({ getGoogleMapsApiKey: () => h.key }));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const ADDRESS = { id: 'a1', label: 'Home', line1: '12 MG Road', city: 'Bengaluru', pincode: '560001', is_default: true };

const delivery = (over: object = {}) => ({
  addresses: [ADDRESS],
  selected: ADDRESS,
  select: vi.fn(),
  loading: false,
  error: undefined,
  refetch: vi.fn(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.key = 'MAPKEY';
});

describe('HeaderDeliveryAddress', () => {
  const pill = (signedIn: boolean) =>
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <Routes>
          <Route path="/shop" element={<HeaderDeliveryAddress signedIn={signedIn} />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows the picked address line and label, and names the control with both', () => {
    h.delivery.mockReturnValue(delivery());
    pill(true);
    expect(h.delivery).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('header-delivery-address-line')).toHaveTextContent('12 MG Road, Bengaluru 560001');
    expect(screen.getByTestId('header-delivery-address')).toHaveTextContent(`${fallbackT('mweb.checkout.deliverTo')} · Home`);
    expect(screen.getByTestId('header-delivery-address')).toHaveAccessibleName(
      `${fallbackT('mweb.shop.changeDeliveryAddress')}: 12 MG Road, Bengaluru 560001`
    );
  });

  it('prompts to add an address when none is selected', () => {
    h.delivery.mockReturnValue(delivery({ addresses: [], selected: null }));
    pill(true);
    expect(screen.getByTestId('header-delivery-address-line')).toHaveTextContent(fallbackT('mweb.shop.addDeliveryAddress'));
    expect(screen.getByTestId('header-delivery-address')).not.toHaveTextContent('·');
  });

  it('shows a skeleton instead of the line while loading', () => {
    h.delivery.mockReturnValue(delivery({ loading: true }));
    pill(true);
    expect(screen.queryByTestId('header-delivery-address-line')).not.toBeInTheDocument();
  });

  it('opens the address list when signed in, switches address and closes', async () => {
    const state = delivery({ addresses: [ADDRESS, { ...ADDRESS, id: 'a2', label: 'Work', is_default: false }] });
    h.delivery.mockReturnValue(state);
    pill(true);
    fireEvent.click(screen.getByTestId('header-delivery-address'));
    fireEvent.click(await screen.findByRole('radio', { name: /Work/ }));
    expect(state.select).toHaveBeenCalledWith('a2');
  });

  it('goes to the address book from the dialog manage button', async () => {
    h.delivery.mockReturnValue(delivery());
    pill(true);
    fireEvent.click(screen.getByTestId('header-delivery-address'));
    fireEvent.click(await screen.findByTestId('delivery-address-manage'));
    expect(screen.getByTestId('where')).toHaveTextContent('/address-book');
  });

  it('sends a signed-out visitor straight to the address book', () => {
    h.delivery.mockReturnValue(delivery({ addresses: [], selected: null }));
    pill(false);
    expect(h.delivery).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByTestId('header-delivery-address'));
    expect(screen.getByTestId('where')).toHaveTextContent('/address-book');
  });

  it('shows the load failure with a retry only when there are no addresses to show', async () => {
    const state = delivery({ addresses: [], selected: null, error: new Error('x') });
    h.delivery.mockReturnValue(state);
    pill(true);
    fireEvent.click(screen.getByTestId('header-delivery-address'));
    expect(await screen.findByTestId('delivery-address-error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.shop.retry') }));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the list when a refresh fails but addresses are already known', async () => {
    h.delivery.mockReturnValue(delivery({ error: new Error('x') }));
    pill(true);
    fireEvent.click(screen.getByTestId('header-delivery-address'));
    expect(await screen.findByTestId('delivery-address-option-a1')).toBeInTheDocument();
    expect(screen.queryByTestId('delivery-address-error')).not.toBeInTheDocument();
  });
});

describe('HeaderLocationButton', () => {
  const button = (props: Partial<Parameters<typeof HeaderLocationButton>[0]> = {}) => {
    const onClick = vi.fn();
    render(<HeaderLocationButton loading={false} hasData onClick={onClick} {...props} />);
    return onClick;
  };

  it('shows a skeleton while the first load has no data', () => {
    button({ loading: true, hasData: false });
    expect(screen.getByTestId('header-location-button-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('header-location-button')).not.toBeInTheDocument();
  });

  it('keeps the button during a refresh when data already exists', () => {
    button({ loading: true, hasData: true, selectedLocationName: 'Pune' });
    expect(screen.getByTestId('header-location-button')).toHaveTextContent('Pune');
  });

  it('shows the city, zone chip and country flag, and reports presses', () => {
    const onClick = button({ selectedLocationName: 'Bengaluru', selectedZoneName: 'Indiranagar', selectedCountryCode: 'IN' });
    const el = screen.getByTestId('header-location-button');
    expect(el).toHaveTextContent('Bengaluru');
    expect(screen.getByTestId('header-location-button-zone')).toHaveTextContent('Indiranagar');
    expect(el.querySelector('img')).toHaveAttribute('src', 'https://flagcdn.com/24x18/in.png');
    expect(el).toHaveAccessibleName(fallbackT('mweb.appHeader.changeCityOrZone'));
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows a pin icon and the Select city prompt without a country, city or zone', () => {
    button();
    const el = screen.getByTestId('header-location-button');
    expect(el).toHaveTextContent('Select city');
    expect(el.querySelector('img')).toBeNull();
    expect(screen.getByTestId('LocationOnIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('header-location-button-zone')).not.toBeInTheDocument();
  });
});

describe('LocationCityGrid', () => {
  const cities = [
    { id: 'c1', location_name: 'Bengaluru', active_club_count: 2 },
    { id: 'c2', location_name: 'Pune', active_club_count: 0 },
  ];

  it('lists the cities, ticks the draft one and selects on press', () => {
    const onSelect = vi.fn();
    render(<LocationCityGrid cities={cities as never} draftLocationId="c2" onSelect={onSelect} />);
    expect(screen.getByTestId('location-c2-select')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('location-c1-select')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('location-c1-select'));
    expect(onSelect).toHaveBeenCalledWith('c1');
    expect(screen.queryByTestId('location-city-grid-empty')).not.toBeInTheDocument();
  });

  it('says there are no cities for an empty list', () => {
    render(<LocationCityGrid cities={[]} draftLocationId="" onSelect={vi.fn()} />);
    expect(screen.getByTestId('location-city-grid-empty')).toBeInTheDocument();
  });
});

describe('LocationMapPreview', () => {
  it('renders nothing without a map key', () => {
    h.key = '';
    render(<LocationMapPreview city="Pune" />);
    expect(screen.queryByTestId('location-map-preview')).not.toBeInTheDocument();
  });

  it('renders nothing when no place is chosen', () => {
    render(<LocationMapPreview city="  " zoneName={null} pincode="" country={undefined} />);
    expect(screen.queryByTestId('location-map-preview')).not.toBeInTheDocument();
  });

  it('embeds the place and links out to Google Maps with an encoded query', () => {
    render(<LocationMapPreview city="Bengaluru" zoneName="Indiranagar" pincode="560038" country="India" />);
    const q = encodeURIComponent('Indiranagar, Bengaluru, 560038, India');
    expect(screen.getByTestId('location-map')).toHaveAttribute(
      'src',
      `https://www.google.com/maps/embed/v1/place?key=MAPKEY&q=${q}&zoom=12`
    );
    expect(screen.getByTestId('location-map')).toHaveAttribute('title', fallbackT('mweb.common.selectedLocationMap'));
    expect(screen.getByTestId('location-map-preview-open')).toHaveAttribute(
      'href',
      `https://www.google.com/maps/search/?api=1&query=${q}`
    );
  });
});
