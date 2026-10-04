import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import { makeShortLinkRow } from '../mocks';

// The ImageKit round-trip is swapped for a plain input that still shows the
// value, error flag and helper text the form hands the field.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  SingleImageUploadField: ({
    label,
    value,
    onChange,
    error,
    helperText,
  }: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    error?: boolean;
    helperText?: string;
  }) => (
    <div data-testid="preview-image-field" data-error={String(!!error)}>
      <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      <span>{helperText}</span>
    </div>
  ),
}));

import ShortLinkForm from '../../src/pages/short-links-page/short-link-form/short-link.form';
import LinkPreviewCard from '../../src/pages/short-links-page/short-link-form/LinkPreviewCard';
import {
  blankShortLinkValues,
  isAllowedExternalDestination,
  shortLinkSchema,
  shortLinkValuesFrom,
} from '../../src/pages/short-links-page/short-link-form/short-link.types';
import {
  SHORT_LINK_DESTINATION_META,
  type ShortLinkDestinationMeta,
} from '../../src/pages/short-links-page/queries';
import type { ShortLinkFormValues } from '../../src/pages/short-links-page/short-link-form/short-link.types';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const LIVE: ShortLinkDestinationMeta = {
  title: 'Badminton at Andheri',
  description: 'Join the pod',
  image_url: null,
  site_name: 'Duncit',
};

/** What the server reads off the destination, or the error it gives back. */
const metaMock = (
  meta: ShortLinkDestinationMeta = LIVE,
  opts: { failWith?: string; destination?: string } = {},
): MockedResponse => ({
  request: {
    query: SHORT_LINK_DESTINATION_META,
    variables: opts.destination ? { destination_url: opts.destination } : () => true,
  },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : {
        result: {
          data: { shortLinkDestinationMeta: { __typename: 'ShortLinkDestinationMeta', ...meta } },
        },
      }),
  maxUsageCount: 20,
});

const DUNCIT_URL = 'https://mweb.duncit.com/club/c1/pod/p1';

const values = (over: Partial<ShortLinkFormValues> = {}): ShortLinkFormValues => ({
  ...blankShortLinkValues(),
  label: 'Diwali pod push',
  destination_url: DUNCIT_URL,
  source: 'INSTAGRAM',
  medium: 'SOCIAL',
  ...over,
});

const renderForm = (
  props: Partial<Parameters<typeof ShortLinkForm>[0]> = {},
  mocks: MockedResponse[] = [metaMock()],
) => {
  const onSubmit = vi.fn();
  renderWithProviders(
    <ShortLinkForm
      submitLabel="Save"
      busy={false}
      initialValues={values()}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      {...props}
    />,
    { mocks },
  );
  return onSubmit;
};

const card = () => screen.getByTestId('short-link-preview-card');
const overrideSwitch = () => screen.getByRole('switch', { name: t('marketing.shortLinks.overridePreview') });
const destinationInput = () => screen.getByRole('textbox', { name: /^Destination/ });
const titleInput = () => screen.getByRole('textbox', { name: /^Preview title/ });
const descriptionInput = () => screen.getByRole('textbox', { name: /^Preview description/ });
const imageInput = () => screen.getByRole('textbox', { name: t('marketing.shortLinks.previewImage') });
/** The preview waits out a 600ms debounce before asking the server. */
const SETTLE = { timeout: 3000 };
/** The form validates asynchronously; a valid one ends with Save enabled. */
const saveEnabled = () => waitFor(() => expect(screen.getByTestId('form-actions-row-submit')).toBeEnabled());

afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('isAllowedExternalDestination', () => {
  it('accepts a public https page outside Duncit', () => {
    expect(isAllowedExternalDestination('https://partner.example.com/offer')).toBe(true);
    expect(isAllowedExternalDestination('https://SHOP.Brand.co.in/a?b=1')).toBe(true);
    // Four parts, but not all numbers: a name, not an address.
    expect(isAllowedExternalDestination('https://a.b.c.com/')).toBe(true);
  });

  it('refuses what is not an https url, or carries credentials', () => {
    expect(isAllowedExternalDestination('not a url')).toBe(false);
    expect(isAllowedExternalDestination('http://partner.example.com/offer')).toBe(false);
    expect(isAllowedExternalDestination('https://user:pass@partner.example.com/')).toBe(false);
    expect(isAllowedExternalDestination('https://user@partner.example.com/')).toBe(false);
  });

  it('sends Duncit and app-store addresses back to the Short Links page', () => {
    expect(isAllowedExternalDestination('https://duncit.com/x')).toBe(false);
    expect(isAllowedExternalDestination('https://mweb.duncit.com/x')).toBe(false);
    expect(isAllowedExternalDestination('https://play.google.com/store')).toBe(false);
    expect(isAllowedExternalDestination('https://apps.apple.com/app/id1')).toBe(false);
  });

  it('refuses hosts that only mean something inside a private network', () => {
    expect(isAllowedExternalDestination('https://localhost/admin')).toBe(false);
    expect(isAllowedExternalDestination('https://intranet/admin')).toBe(false);
    expect(isAllowedExternalDestination('https://192.168.1.10/')).toBe(false);
    expect(isAllowedExternalDestination('https://[::1]/')).toBe(false);
    expect(isAllowedExternalDestination('https://printer.local/')).toBe(false);
    expect(isAllowedExternalDestination('https://router.home.arpa/')).toBe(false);
    expect(isAllowedExternalDestination('https://hidden.onion/')).toBe(false);
  });
});

// ===========================================================================
describe('shortLinkSchema', () => {
  it('judges an external destination by the external rule, with its own message', () => {
    const external = shortLinkSchema(t, true);
    expect(external.safeParse(values({ destination_url: 'https://partner.example.com/offer' })).success).toBe(true);
    const refused = external.safeParse(values({ destination_url: DUNCIT_URL }));
    expect(refused.success).toBe(false);
    expect(refused.error?.issues.map((issue) => issue.message)).toEqual([
      'Use a full https:// link to a public site — a Duncit address belongs on the Short Links page',
    ]);
  });

  it('refuses a preview image that is not a url at all', () => {
    const result = shortLinkSchema(t).safeParse(
      values({ meta_override_enabled: true, meta_title: 'Diwali run', meta_image_url: 'not a url' }),
    );
    expect(result.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['meta_image_url', 'Use a full https:// image link'],
    ]);
  });
});

describe('shortLinkValuesFrom', () => {
  it('blanks every optional field the link never set', () => {
    expect(shortLinkValuesFrom(makeShortLinkRow({ meta_override_enabled: false }))).toEqual({
      label: 'Diwali pod push',
      destination_url: DUNCIT_URL,
      source: 'INSTAGRAM',
      source_other: '',
      medium: 'SOCIAL',
      medium_other: '',
      campaign_id: '',
      meta_override_enabled: false,
      meta_title: '',
      meta_description: '',
      meta_image_url: '',
    });
  });

  it('keeps every optional field the link did set', () => {
    const row = makeShortLinkRow({
      source: 'OTHER',
      source_other: 'Campus Ambassador',
      medium: 'OTHER',
      medium_other: 'Print Flyer',
      campaign_id: 'camp-1',
      meta_override_enabled: true,
      meta_title: 'Diwali night run',
      meta_description: 'Run with us',
      meta_image_url: 'https://ik.imagekit.io/duncit/a.png',
    });
    expect(shortLinkValuesFrom(row)).toMatchObject({
      source_other: 'Campus Ambassador',
      medium_other: 'Print Flyer',
      campaign_id: 'camp-1',
      meta_title: 'Diwali night run',
      meta_description: 'Run with us',
      meta_image_url: 'https://ik.imagekit.io/duncit/a.png',
    });
  });
});

// ===========================================================================
describe('LinkPreviewCard', () => {
  const show = (props: Partial<Parameters<typeof LinkPreviewCard>[0]>) =>
    renderWithProviders(<LinkPreviewCard card={LIVE} ready loading={false} error={null} {...props} />);

  it('asks for a destination before there is one', () => {
    show({ ready: false });
    expect(card()).toHaveTextContent(t('marketing.shortLinks.previewNeedsDestination'));
  });

  it('shows why the destination could not be read', () => {
    show({ error: 'Destination timed out' });
    expect(within(card()).getByRole('alert')).toHaveTextContent('Destination timed out');
  });

  it('says so when the destination publishes no card', () => {
    show({ card: { ...LIVE, title: null } });
    expect(card()).toHaveTextContent(t('marketing.shortLinks.previewNothingPublished'));
    expect(card()).not.toHaveTextContent('Badminton at Andheri');
  });

  it('says so when there is no card at all', () => {
    show({ card: null });
    expect(card()).toHaveTextContent(t('marketing.shortLinks.previewNothingPublished'));
  });

  it('draws the image, site, title and description it was given', () => {
    show({ card: { ...LIVE, image_url: 'https://ik.imagekit.io/duncit/a.png' } });
    expect(card().querySelector('img')).toHaveAttribute('src', 'https://ik.imagekit.io/duncit/a.png');
    expect(card()).toHaveTextContent('Duncit');
    expect(card()).toHaveTextContent('Badminton at Andheri');
    expect(card()).toHaveTextContent('Join the pod');
  });

  it('leaves out what the card does not carry', () => {
    show({ card: { title: 'Only a title', description: null, image_url: null, site_name: null } });
    expect(card().querySelector('img')).toBeNull();
    expect(card()).toHaveTextContent(/^Only a title$/);
  });
});

// ===========================================================================
describe('ShortLinkForm — destination hint', () => {
  it('describes a Duncit destination by default', async () => {
    renderForm();
    await saveEnabled();
    expect(screen.getByText(/The page this link should open, e\.g\. https:\/\/mweb\.duncit\.com/)).toBeInTheDocument();
  });

  it('describes a public destination for an external link', () => {
    renderForm({ external: true, initialValues: values({ destination_url: '' }) });
    expect(screen.getByText(/The public https:\/\/ page this link should open/)).toBeInTheDocument();
  });

  it('explains a locked destination and disables it', async () => {
    renderForm({ lockDestination: true });
    await saveEnabled();
    expect(screen.getByText(t('marketing.shortLinks.shareDestinationLocked'))).toBeInTheDocument();
    expect(destinationInput()).toBeDisabled();
  });
});

// ===========================================================================
describe('ShortLinkForm — link preview', () => {
  it('reads an external destination by the external rule', async () => {
    renderForm({ external: true, initialValues: values({ destination_url: 'https://partner.example.com/offer' }) }, [
      metaMock({ ...LIVE, title: 'Partner offer' }, { destination: 'https://partner.example.com/offer' }),
    ]);
    await waitFor(() => expect(card()).toHaveTextContent('Partner offer'), SETTLE);
  });

  it('shows the error the destination gave back', async () => {
    renderForm({}, [metaMock(LIVE, { failWith: 'Destination timed out' })]);
    await waitFor(() => expect(within(card()).getByRole('alert')).toHaveTextContent('Destination timed out'), SETTLE);
  });

  it('shows a forced title instead of the error once the override has one', async () => {
    renderForm({ initialValues: values({ meta_override_enabled: true, meta_title: 'Forced card' }) }, [
      metaMock(LIVE, { failWith: 'Destination timed out' }),
    ]);
    // Give the read time to fail, then confirm it never replaced the card.
    await act(() => new Promise((resolve) => setTimeout(resolve, 900)));
    expect(within(card()).queryByRole('alert')).not.toBeInTheDocument();
    expect(card()).toHaveTextContent('Forced card');
  });

  it('previews a forced title even before there is a destination to read', () => {
    renderForm({
      initialValues: values({ destination_url: '', meta_override_enabled: true, meta_title: 'Forced card' }),
    });
    expect(card()).toHaveTextContent(/^Forced card$/);
    expect(card()).not.toHaveTextContent(t('marketing.shortLinks.previewNeedsDestination'));
  });

  it('starts the override from the destination’s own card', async () => {
    renderForm();
    await waitFor(() => expect(card()).toHaveTextContent('Badminton at Andheri'), SETTLE);
    expect(screen.queryByRole('textbox', { name: /^Preview title/ })).not.toBeInTheDocument();

    fireEvent.click(overrideSwitch());

    expect(overrideSwitch()).toBeChecked();
    expect(titleInput()).toHaveValue('Badminton at Andheri');
    expect(descriptionInput()).toHaveValue('Join the pod');
    // The destination publishes no image, so there is nothing to start from.
    expect(imageInput()).toHaveValue('');
    expect(screen.getByText('Up to 120 characters')).toBeInTheDocument();
    expect(screen.getByText('Optional, up to 300 characters')).toBeInTheDocument();
    expect(screen.getByText(t('marketing.shortLinks.previewImageHint'))).toBeInTheDocument();
    await saveEnabled();
  });

  it('keeps what was already typed when the override is switched on', async () => {
    renderForm({ initialValues: values({ meta_title: 'My own title' }) });
    await waitFor(() => expect(card()).toHaveTextContent('Badminton at Andheri'), SETTLE);

    fireEvent.click(overrideSwitch());

    expect(titleInput()).toHaveValue('My own title');
    expect(descriptionInput()).toHaveValue('Join the pod');
    await saveEnabled();
  });

  it('switching the override off hides its fields and shows the live card again', async () => {
    renderForm({ initialValues: values({ meta_override_enabled: true, meta_title: 'Forced card' }) });
    expect(titleInput()).toBeInTheDocument();
    await waitFor(() => expect(card()).toHaveTextContent('Join the pod'), SETTLE);
    expect(card()).toHaveTextContent('Forced card');

    fireEvent.click(overrideSwitch());

    expect(overrideSwitch()).not.toBeChecked();
    expect(screen.queryByRole('textbox', { name: /^Preview title/ })).not.toBeInTheDocument();
    expect(card()).toHaveTextContent('Badminton at Andheri');
    expect(card()).not.toHaveTextContent('Forced card');
  });

  it('blends forced fields over the destination’s, and shows a forced image', async () => {
    renderForm({ initialValues: values({ meta_override_enabled: true, meta_title: 'Forced card' }) });
    await waitFor(() => expect(card()).toHaveTextContent('Duncit'), SETTLE);
    // Description left blank keeps the destination's; the site name is always its own.
    expect(card()).toHaveTextContent('Forced card');
    expect(card()).toHaveTextContent('Join the pod');
    expect(card().querySelector('img')).toBeNull();

    fireEvent.change(descriptionInput(), { target: { value: 'Forced blurb' } });
    fireEvent.change(imageInput(), { target: { value: 'https://ik.imagekit.io/duncit/forced.png' } });

    expect(card()).toHaveTextContent('Forced blurb');
    expect(card()).not.toHaveTextContent('Join the pod');
    expect(card().querySelector('img')).toHaveAttribute('src', 'https://ik.imagekit.io/duncit/forced.png');
  });

  it('flags a forced image that is not an https link', async () => {
    renderForm({ initialValues: values({ meta_override_enabled: true, meta_title: 'Forced card' }) });

    fireEvent.change(imageInput(), { target: { value: 'http://cdn.example.org/a.png' } });

    await waitFor(() => expect(screen.getByTestId('preview-image-field')).toHaveAttribute('data-error', 'true'));
    expect(screen.getByText('Use a full https:// image link')).toBeInTheDocument();
    expect(screen.queryByText(t('marketing.shortLinks.previewImageHint'))).not.toBeInTheDocument();
  });

  it('switches a forced card off and empties it when the destination moves', async () => {
    renderForm({
      initialValues: values({
        meta_override_enabled: true,
        meta_title: 'Forced card',
        meta_description: 'Forced blurb',
        meta_image_url: 'https://ik.imagekit.io/duncit/forced.png',
      }),
    });

    fireEvent.change(destinationInput(), { target: { value: 'https://mweb.duncit.com/club/c2/pod/p9' } });

    expect(await screen.findByText(t('marketing.shortLinks.previewOverrideCleared'))).toBeInTheDocument();
    expect(overrideSwitch()).not.toBeChecked();
    expect(screen.queryByRole('textbox', { name: /^Preview title/ })).not.toBeInTheDocument();

    // Back on, the old values are gone and the notice has done its job.
    await waitFor(() => expect(card()).toHaveTextContent('Badminton at Andheri'), SETTLE);
    fireEvent.click(overrideSwitch());
    expect(screen.queryByText(t('marketing.shortLinks.previewOverrideCleared'))).not.toBeInTheDocument();
    expect(titleInput()).toHaveValue('Badminton at Andheri');
    expect(descriptionInput()).toHaveValue('Join the pod');
    expect(imageInput()).toHaveValue('');
    await saveEnabled();
  });

  it('says nothing when the destination moves with no override on', async () => {
    renderForm();
    await saveEnabled();

    fireEvent.change(destinationInput(), { target: { value: 'https://mweb.duncit.com/club/c2/pod/p9' } });

    expect(destinationInput()).toHaveValue('https://mweb.duncit.com/club/c2/pod/p9');
    expect(screen.queryByText(t('marketing.shortLinks.previewOverrideCleared'))).not.toBeInTheDocument();
    expect(overrideSwitch()).not.toBeChecked();
    await saveEnabled();
  });
});
