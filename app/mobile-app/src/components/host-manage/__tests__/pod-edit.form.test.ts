import {
  blankPodEditValues,
  buildHostUpdateInput,
  hasImageLine,
  POD_DELETE_REASON_SUBJECTS,
  podEditInitialValues,
  podEditSchema,
  validateDeleteReason,
} from '../pod-edit.form';

const valid = {
  pod_title: 'Sunday community hike',
  pod_description: 'A relaxed group hike around the lake.',
  media_text: 'https://cdn/img.jpg',
};

const issuesOf = (values: typeof valid) => {
  const result = podEditSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('hasImageLine', () => {
  it('detects an image among videos and rejects video-only lists', () => {
    expect(hasImageLine('')).toBe(false);
    expect(hasImageLine('https://cdn/clip.mp4')).toBe(false);
    expect(hasImageLine('https://cdn/clip.mp4\nhttps://cdn/img.jpg')).toBe(true);
  });
});

describe('podEditSchema', () => {
  it('accepts valid values', () => {
    expect(podEditSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a short title, short description and missing image', () => {
    const paths = issuesOf({ pod_title: 'x', pod_description: 'short', media_text: '' });
    expect(paths).toEqual(expect.arrayContaining(['pod_title', 'pod_description', 'media_text']));
  });
});

describe('buildHostUpdateInput', () => {
  it('maps trimmed fields and typed media', () => {
    const input = buildHostUpdateInput({
      ...valid,
      pod_title: '  Hike  ',
      media_text: 'https://cdn/img.jpg\nhttps://cdn/clip.mp4\n',
    });
    expect(input.pod_title).toBe('Hike');
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://cdn/img.jpg', type: 'IMAGE' },
      { url: 'https://cdn/clip.mp4', type: 'VIDEO' },
    ]);
  });
});

describe('podEditInitialValues', () => {
  it('prefills from the pod media list', () => {
    const values = podEditInitialValues({
      id: 'p1',
      pod_title: 'Hike',
      pod_description: 'desc',
      pod_images_and_videos: [
        { url: 'https://cdn/a.jpg', type: 'IMAGE' },
        { url: 'https://cdn/b.mp4', type: 'VIDEO' },
      ],
    });
    expect(values).toEqual({
      pod_title: 'Hike',
      pod_description: 'desc',
      media_text: 'https://cdn/a.jpg\nhttps://cdn/b.mp4',
    });
  });

  it('tolerates missing fields and a missing pod', () => {
    expect(podEditInitialValues(null)).toEqual(blankPodEditValues);
    expect(
      podEditInitialValues({
        id: 'p1',
        pod_title: undefined as never,
        pod_description: null,
        pod_images_and_videos: null,
      }),
    ).toEqual(blankPodEditValues);
  });
});

describe('validateDeleteReason', () => {
  it('demands a subject, then a note only for Other', () => {
    expect(validateDeleteReason('', '')).toMatch(/select a reason/i);
    expect(validateDeleteReason('Other', '  ')).toMatch(/describe the reason/i);
    expect(validateDeleteReason('Other', 'Family emergency')).toBeNull();
    expect(validateDeleteReason('Event cancelled', '')).toBeNull();
  });

  it('offers the dropdown subjects including Other', () => {
    expect(POD_DELETE_REASON_SUBJECTS).toContain('Other');
  });
});
