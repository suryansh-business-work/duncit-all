import { describe, expect, it } from 'vitest';
import {
  POD_CONTENT_REJECTED,
  podContentRejectionMessage,
  podContentViolationsOf,
  podModerationFormField,
  podModerationImageUrls,
} from '../src/pod-moderation';

const violation = (over: Partial<{ field: string; type: string; message: string; evidence: string | null }> = {}) => ({
  field: 'pod_title',
  type: 'PROFANITY',
  message: 'The title uses language the guidelines do not allow',
  ...over,
});

describe('podModerationFormField', () => {
  it('maps every server field onto the input that holds it', () => {
    expect(podModerationFormField('pod_title')).toBe('pod_title');
    expect(podModerationFormField('pod_description')).toBe('pod_description');
    expect(podModerationFormField('pod_info')).toBe('pod_info');
    expect(podModerationFormField('pod_hashtag')).toBe('pod_hashtag_text');
    expect(podModerationFormField('image')).toBe('media_text');
  });

  it('falls to the title for a field it has never seen, so nothing is swallowed', () => {
    expect(podModerationFormField('pod_something_new')).toBe('pod_title');
  });
});

describe('podModerationImageUrls', () => {
  it('sends only the pictures — a clip the vision model cannot decode fails the whole call', () => {
    const media = [
      { url: 'https://ik.imagekit.io/duncit/pods/a.jpg', type: 'IMAGE' },
      { url: 'https://ik.imagekit.io/duncit/pods/b.mp4', type: 'VIDEO' },
      { url: 'https://ik.imagekit.io/duncit/pods/c.png', type: null },
      { url: 'https://ik.imagekit.io/duncit/pods/d.png' },
    ];

    expect(podModerationImageUrls(media)).toEqual([
      'https://ik.imagekit.io/duncit/pods/a.jpg',
      'https://ik.imagekit.io/duncit/pods/c.png',
      'https://ik.imagekit.io/duncit/pods/d.png',
    ]);
  });

  it('sends nothing for an empty gallery', () => {
    expect(podModerationImageUrls([])).toEqual([]);
  });
});

describe('podContentViolationsOf', () => {
  it('reads the extensions the native client hangs flat on its ApiError', () => {
    const err = { extensions: { code: POD_CONTENT_REJECTED, violations: [violation()] } };
    expect(podContentViolationsOf(err)).toEqual([violation()]);
  });

  it("reads Apollo's shape, where the extensions sit on each graphQLErrors entry", () => {
    const err = {
      graphQLErrors: [{ extensions: { code: POD_CONTENT_REJECTED, violations: [violation({ field: 'image' })] } }],
    };
    expect(podContentViolationsOf(err)).toEqual([violation({ field: 'image' })]);
  });

  it('drops entries that are not violations rather than handing a form a blank error', () => {
    const err = {
      extensions: { code: POD_CONTENT_REJECTED, violations: [violation(), null, 'nope', { field: 'x' }] },
    };
    expect(podContentViolationsOf(err)).toEqual([violation()]);
  });

  it('is empty for any other failure', () => {
    expect(podContentViolationsOf(new Error('network'))).toEqual([]);
    expect(podContentViolationsOf({ extensions: { code: 'FORBIDDEN' } })).toEqual([]);
    expect(podContentViolationsOf({ extensions: { code: POD_CONTENT_REJECTED } })).toEqual([]);
    expect(podContentViolationsOf({ graphQLErrors: [undefined] })).toEqual([]);
    expect(podContentViolationsOf(null)).toEqual([]);
    expect(podContentViolationsOf(undefined)).toEqual([]);
  });
});

describe('podContentRejectionMessage', () => {
  it('leads with the server headline, then one line per rule broken', () => {
    const err = {
      message: 'Your pod content violates the community guidelines',
      extensions: {
        code: POD_CONTENT_REJECTED,
        violations: [violation(), violation({ field: 'pod_description', message: 'The description names a competitor' })],
      },
    };

    expect(podContentRejectionMessage(err)).toBe(
      [
        'Your pod content violates the community guidelines',
        '• The title uses language the guidelines do not allow',
        '• The description names a competitor',
      ].join('\n'),
    );
  });

  it('quotes the evidence beside the rule when the server sent some', () => {
    const err = {
      message: 'Rejected',
      extensions: { code: POD_CONTENT_REJECTED, violations: [violation({ evidence: 'free beer' })] },
    };

    expect(podContentRejectionMessage(err)).toContain('("free beer")');
  });

  it('falls back to its own headline when the error carried none', () => {
    const err = { extensions: { code: POD_CONTENT_REJECTED, violations: [violation({ evidence: null })] } };

    expect(podContentRejectionMessage(err)).toBe(
      ['Your pod content violates the community guidelines', '• The title uses language the guidelines do not allow'].join('\n'),
    );
  });

  it('is null for a failure that was not about content, so the caller keeps its own message', () => {
    expect(podContentRejectionMessage(new Error('network'))).toBeNull();
  });
});
