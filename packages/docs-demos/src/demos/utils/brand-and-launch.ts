import {
  clubCityName,
  clubOptionLabel,
  clubPlaceLabel,
  groupClubsByCity,
  groupClubsByLocality,
  localitiesByClubCount,
  resolveThemeTokens,
  DEFAULT_LAUNCH_TARGET,
  EMPTY_LAUNCH_MEDIA,
  LAUNCH_ROLE_SECTIONS,
  compareCitiesLaunchedFirst,
  formatCount,
  launchProgress,
  launchSectionMedia,
  showsWaitlist,
  packagingGaps,
  parcelWeights,
  brandCompletionPercent,
  brandNextStepIndex,
  brandStepStates,
} from '@duncit/utils';
import { dark, light } from '@duncit/auth-tokens';
import { defineDemo, type PackageDemo } from '../../types';
import type {
  ClubGroupingMock,
  ParcelMock,
  BrandWizardMock,
  CityLaunchMock,
  ThemeTokensMock,
} from './mocks';
import { mwebT } from './translators';

export const brandAndLaunchDemos: PackageDemo[] = [
  defineDemo<ThemeTokensMock>({
    id: 'theme-tokens',
    title: 'Where mWeb and the app take their colours from',
    note:
      "Flip theme_token_source to 'SERVER' and the admin's primary replaces the bundled #d92d2d. Blank a value and that token goes back to the bundled one — the admin only overrides what they change. On LOCAL the admin's values are ignored, and the very same palette objects come back, so no theme is rebuilt.",
    mock: {
      theme_token_source: 'LOCAL',
      theme_tokens_light: { primary: '#1d4ed8', primaryHover: '#1a46c2', accent: '' },
      theme_tokens_dark: { primary: '#1d4ed8', accent: '#60a5fa' },
    },
    compute: (mock) => {
      const local = { light, dark };
      const palettes = resolveThemeTokens(local, mock);
      return {
        'Light primary / hover': `${palettes.light.primary} / ${palettes.light.primaryHover}`,
        'Light accent (blank → bundled)': palettes.light.accent,
        'Dark primary / accent': `${palettes.dark.primary} / ${palettes.dark.accent}`,
        'Bundled palettes returned untouched': palettes === local,
      };
    },
  }),

  defineDemo<ParcelMock>({
    id: 'parcel-weights',
    title: 'What the courier bills for a parcel',
    note:
      'A dog bed packed 70 × 50 × 20 cm weighs 2.5 kg but ships at 14 kg — the box out-weighs the bed, so the form warns. Shrink the box (try 60 × 40 × 15 at 10.4 kg, a food bag) and the packed weight wins again. Zero a side and it shows up as missing.',
    mock: { weight_kg: 2.5, length_cm: 70, breadth_cm: 50, height_cm: 20 },
    compute: (mock) => {
      const weights = parcelWeights(mock);
      return {
        'Volumetric weight (kg)': weights.volumetric,
        'Chargeable weight (kg)': weights.chargeable,
        'Box heavier than contents': weights.boxHeavier,
        'Missing values': packagingGaps(mock).join(', ') || 'none',
      };
    },
  }),

  defineDemo<BrandWizardMock>({
    id: 'brand-wizard',
    title: 'How far a brand is through onboarding',
    note:
      'Yonex has filled six of the eight required steps. Flip razorpay_connected to true and the percentage moves to 88 with only the consent left; sign it (consent_signed: true) and it reads 100 — the point at which the server lets the brand be submitted. Payout is optional, so leaving it blank never lowers the number.',
    mock: {
      brand_name: 'Yonex',
      description: 'Badminton racquets, shuttles and grips for club players.',
      contact_email: 'ops@yonex.in',
      registered_business_name: 'Yonex India Pvt Ltd',
      gstin: '29AABCY1234F1ZP',
      pan: '',
      address_line1: '14 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560001',
      product_categories: ['Sports Equipment'],
      logo_url: 'https://ik.imagekit.io/duncit/brands/yonex-logo.png',
      documents: [{ type: 'GST certificate', url: 'https://ik.imagekit.io/duncit/brands/yonex-gst.pdf' }],
      account_number: '',
      ifsc_code: '',
      upi_id: '',
      shiprocket_connected: true,
      razorpay_connected: false,
      consent_signed: false,
    },
    compute: (mock) => ({
      'Completion (%)': brandCompletionPercent(mock),
      'Opens on step': brandNextStepIndex(mock) + 1,
      'Still to do': brandStepStates(mock)
        .filter((step) => step.required && !step.complete)
        .map((step) => step.key)
        .join(', ') || 'nothing — ready to submit',
    }),
  }),

  defineDemo<CityLaunchMock>({
    id: 'city-launch',
    title: 'A city that has not launched yet',
    note:
      'Ahmedabad is not launched, so its picker tile counts the people waiting and choosing it opens the waitlist. Set is_launched to true (or null, as an older location reads) and the tile goes back to clubs. Push subscriber_count past launch_target and the bar stops at 100; set launch_target to 0 and it reads 0. The picker lists the live cities of Gujarat before Ahmedabad; flip is_launched and it moves to the front. The page is four full-height sections: blank hero_video_url and the top section falls back to its image; blank both and it draws the dark ground alone.',
    mock: {
      location_name: 'Ahmedabad',
      is_launched: false,
      subscriber_count: 1252,
      launch_target: DEFAULT_LAUNCH_TARGET,
      launch_media: {
        ...EMPTY_LAUNCH_MEDIA,
        hero_video_url: 'https://ik.imagekit.io/esdata1/launch/ahmedabad-riverfront.mp4',
        hero_image_url: 'https://ik.imagekit.io/esdata1/launch/ahmedabad-riverfront.jpg',
      },
    },
    compute: (mock) => ({
      'Shows the waitlist': showsWaitlist(mock),
      'Tile caption': mwebT('mweb.cityLaunch.peopleIn', { count: mock.subscriber_count }),
      'Hero number': formatCount(mock.subscriber_count),
      'Progress bar': `${launchProgress(mock.subscriber_count, mock.launch_target)}%`,
      'Goal line': mwebT('mweb.cityLaunch.launchGoal', { vars: { target: formatCount(mock.launch_target) } }),
      'Top section backdrop': launchSectionMedia(mock.launch_media, 'hero'),
      'Host section backdrop': launchSectionMedia(mock.launch_media, 'host'),
      'Role sections': LAUNCH_ROLE_SECTIONS.map((role) => `${role.section} → ${role.kind}`).join(', '),
      'Picker order': [
        { location_name: 'Surat', is_launched: true },
        { location_name: 'Rajkot', is_launched: true },
        mock,
      ]
        .sort(compareCitiesLaunchedFirst)
        .map((city) => city.location_name)
        .join(', '),
    }),
  }),

  defineDemo<ClubGroupingMock>({
    id: 'club-grouping',
    title: 'The Clubs tab, grouped by city and then by locality',
    note:
      'Change a club\'s location_id to loc-blr and it moves to the Bengaluru card. Blank its locality and it drops into the last, no-area section. Point openCityId at another city to see that city\'s sections. Give Aundh a club and it climbs out of the disabled tail of the Locality dropdown.',
    mock: {
      locations: [
        { id: 'loc-pune', location_name: 'Pune', city: 'Pune', location_image: '' },
        { id: 'loc-blr', location_name: 'Bengaluru', city: 'Bengaluru', location_image: '' },
      ],
      clubs: [
        { club_name: 'Smashers United', location_id: 'loc-pune', locality: 'Kothrud' },
        { club_name: 'Baner Book Circle', location_id: 'loc-pune', locality: 'Baner' },
        { club_name: 'Sunday Striders', location_id: 'loc-pune', locality: '' },
        { club_name: 'Indiranagar Runners', location_id: 'loc-blr', locality: 'Indiranagar' },
      ],
      openCityId: 'loc-pune',
      zones: ['Aundh', 'Baner', 'Kothrud', 'Viman Nagar'],
    },
    compute: (mock) => {
      const openCity = mock.locations.find((location) => location.id === mock.openCityId);
      const cityClubs = mock.clubs.filter((club) => club.location_id === mock.openCityId);
      return {
        'City cards': groupClubsByCity(mock.clubs, mock.locations).map(
          (group) => `${group.city} — ${group.clubs.length} clubs`,
        ),
        'Opened city': openCity ? clubCityName(openCity) : '(not a known city)',
        'Create a Pod club picker': mock.clubs.map((club) =>
          clubOptionLabel(club.club_name, clubPlaceLabel(club, mock.locations)),
        ),
        'Its locality sections': groupClubsByLocality(cityClubs).map(
          (group) => `${group.locality || 'Other areas'}: ${group.clubs.map((club) => club.club_name).join(', ')}`,
        ),
        'Create a Pod Locality dropdown': localitiesByClubCount(mock.zones, cityClubs).map(
          (item) => `${item.locality} — ${item.count} clubs${item.count === 0 ? ' (disabled)' : ''}`,
        ),
      };
    },
  }),
];
