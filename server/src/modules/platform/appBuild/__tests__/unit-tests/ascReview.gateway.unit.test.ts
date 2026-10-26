import { addVersionToSubmission, openReviewSubmission, submitForReview } from '../../ascReview.gateway';
import { asc } from '../../appStoreConnect.gateway';

jest.mock('../../appStoreConnect.gateway', () => ({
  asc: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const get = asc.get as jest.Mock;
const post = asc.post as jest.Mock;
const patch = asc.patch as jest.Mock;

describe('openReviewSubmission', () => {
  it('reuses the submission that is still open', async () => {
    get.mockResolvedValue({ data: [{ id: 501 }] });
    await expect(openReviewSubmission('t', 'app1')).resolves.toBe('501');
    const params = new URLSearchParams(get.mock.calls[0][1].split('?')[1]);
    expect(params.get('filter[app]')).toBe('app1');
    expect(params.get('filter[state]')).toBe('READY_FOR_REVIEW,UNRESOLVED_ISSUES');
    expect(post).not.toHaveBeenCalled();
  });

  it('opens a new submission when none is open', async () => {
    get.mockResolvedValue({ data: [] });
    post.mockResolvedValue({ data: { id: 'new1' } });
    await expect(openReviewSubmission('t', 'app1')).resolves.toBe('new1');
    expect(post).toHaveBeenCalledWith('t', '/reviewSubmissions', {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: 'app1' } } },
    });
  });

  it('opens a new submission when Apple returns no list', async () => {
    get.mockResolvedValue({});
    post.mockResolvedValue({ data: { id: 'new2' } });
    await expect(openReviewSubmission('t', 'app1')).resolves.toBe('new2');
  });
});

describe('addVersionToSubmission', () => {
  it('adds the version to the basket', async () => {
    get.mockResolvedValue({ data: [{ relationships: { appStoreVersion: { data: { id: 'other' } } } }, {}] });
    await addVersionToSubmission('t', 's1', 'v1');
    expect(get.mock.calls[0][1]).toContain('/reviewSubmissions/s1/items?');
    expect(post).toHaveBeenCalledWith('t', '/reviewSubmissionItems', {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: 's1' } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: 'v1' } },
      },
    });
  });

  it('does not add it twice when an earlier attempt already did', async () => {
    get.mockResolvedValue({ data: [{ relationships: { appStoreVersion: { data: { id: 'v1' } } } }] });
    await addVersionToSubmission('t', 's1', 'v1');
    expect(post).not.toHaveBeenCalled();
  });

  it('adds it when Apple returns no list', async () => {
    get.mockResolvedValue({});
    await addVersionToSubmission('t', 's1', 'v1');
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('submitForReview', () => {
  it('hands the basket to App Review', async () => {
    await submitForReview('t', 's1');
    expect(patch).toHaveBeenCalledWith('t', '/reviewSubmissions/s1', { type: 'reviewSubmissions', id: 's1', attributes: { submitted: true } });
  });
});
