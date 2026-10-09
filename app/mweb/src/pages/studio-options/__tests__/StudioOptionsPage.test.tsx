import { fireEvent, render, screen, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STUDIO_OPTION_LIST, type PartnerStudioMode } from '@duncit/utils';
import StudioOptionsPage from '..';
import { MY_VENUES_SWITCHER } from '../../venue-manage-page/queries';
import { SELECTED_VENUE_KEY } from '../../../hooks/useSelectedVenue';

const userInfo = vi.fn();
vi.mock('../../../user-info/useUserInfo', () => ({ useUserInfo: () => userInfo() }));
const autoPodsOn = vi.fn();
vi.mock('../../../hooks/useFeatureFlag', () => ({ useFeatureFlag: () => autoPodsOn() }));
const openPartnerPortal = vi.fn();
vi.mock('../openPartnerPortal', () => ({ openPartnerPortal: (path: string) => openPartnerPortal(path) }));

const venuesMock = {
  request: { query: MY_VENUES_SWITCHER },
  result: {
    data: {
      myVenues: [
        { __typename: 'Venue', id: 'v-turf', venue_name: 'Turf', city: 'Lucknow', status: 'APPROVED' },
        { __typename: 'Venue', id: 'v-hall', venue_name: 'Hall', city: 'Kanpur', status: 'APPROVED' },
      ],
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

function renderPage(mode: PartnerStudioMode, roles: string[]) {
  userInfo.mockReturnValue({ me: { roles }, loading: false });
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[venuesMock]}>
      <MemoryRouter initialEntries={['/options']}>
        <Routes>
          <Route path="/options" element={<StudioOptionsPage mode={mode} />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

beforeEach(() => {
  autoPodsOn.mockReturnValue(true);
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('StudioOptionsPage', () => {
  // The order Native and the Partner console show too: all three render the
  // one shared catalogue, so this pins mWeb to it option for option.
  it.each([
    ['VENUE', ['VENUE_OWNER']],
    ['HOST', ['HOST']],
    ['CLUB', ['CLUB_ADMIN']],
    ['ECOMM', ['ECOMM_MANAGER']],
  ] as const)('lists the %s options in the shared catalogue order', (mode, roles) => {
    renderPage(mode, [...roles]);
    const rendered = within(screen.getByTestId('studio-options-list'))
      .getAllByTestId(/^studio-option-(?!.*-external$)[a-z-]+$/)
      .map((row) => row.getAttribute('data-testid'));
    expect(rendered).toEqual(STUDIO_OPTION_LIST[mode].map((option) => `studio-option-${option.key}`));
  });


  it('lists every Host option with its hint, under the entry title', () => {
    renderPage('HOST', ['HOST']);
    expect(screen.getByTestId('studio-page-header-title')).toHaveTextContent('Host Options');
    const list = screen.getByTestId('studio-options-list');
    expect(within(list).getByText('Your Pods')).toBeInTheDocument();
    expect(within(list).getByText('Requested, live, past and draft pods')).toBeInTheDocument();
    expect(within(list).getByText('Publish Your Host Page')).toBeInTheDocument();
    expect(screen.getByTestId('studio-option-auto-pods')).toBeInTheDocument();
  });

  it('opens an option’s page when tapped', () => {
    renderPage('HOST', ['HOST']);
    fireEvent.click(screen.getByTestId('studio-option-publish'));
    expect(screen.getByTestId('where')).toHaveTextContent('/host/publish');
  });

  it('drops Auto Pods while its flag is off', () => {
    autoPodsOn.mockReturnValue(false);
    renderPage('CLUB', ['CLUB_ADMIN']);
    expect(screen.getByTestId('studio-option-monitoring')).toBeInTheDocument();
    expect(screen.queryByTestId('studio-option-auto-pods')).not.toBeInTheDocument();
  });

  it('opens a brand option the app has no page for in the Partner app, and says so', () => {
    renderPage('ECOMM', ['ECOMM_MANAGER']);
    expect(screen.getByTestId('studio-option-brands-external')).toBeInTheDocument();
    // Brands, integrations and returns — the three Partner-console-only screens.
    expect(screen.getAllByTitle('Opens in the Partner app')).toHaveLength(3);
    fireEvent.click(screen.getByTestId('studio-option-brands'));
    expect(openPartnerPortal).toHaveBeenCalledWith('/ecomm-brand');
    // An option with an app page keeps its chevron and stays in the app.
    expect(screen.queryByTestId('studio-option-dashboard-external')).not.toBeInTheDocument();
  });

  it('sends a visitor without the studio role home', () => {
    renderPage('VENUE', ['HOST']);
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(screen.queryByTestId('studio-options-list')).not.toBeInTheDocument();
  });

  it('waits for the account before deciding', () => {
    userInfo.mockReturnValue({ me: undefined, loading: true });
    render(
      <MockedProvider mocks={[]}>
        <MemoryRouter>
          <StudioOptionsPage mode="HOST" />
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(screen.getByTestId('studio-options-loading')).toBeInTheDocument();
  });

  it('lets a venue owner pick THE venue every venue option opens for', async () => {
    renderPage('VENUE', ['VENUE_OWNER']);
    const picker = await screen.findByTestId('venue-switcher');
    expect(screen.getByText('Every venue option opens for this venue')).toBeInTheDocument();
    fireEvent.mouseDown(within(picker).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: /Hall/ }));
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-hall');
    expect(within(picker).getByRole('combobox')).toHaveTextContent('Hall');
  });
});
