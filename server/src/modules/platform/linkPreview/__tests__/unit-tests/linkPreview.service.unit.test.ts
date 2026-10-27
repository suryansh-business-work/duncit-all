import { linkPreviewService } from '../../linkPreview.service';
import { podService } from '@modules/pods/pod/pod.service';
import { clubService } from '@modules/clubs/club/club.service';
import { userService } from '@modules/access/user/user.service';
import { venueService } from '@modules/venues/venue/venue.service';
import { inventoryService } from '@modules/venues/inventory/inventory.service';
import { postService } from '@modules/engagement/post/post.service';
import { locationService } from '@modules/platform/location/location.service';
import { isPodHidden } from '@utils/hidden';

jest.mock('@modules/pods/pod/pod.service', () => ({ podService: { getBySlugs: jest.fn(), getById: jest.fn() } }));
jest.mock('@modules/clubs/club/club.service', () => ({ clubService: { getBySlug: jest.fn() } }));
jest.mock('@modules/access/user/user.service', () => ({ userService: { getByHandle: jest.fn(), getById: jest.fn() } }));
jest.mock('@modules/venues/venue/venue.service', () => ({ venueService: { getPublicById: jest.fn() } }));
jest.mock('@modules/venues/inventory/inventory.service', () => ({ inventoryService: { getById: jest.fn() } }));
jest.mock('@modules/engagement/post/post.service', () => ({ postService: { getById: jest.fn() } }));
jest.mock('@modules/platform/location/location.service', () => ({ locationService: { getBySlugOrId: jest.fn() } }));
jest.mock('@utils/hidden', () => ({ isPodHidden: jest.fn() }));

const resolve = linkPreviewService.resolve;

describe('resolve guards', () => {
  it('returns null for an empty id or an unknown kind', async () => {
    await expect(resolve('POD', '', null)).resolves.toBeNull();
    await expect(resolve('NOPE' as never, 'x', null)).resolves.toBeNull();
  });

  it('degrades any lookup failure to null', async () => {
    (podService.getById as jest.Mock).mockRejectedValue(new Error('CastError'));
    await expect(resolve('POD', 'bad-id', null)).resolves.toBeNull();
  });
});

describe('POD', () => {
  const pod = (over = {}) => ({
    pod_title: 'Sunday run', pod_description: 'A <b>fun</b>\n  run', pod_images_and_videos: [
      { url: 'v.mp4', type: 'VIDEO' }, { url: '' , type: 'IMAGE' }, null, { url: 'untyped.jpg' }, { url: 'late.jpg', type: 'IMAGE' },
    ], ...over,
  });

  it('resolves by id: markup stripped, whitespace collapsed, first image (untyped counts as image)', async () => {
    (podService.getById as jest.Mock).mockResolvedValue(pod());
    (isPodHidden as jest.Mock).mockReturnValue(false);
    await expect(resolve('POD', 'p1', null)).resolves.toEqual({
      title: 'Sunday run', description: 'A fun run', image_url: 'untyped.jpg', canonical_path: null,
    });
    expect(podService.getBySlugs).not.toHaveBeenCalled();
  });

  it('resolves by club slug and pod slug when both are present', async () => {
    (podService.getBySlugs as jest.Mock).mockResolvedValue(pod({ pod_images_and_videos: [{ url: 'v', type: 'VIDEO' }] }));
    (isPodHidden as jest.Mock).mockReturnValue(false);
    const card = await resolve('POD', 'club-a', 'pod-b');
    expect(podService.getBySlugs).toHaveBeenCalledWith('club-a', 'pod-b');
    expect(card?.image_url).toBeNull();
  });

  it('has no image when the media is not a list', async () => {
    (podService.getById as jest.Mock).mockResolvedValue(pod({ pod_images_and_videos: undefined }));
    (isPodHidden as jest.Mock).mockReturnValue(false);
    expect((await resolve('POD', 'p1', null))?.image_url).toBeNull();
  });

  it('gives nothing for a missing or hidden pod', async () => {
    (podService.getById as jest.Mock).mockResolvedValue(null);
    await expect(resolve('POD', 'p1', null)).resolves.toBeNull();
    (podService.getById as jest.Mock).mockResolvedValue(pod());
    (isPodHidden as jest.Mock).mockReturnValue(true);
    await expect(resolve('POD', 'p1', null)).resolves.toBeNull();
  });

  it('gives nothing when the title is blank, and trims long descriptions to 300 characters', async () => {
    (isPodHidden as jest.Mock).mockReturnValue(false);
    (podService.getById as jest.Mock).mockResolvedValue(pod({ pod_title: '  <i></i> ' }));
    await expect(resolve('POD', 'p1', null)).resolves.toBeNull();
    (podService.getById as jest.Mock).mockResolvedValue(pod({ pod_title: 42, pod_description: 'x'.repeat(400) }));
    await expect(resolve('POD', 'p1', null)).resolves.toBeNull();
    (podService.getById as jest.Mock).mockResolvedValue(pod({ pod_description: 'y'.repeat(400) }));
    const card = await resolve('POD', 'p1', null);
    expect(card?.description).toBe(`${'y'.repeat(299)}…`);
    (podService.getById as jest.Mock).mockResolvedValue(pod({ pod_description: 'z'.repeat(300) }));
    expect((await resolve('POD', 'p1', null))?.description).toBe('z'.repeat(300));
  });

  it('has a null description for blank or non-string descriptions, and drops an unterminated tag', async () => {
    (isPodHidden as jest.Mock).mockReturnValue(false);
    (podService.getById as jest.Mock).mockResolvedValue(pod({ pod_description: '   ' }));
    expect((await resolve('POD', 'p1', null))?.description).toBeNull();
    (podService.getById as jest.Mock).mockResolvedValue(pod({ pod_description: { rich: true } }));
    expect((await resolve('POD', 'p1', null))?.description).toBeNull();
    (podService.getById as jest.Mock).mockResolvedValue(pod({ pod_description: 'hello <b' }));
    expect((await resolve('POD', 'p1', null))?.description).toBe('hello');
  });
});

describe('CLUB', () => {
  it('builds a card from the club and its first image', async () => {
    (clubService.getBySlug as jest.Mock).mockResolvedValue({
      club_name: 'Runners', club_description: 'We run', club_feature_images_and_videos: [{ url: 'c.jpg', type: 'IMAGE' }],
    });
    await expect(resolve('CLUB', 'runners', null)).resolves.toEqual({
      title: 'Runners', description: 'We run', image_url: 'c.jpg', canonical_path: null,
    });
  });

  it('gives nothing for a missing or hidden club', async () => {
    (clubService.getBySlug as jest.Mock).mockResolvedValue(null);
    await expect(resolve('CLUB', 'x', null)).resolves.toBeNull();
    (clubService.getBySlug as jest.Mock).mockResolvedValue({ club_name: 'H', is_hidden: true });
    await expect(resolve('CLUB', 'x', null)).resolves.toBeNull();
  });
});

describe('USER', () => {
  it('uses the full name, bio and photo, and names the handle URL as canonical', async () => {
    (userService.getByHandle as jest.Mock).mockResolvedValue({
      full_name: 'Asha Rao', bio: 'hi', profile_photo: 'p.jpg', username: 'asha', profile_visibility: 'PUBLIC',
    });
    await expect(resolve('USER', '@asha', null)).resolves.toEqual({
      title: 'Asha Rao', description: 'hi', image_url: 'p.jpg', canonical_path: '/u/asha',
    });
  });

  it('hides the bio of a private profile and keeps a card without a username uncanonical', async () => {
    (userService.getByHandle as jest.Mock).mockResolvedValue({ full_name: 'Asha', bio: 'secret', profile_visibility: 'PRIVATE' });
    await expect(resolve('USER', 'u1', null)).resolves.toEqual({
      title: 'Asha', description: null, image_url: null, canonical_path: null,
    });
  });

  it('builds the name from first and last when there is no full name, treating no visibility as public', async () => {
    (userService.getByHandle as jest.Mock).mockResolvedValue({ first_name: 'Asha', last_name: 'Rao', bio: 'b' });
    await expect(resolve('USER', 'u1', null)).resolves.toMatchObject({ title: 'Asha Rao', description: 'b' });
    (userService.getByHandle as jest.Mock).mockResolvedValue({ first_name: 'Solo' });
    await expect(resolve('USER', 'u1', null)).resolves.toMatchObject({ title: 'Solo' });
  });

  it('gives nothing for an unknown user, a failed lookup, or a user with no name', async () => {
    (userService.getByHandle as jest.Mock).mockResolvedValue(null);
    await expect(resolve('USER', 'u1', null)).resolves.toBeNull();
    (userService.getByHandle as jest.Mock).mockRejectedValue(new Error('cast'));
    await expect(resolve('USER', 'u1', null)).resolves.toBeNull();
    (userService.getByHandle as jest.Mock).mockResolvedValue({ username: 'ghost' });
    await expect(resolve('USER', 'u1', null)).resolves.toBeNull();
  });
});

describe('POST', () => {
  it('titles the card with the author and shows the image of an image post', async () => {
    (postService.getById as jest.Mock).mockResolvedValue({ author_id: 'a1', caption: 'Nice', media_type: 'IMAGE', image_url: 'i.jpg' });
    (userService.getById as jest.Mock).mockResolvedValue({ full_name: 'Asha', profile_visibility: 'PUBLIC' });
    await expect(resolve('POST', 'post1', null)).resolves.toEqual({
      title: 'Asha', description: 'Nice', image_url: 'i.jpg', canonical_path: null,
    });
    expect(postService.getById).toHaveBeenCalledWith('post1', null);
  });

  it('hides the caption of a private author and the image of a video post', async () => {
    (postService.getById as jest.Mock).mockResolvedValue({ author_id: 'a1', caption: 'Nice', media_type: 'VIDEO', image_url: 'thumb.jpg' });
    (userService.getById as jest.Mock).mockResolvedValue({ full_name: 'Asha', profile_visibility: 'PRIVATE' });
    await expect(resolve('POST', 'post1', null)).resolves.toMatchObject({ description: null, image_url: null });
  });

  it('gives nothing for a missing post or an author that cannot be resolved', async () => {
    (postService.getById as jest.Mock).mockResolvedValue(null);
    await expect(resolve('POST', 'p', null)).resolves.toBeNull();
    (postService.getById as jest.Mock).mockResolvedValue({ author_id: 'a1', caption: 'c', media_type: 'IMAGE' });
    (userService.getById as jest.Mock).mockRejectedValue(new Error('gone'));
    await expect(resolve('POST', 'p', null)).resolves.toBeNull();
    (userService.getById as jest.Mock).mockResolvedValue(null);
    await expect(resolve('POST', 'p', null)).resolves.toBeNull();
  });
});

describe('VENUE', () => {
  it('uses the cover image, else the first gallery image', async () => {
    (venueService.getPublicById as jest.Mock).mockResolvedValue({ venue_name: 'Cafe', description: 'd', cover_image_url: 'cov.jpg', gallery: ['g.jpg'] });
    await expect(resolve('VENUE', 'v1', null)).resolves.toMatchObject({ title: 'Cafe', image_url: 'cov.jpg' });
    (venueService.getPublicById as jest.Mock).mockResolvedValue({ venue_name: 'Cafe', cover_image_url: '', gallery: ['g.jpg'] });
    await expect(resolve('VENUE', 'v1', null)).resolves.toMatchObject({ image_url: 'g.jpg' });
    (venueService.getPublicById as jest.Mock).mockResolvedValue({ venue_name: 'Cafe', gallery: 'nope' });
    await expect(resolve('VENUE', 'v1', null)).resolves.toMatchObject({ image_url: null });
  });

  it('gives nothing for an unknown venue', async () => {
    (venueService.getPublicById as jest.Mock).mockResolvedValue(null);
    await expect(resolve('VENUE', 'v1', null)).resolves.toBeNull();
  });
});

describe('PRODUCT', () => {
  const product = (over = {}) => ({
    product_name: 'Leash', short_description: 'short', description: 'long', image_url: '', images: [], variants: [], is_active: true, status: 'ACTIVE', ...over,
  });

  it('prefers the product image, then its first image, then the first variant image', async () => {
    (inventoryService.getById as jest.Mock).mockResolvedValue(product({ image_url: 'main.jpg', images: ['a.jpg'] }));
    await expect(resolve('PRODUCT', 'p1', null)).resolves.toMatchObject({ title: 'Leash', description: 'short', image_url: 'main.jpg' });
    (inventoryService.getById as jest.Mock).mockResolvedValue(product({ images: ['a.jpg'] }));
    await expect(resolve('PRODUCT', 'p1', null)).resolves.toMatchObject({ image_url: 'a.jpg' });
    (inventoryService.getById as jest.Mock).mockResolvedValue(product({ variants: [{ images: ['v.jpg'] }] }));
    await expect(resolve('PRODUCT', 'p1', null)).resolves.toMatchObject({ image_url: 'v.jpg' });
    (inventoryService.getById as jest.Mock).mockResolvedValue(product({ short_description: '' }));
    await expect(resolve('PRODUCT', 'p1', null)).resolves.toMatchObject({ description: 'long', image_url: null });
  });

  it('hides missing, paused and archived products', async () => {
    (inventoryService.getById as jest.Mock).mockResolvedValue(null);
    await expect(resolve('PRODUCT', 'p1', null)).resolves.toBeNull();
    (inventoryService.getById as jest.Mock).mockResolvedValue(product({ is_active: false }));
    await expect(resolve('PRODUCT', 'p1', null)).resolves.toBeNull();
    (inventoryService.getById as jest.Mock).mockResolvedValue(product({ status: 'ARCHIVED' }));
    await expect(resolve('PRODUCT', 'p1', null)).resolves.toBeNull();
  });
});

describe('LOCATION', () => {
  const location = (over = {}) => ({
    is_active: true, is_launched: false, location_name: 'Pune', location_image: 'pune.jpg', location_id: 'pune-slug', ...over,
  });

  it('builds a coming-soon card that names the city URL as canonical', async () => {
    (locationService.getBySlugOrId as jest.Mock).mockResolvedValue(location());
    await expect(resolve('LOCATION', 'pune', null)).resolves.toEqual({
      title: 'Pune', description: null, image_url: 'pune.jpg', canonical_path: '/city-launch/pune-slug',
    });
  });

  it.each([
    ['unknown', null],
    ['inactive', location({ is_active: false })],
    ['launched', location({ is_launched: true })],
    ['nameless', location({ location_name: ' ' })],
  ])('gives nothing for a %s city', async (_label, doc) => {
    (locationService.getBySlugOrId as jest.Mock).mockResolvedValue(doc);
    await expect(resolve('LOCATION', 'x', null)).resolves.toBeNull();
  });
});
