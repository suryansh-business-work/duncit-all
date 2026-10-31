/**
 * The banner kit panel — which query each viewer reads the kit through (the
 * partner's own venue or host profile, or the console's record), what it does
 * while loading, failing or finding nothing, and that a save goes to the right
 * mutation with the record's id and says it saved.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { BannerKitFormProps } from '../src/banner-kit/banner-kit-form';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  saveKit: vi.fn(),
  notifySuccess: vi.fn(),
  form: null as BannerKitFormProps | null,
}));

vi.mock('@apollo/client/react', () => ({ useQuery: h.useQuery, useMutation: h.useMutation }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: h.notifySuccess,
}));
// The form has its own suite; here it only has to show what it was handed.
vi.mock('../src/banner-kit/banner-kit-form', () => ({
  BannerKitForm: (props: BannerKitFormProps) => {
    h.form = props;
    return <div data-testid="kit-form">{`${props.entity}:${props.entityId}:${props.name}`}</div>;
  },
}));

const { BannerKitPanel } = await import('../src/banner-kit/BannerKitPanel');
const q = await import('../src/banner-kit/queries');

const KIT = {
  logo_url: '',
  instagram_handle: 'cafe.blue',
  collab_opt_in: true,
  photos: [],
  event_photos: [],
  tagline: '',
  bio: '',
  brand_color: '',
  suggested_photos: [],
};
/** What the panel last handed the form; fails the test when it drew none. */
function formProps(): BannerKitFormProps {
  if (!h.form) throw new Error('The form was not drawn');
  return h.form;
}

const record = (id: string, name: string) => ({ id, name, banner_kit: KIT });
const answer = (data: unknown, over: Record<string, unknown> = {}) =>
  h.useQuery.mockReturnValue({ data, loading: false, error: undefined, ...over });

beforeEach(() => {
  h.useQuery.mockReset();
  h.useMutation.mockReset().mockReturnValue([h.saveKit]);
  h.saveKit.mockReset().mockResolvedValue({});
  h.notifySuccess.mockReset();
  h.form = null;
});

describe('BannerKitPanel', () => {
  it("reads a partner's own venue and saves it through updateVenueBannerKit", async () => {
    answer({ myVenue: record('v1', 'Blue Door') });
    render(<BannerKitPanel entity="VENUE" mode="owner" id="v1" />);

    expect(h.useQuery).toHaveBeenCalledWith(q.OWNER_VENUE_BANNER_KIT, expect.objectContaining({ variables: { venue_id: 'v1' }, skip: false }));
    expect(h.useMutation).toHaveBeenCalledWith(q.UPDATE_VENUE_BANNER_KIT);
    expect(screen.getByTestId('kit-form')).toHaveTextContent('VENUE:v1:Blue Door');
    expect(screen.getByText('Banner kit')).toBeInTheDocument();

    const values = { ...KIT, tagline: 'Hi' };
    await formProps().onSave(values);
    expect(h.saveKit).toHaveBeenCalledWith({ variables: { venue_id: 'v1', input: values } });
    expect(h.notifySuccess).toHaveBeenCalledWith('Banner kit saved');
  });

  it("reads a venue's record in the console", () => {
    answer({ venue: record('v2', 'Green Room') });
    render(<BannerKitPanel entity="VENUE" mode="console" id="v2" />);
    expect(h.useQuery).toHaveBeenCalledWith(q.CONSOLE_VENUE_BANNER_KIT, expect.objectContaining({ variables: { venue_id: 'v2' } }));
    expect(screen.getByTestId('kit-form')).toHaveTextContent('VENUE:v2:Green Room');
  });

  it('reads the signed-in host’s own profile without an id, and saves it by the profile’s id', async () => {
    answer({ myHost: record('h1', 'Asha Rao') });
    render(<BannerKitPanel entity="HOST" mode="owner" />);
    expect(h.useQuery).toHaveBeenCalledWith(q.OWNER_HOST_BANNER_KIT, expect.objectContaining({ variables: {}, skip: false }));
    expect(h.useMutation).toHaveBeenCalledWith(q.UPDATE_HOST_BANNER_KIT);

    await formProps().onSave(KIT);
    expect(h.saveKit).toHaveBeenCalledWith({ variables: { host_id: 'h1', input: KIT } });
  });

  it("reads a host's record in the console, and waits for an id before asking", () => {
    answer(undefined);
    const { rerender } = render(<BannerKitPanel entity="HOST" mode="console" />);
    expect(h.useQuery).toHaveBeenLastCalledWith(q.CONSOLE_HOST_BANNER_KIT, expect.objectContaining({ skip: true }));

    answer({ host: record('h2', 'Ravi') });
    rerender(<BannerKitPanel entity="HOST" mode="console" id="h2" />);
    expect(h.useQuery).toHaveBeenLastCalledWith(q.CONSOLE_HOST_BANNER_KIT, expect.objectContaining({ variables: { host_id: 'h2' }, skip: false }));
    expect(screen.getByTestId('kit-form')).toHaveTextContent('HOST:h2:Ravi');
  });

  it('shows a spinner while the first read is in flight', () => {
    answer(undefined, { loading: true });
    render(<BannerKitPanel entity="VENUE" mode="owner" id="v1" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('kit-form')).not.toBeInTheDocument();
  });

  it('says why the read failed', () => {
    answer(undefined, { error: new Error('Network down') });
    render(<BannerKitPanel entity="VENUE" mode="owner" id="v1" />);
    expect(screen.getByText('Network down')).toBeInTheDocument();
  });

  it('draws no form when the venue is not the caller’s or does not exist', () => {
    answer({ myVenue: null });
    render(<BannerKitPanel entity="VENUE" mode="owner" id="v9" />);
    expect(screen.queryByTestId('kit-form')).not.toBeInTheDocument();
  });

  it('lets a refused save reach the form, without saying it saved', async () => {
    answer({ myVenue: record('v1', 'Blue Door') });
    h.saveKit.mockRejectedValue(new Error('Not your venue'));
    render(<BannerKitPanel entity="VENUE" mode="owner" id="v1" />);
    await waitFor(() => expect(h.form).not.toBeNull());
    await expect(formProps().onSave(KIT)).rejects.toThrow('Not your venue');
    expect(h.notifySuccess).not.toHaveBeenCalled();
  });
});
