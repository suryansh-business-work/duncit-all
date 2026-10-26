import { Linking } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { logs } from '@duncit/logs';
import type { GigContact, GigJob } from '@duncit/utils';

import { GigJobContactDocument } from '@/graphql/gigs';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { GigContactCard } from '../GigContactCard';
import { GigContactReveal } from '../GigContactReveal';
import { GigFacts } from '../GigFacts';
import { ContactSharingNotice, GigNote } from '../GigNote';
import { GigPlaceField } from '../GigPlaceField';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDay: (key: string) => `day:${key}` }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockPicker = jest.fn();
jest.mock('@/components/LocationPickerField/LocationPickerField', () => ({
  LocationPickerField: (props: {
    onChange: (locationId: string, locality: string) => void;
    [key: string]: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockPicker(props);
    return <Pressable testID="pick-city" onPress={() => props.onChange('loc9', 'Hazratganj')} />;
  },
}));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

let openURL: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => openURL.mockRestore());

const CONTACT: GigContact = {
  name: 'Asha Rao',
  phone: '+91 99999 00000',
  email: 'asha@example.com',
};

describe('GigNote', () => {
  it('says its text in place, as a polite status', () => {
    renderWithProviders(<GigNote text="Saved" testID="note" />);
    expect(screen.getByTestId('note')).toHaveTextContent('Saved');
    expect(screen.getByTestId('note').props.role).toBe('status');
  });

  it('draws the info and the warning tones with their own glyph', () => {
    const { unmount } = renderWithProviders(<GigNote text="x" testID="note" />);
    expect(screen.UNSAFE_getByProps({ name: 'info-outline' })).toBeTruthy();
    unmount();
    renderWithProviders(<GigNote text="x" testID="note" tone="warning" />);
    expect(screen.UNSAFE_getByProps({ name: 'warning-amber' })).toBeTruthy();
  });

  it('shows the contact-sharing notice', () => {
    renderWithProviders(<ContactSharingNotice />);
    expect(screen.getByTestId('gig-contact-notice')).toHaveTextContent(
      /gigJobs.contact.monetizeNotice/,
    );
  });
});

describe('GigPlaceField', () => {
  const binding = (value: string) => ({ value, onChange: jest.fn(), onBlur: jest.fn() });

  it('draws the shared picker, required, with the gig wording', () => {
    const city = binding('loc1');
    const area = binding('Gomti Nagar');
    renderWithProviders(
      <GigPlaceField label="City" city={city} area={area} error="Pick a city" testID="gig-city" />,
    );
    const props = mockPicker.mock.calls[0][0];
    expect(props).toMatchObject({
      locationId: 'loc1',
      locality: 'Gomti Nagar',
      error: 'Pick a city',
      required: true,
      testID: 'gig-city',
    });
    expect(props.copy).toMatchObject({
      label: 'City',
      placeholder: 'gigJobs.form.cityPlaceholder',
      change: 'gigJobs.form.changeCity',
      locality: 'gigJobs.form.locality',
      anyLocality: 'gigJobs.form.anyLocality',
      noLocalities: 'gigJobs.form.noLocalities',
    });
    expect(props.copy.cityAria('Lucknow')).toBe('gigJobs.form.cityAria|Lucknow');
  });

  it('writes the city and the area together, then marks the city touched', () => {
    const city = binding('');
    const area = binding('');
    renderWithProviders(<GigPlaceField label="City" city={city} area={area} testID="gig-city" />);
    fireEvent.press(screen.getByTestId('pick-city'));
    expect(city.onChange).toHaveBeenCalledWith('loc9');
    expect(area.onChange).toHaveBeenCalledWith('Hazratganj');
    expect(city.onBlur).toHaveBeenCalledTimes(1);
  });
});

describe('GigContactCard', () => {
  it('shows the contact and the three ways to reach them', () => {
    renderWithProviders(<GigContactCard contact={CONTACT} />);
    expect(screen.getByText('gigJobs.contact.title')).toBeOnTheScreen();
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByText('+91 99999 00000')).toBeOnTheScreen();
    expect(screen.getByText('asha@example.com')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-contact-notice')).toBeOnTheScreen();
  });

  it('opens the dialler, WhatsApp and the mail app', () => {
    renderWithProviders(<GigContactCard contact={CONTACT} />);
    fireEvent.press(screen.getByTestId('gig-contact-call'));
    fireEvent.press(screen.getByTestId('gig-contact-whatsapp'));
    fireEvent.press(screen.getByTestId('gig-contact-email'));
    expect(openURL).toHaveBeenNthCalledWith(1, 'tel:+919999900000');
    expect(openURL).toHaveBeenNthCalledWith(2, 'https://wa.me/919999900000');
    expect(openURL).toHaveBeenNthCalledWith(3, 'mailto:asha@example.com');
  });

  it('takes a heading and a test id from the caller', () => {
    renderWithProviders(<GigContactCard contact={CONTACT} title="Ravi" testID="freelancer" />);
    expect(screen.getByText('Ravi')).toBeOnTheScreen();
    expect(screen.getByTestId('freelancer-call')).toBeOnTheScreen();
  });

  it('offers only the channels the contact has', () => {
    renderWithProviders(<GigContactCard contact={{ name: 'Bo', phone: '', email: 'bo@x.com' }} />);
    expect(screen.queryByTestId('gig-contact-call')).toBeNull();
    expect(screen.queryByTestId('gig-contact-whatsapp')).toBeNull();
    expect(screen.getByTestId('gig-contact-email')).toBeOnTheScreen();
    expect(screen.queryByText('+91 99999 00000')).toBeNull();
  });

  it('shows no mail line for a contact without an email', () => {
    renderWithProviders(
      <GigContactCard contact={{ name: 'Bo', phone: '+91 99999 00000', email: '' }} />,
    );
    expect(screen.queryByTestId('gig-contact-email')).toBeNull();
    expect(screen.getByTestId('gig-contact-call')).toBeOnTheScreen();
  });
});

describe('GigContactReveal', () => {
  it('hides the contact until it is asked for', () => {
    renderWithProviders(<GigContactReveal jobId="g1" />);
    expect(screen.getByText('gigJobs.contact.hidden')).toBeOnTheScreen();
    expect(screen.queryByTestId('gig-contact-reveal-error')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('reads the contact on the tap and shows the contact card', async () => {
    request.mockResolvedValue({ gigJobContact: CONTACT });
    renderWithProviders(<GigContactReveal jobId="g1" />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-contact-view'));
    });
    expect(request).toHaveBeenCalledWith(GigJobContactDocument, { job_id: 'g1' }, { auth: true });
    expect(await screen.findByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.queryByTestId('gig-contact-reveal')).toBeNull();
  });

  it('blocks a second tap while the contact is being read', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    renderWithProviders(<GigContactReveal jobId="g1" />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-contact-view'));
    });
    expect(screen.getByTestId('gig-contact-view')).toBeDisabled();
    await act(async () => finish({ gigJobContact: CONTACT }));
  });

  it('says one localized line when it fails, logs why, and lets the member try again', async () => {
    const failure = new Error('offline');
    request.mockRejectedValueOnce(failure);
    renderWithProviders(<GigContactReveal jobId="g1" />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-contact-view'));
    });
    expect(await screen.findByTestId('gig-contact-reveal-error')).toHaveTextContent(
      'gigJobs.contact.viewFailed',
    );
    expect(logs.mobileApp.error).toHaveBeenCalledWith(
      'GigJobDetail',
      'revealContact',
      expect.objectContaining({ error: failure, jobId: 'g1' }),
    );
    request.mockResolvedValueOnce({ gigJobContact: CONTACT });
    await act(async () => {
      fireEvent.press(screen.getByTestId('gig-contact-view'));
    });
    expect(await screen.findByText('Asha Rao')).toBeOnTheScreen();
  });
});

describe('GigFacts', () => {
  const jobOf = (patch: Record<string, unknown> = {}) =>
    ({
      id: 'g1',
      title: 'Wedding DJ',
      category_title: 'Music',
      roles: ['DJ', 'MC'],
      event_type: 'EVENT',
      event_date: '2030-02-14T18:00:00.000Z',
      city: 'Lucknow',
      locality: 'Gomti Nagar',
      budget: 25000,
      openings: 2,
      status: 'OPEN',
      poster_role: 'HOST',
      poster_name: 'Asha',
      description: 'Two hour set',
      location: 'Taj Hotel',
      ...patch,
    }) as unknown as GigJob;

  it('shows what the gig is', () => {
    renderWithProviders(<GigFacts job={jobOf()} />);
    expect(screen.getByRole('heading', { name: 'Wedding DJ' })).toBeOnTheScreen();
    expect(screen.getByText(/gigJobs.status/)).toBeOnTheScreen();
    expect(screen.getByText(/^gigJobs\.card\.postedBy\|Asha,/)).toBeOnTheScreen();
    expect(screen.getByText('DJ')).toBeOnTheScreen();
    expect(screen.getByText('MC')).toBeOnTheScreen();
    expect(screen.getByText('Music')).toBeOnTheScreen();
    expect(screen.getByText('day:2030-02-14')).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    expect(screen.getByText('Two hour set')).toBeOnTheScreen();
  });

  it('shows the venue with the place it is in', () => {
    renderWithProviders(<GigFacts job={jobOf()} />);
    expect(screen.getByText(/Taj Hotel, /)).toBeOnTheScreen();
  });

  it('shows just the place when the gig has no venue line', () => {
    renderWithProviders(<GigFacts job={jobOf({ location: '' })} />);
    expect(screen.queryByText(/Taj Hotel/)).toBeNull();
  });

  it('says there is no date for a gig without one', () => {
    renderWithProviders(<GigFacts job={jobOf({ event_date: null })} />);
    expect(screen.getByText('gigJobs.card.noDate')).toBeOnTheScreen();
  });

  it('says the budget is open when none is set', () => {
    renderWithProviders(<GigFacts job={jobOf({ budget: null })} />);
    expect(screen.getByText('gigJobs.card.budgetOpen')).toBeOnTheScreen();
  });

  it('shows no about section for a gig without a description', () => {
    renderWithProviders(<GigFacts job={jobOf({ description: '' })} />);
    expect(screen.queryByText('gigJobs.detail.about')).toBeNull();
  });
});
