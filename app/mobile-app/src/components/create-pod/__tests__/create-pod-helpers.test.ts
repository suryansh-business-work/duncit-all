import {
  buildModerationInput,
  filterClubs,
  hostCategoryKeyOf,
  MODERATION_FIELD_MAP,
  stepForField,
} from '@/components/create-pod/create-pod.form';
import { blankCreatePodForm } from '@/components/create-pod/create-pod.types';

describe('hostCategoryKeyOf', () => {
  it('joins super + sub ids, defaulting missing ids to empty', () => {
    expect(hostCategoryKeyOf({ super_category_id: 's', sub_category_id: 'x' })).toBe('s|x');
    expect(hostCategoryKeyOf({ super_category_id: 's' })).toBe('s|');
    expect(hostCategoryKeyOf({})).toBe('|');
  });
});

describe('filterClubs', () => {
  const cats = [
    {
      super_category_id: 's1',
      sub_category_id: 'sub1',
      super_category_name: 'A',
      category_name: 'B',
      sub_category_name: 'C',
    },
  ];
  const base = {
    hostCategories: cats,
    selectedCategoryKey: '',
    locationId: '',
    locality: '',
    podMode: 'PHYSICAL',
  };
  const club = (over: Record<string, unknown> = {}) => ({
    id: 'c',
    club_name: 'c',
    super_category_id: 's1',
    category_id: 'sub1',
    location_id: 'l1',
    locality: 'Camp',
    ...over,
  });

  it('keeps a club matching the selected category, city and locality', () => {
    expect(
      filterClubs([club()], {
        ...base,
        selectedCategoryKey: 's1|sub1',
        locationId: 'l1',
        locality: 'Camp',
      }),
    ).toHaveLength(1);
  });
  it('drops a club with no locality when a locality is selected', () => {
    expect(
      filterClubs([club({ locality: undefined })], { ...base, locality: 'Camp' }),
    ).toHaveLength(0);
  });
  it('drops a club in another city', () => {
    expect(filterClubs([club({ location_id: 'l2' })], { ...base, locationId: 'l1' })).toHaveLength(
      0,
    );
  });
  it('keeps everything for virtual pods regardless of city/locality', () => {
    expect(
      filterClubs([club({ location_id: 'l2', locality: 'X' })], {
        ...base,
        locationId: 'l1',
        locality: 'Camp',
        podMode: 'VIRTUAL',
      }),
    ).toHaveLength(1);
  });
  it('does not over-filter when the host has no categories', () => {
    expect(
      filterClubs([club({ super_category_id: null })], { ...base, hostCategories: [] }),
    ).toHaveLength(1);
  });
  it('drops a category-less club while the host has categories', () => {
    expect(filterClubs([club({ super_category_id: null })], base)).toHaveLength(0);
  });
  it('matches a super-only host entry to any sub in that super', () => {
    const superOnly = [
      {
        super_category_id: 's1',
        super_category_name: 'A',
        category_name: '',
        sub_category_name: '',
      },
    ];
    expect(
      filterClubs([club({ category_id: 'other' })], { ...base, hostCategories: superOnly }),
    ).toHaveLength(1);
  });
});

describe('buildModerationInput', () => {
  it('trims text, splits hashtags, keeps only image URLs and nulls empty info', () => {
    const input = buildModerationInput({
      ...blankCreatePodForm,
      pod_title: '  Hi  ',
      pod_description: 'desc',
      pod_info: '',
      pod_hashtag_text: '#run, hike',
      media_text: 'https://cdn/a.jpg\nhttps://cdn/b.mp4',
    });
    expect(input.pod_title).toBe('Hi');
    expect(input.pod_info).toBeNull();
    expect(input.pod_hashtag).toEqual(['run', 'hike']);
    expect(input.image_urls).toEqual(['https://cdn/a.jpg']);
  });
  it('passes pod_info through when present', () => {
    expect(buildModerationInput({ ...blankCreatePodForm, pod_info: 'more' }).pod_info).toBe('more');
  });
});

describe('stepForField', () => {
  it('maps a known field to its step and an unknown field to 0', () => {
    expect(stepForField('pod_type')).toBe(3);
    expect(stepForField('venue_id')).toBe(2);
    expect(stepForField('__nope__' as never)).toBe(0);
  });
});

describe('MODERATION_FIELD_MAP', () => {
  it('maps server fields to form fields', () => {
    expect(MODERATION_FIELD_MAP.pod_hashtag).toBe('pod_hashtag_text');
    expect(MODERATION_FIELD_MAP.image).toBe('media_text');
  });
});
