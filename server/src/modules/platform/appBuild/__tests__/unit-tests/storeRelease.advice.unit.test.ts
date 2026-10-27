import { adviseIssue } from '../../storeRelease.advice';
import { getStoreListing } from '../../storeListing.service';
import { StoreReleaseIssueModel } from '../../storeRelease.model';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { logs } from '@observability/log';

jest.mock('../../storeListing.service', () => ({ getStoreListing: jest.fn() }));
jest.mock('../../storeRelease.model', () => ({ StoreReleaseIssueModel: { find: jest.fn() } }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));

const issue = {
  _id: 'i1', id: 'i1', store: 'APP_STORE', kind: 'REJECTION', source: 'SYNC', version: '1.2.0', build_number: '45',
  state: 'REJECTED', review_state: 'UNRESOLVED_ISSUES', reviewer_message: 'Guideline 4.3',
} as never;

const listing = {
  name: 'Duncit', subtitle: 'Meet', primary_category: 'LIFESTYLE', privacy_policy_url: 'https://p', support_url: '', marketing_url: '',
  contact_email: 'a@b.com', contact_phone: '', demo_account_required: true, demo_account_name: 'demo', demo_account_password: 'secret-pw',
  review_notes: 'abc', description: 'abcd', whats_new: 'ab', keywords: 'a', iphone_screenshots: [1, 2], ipad_screenshots: [1],
  android_phone_screenshots: [], android_feature_graphic: 'https://fg', android_icon: '',
};

function arrange(recent: unknown[] = []) {
  (getStoreListing as jest.Mock).mockResolvedValue(listing);
  (StoreReleaseIssueModel.find as jest.Mock).mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(recent) }) }) });
  (resolvePrompt as jest.Mock).mockImplementation(async (key: string) => ({ model: 'gpt-x', content: `prompt:${key}` }));
}
const answer = (content: unknown) => (openaiChat as jest.Mock).mockResolvedValue({ ok: true, model: 'gpt-x', content: typeof content === 'string' ? content : JSON.stringify(content) });
const sentData = () => JSON.parse((resolvePrompt as jest.Mock).mock.calls.find((c) => c[0] === 'tech.store_release_advice.user')[1].issue_data);

describe('adviseIssue: what the model is told', () => {
  it('sends the issue, the listing shape without secrets and the app’s recent rejections', async () => {
    arrange([
      { version: '1.1.0', build_number: '40', kind: 'REJECTION', state: 'REJECTED', reviewer_message: 'm'.repeat(700), resolved_at: new Date(), resubmitted_build_no: '41' },
      { version: '1.0.0', build_number: '30', kind: 'REJECTION', state: 'METADATA_REJECTED', reviewer_message: 'short', resolved_at: null, resubmitted_build_no: '' },
    ]);
    answer({ summary: 's' });
    await adviseIssue(issue, 'u1');

    expect(StoreReleaseIssueModel.find).toHaveBeenCalledWith({ store: 'APP_STORE', _id: { $ne: 'i1' } });
    const data = sentData();
    expect(data).toMatchObject({ store: 'APP_STORE', kind: 'REJECTION', version: '1.2.0', reviewer_message: 'Guideline 4.3' });
    expect(data.listing).toEqual({
      name: 'Duncit', subtitle: 'Meet', primary_category: 'LIFESTYLE', privacy_policy_url: true, support_url: false, marketing_url: false,
      contact_email: true, contact_phone: false, demo_account_required: true, demo_account_provided: true, review_notes_chars: 3,
      description_chars: 4, whats_new_chars: 2, keywords_chars: 1, iphone_screenshots: 2, ipad_screenshots: 1, android_phone_screenshots: 0,
      android_feature_graphic: true, android_icon: false,
    });
    expect(JSON.stringify(data)).not.toContain('secret-pw');
    expect(data.recent_issues[0]).toMatchObject({ version: '1.1.0', resolved: true, resubmitted_build_no: '41' });
    expect(data.recent_issues[0].reviewer_message).toHaveLength(600);
    expect(data.recent_issues[1].resolved).toBe(false);
    expect(openaiChat).toHaveBeenCalledWith(expect.objectContaining({
      task: 'platform.store_release_advice', detail: 'APP_STORE 1.2.0 (45)', json: true, temperature: 0.2, user_id: 'u1',
      messages: [{ role: 'system', content: 'prompt:tech.store_release_advice' }, { role: 'user', content: 'prompt:tech.store_release_advice.user' }],
    }));
  });

  it('reports demo_account_provided false when either credential is missing', async () => {
    arrange();
    (getStoreListing as jest.Mock).mockResolvedValue({ ...listing, demo_account_password: '' });
    answer({});
    await adviseIssue(issue);
    expect(sentData().listing.demo_account_provided).toBe(false);
  });
});

describe('adviseIssue: the answer', () => {
  it('holds the model’s JSON to the shape the portal renders', async () => {
    arrange();
    answer({
      summary: '  Fix the screenshots  ', likely_causes: ['a', ' ', 5], steps: ['one', 'two'], next_time: ['x'], confidence: 'high',
    });
    const advice = await adviseIssue(issue);
    expect(advice).toMatchObject({
      summary: 'Fix the screenshots', causes: ['a'], steps: ['one', 'two'], next_time: ['x'], confidence: 'HIGH', model: 'gpt-x', error: '',
    });
    expect(advice.generated_at).toBeInstanceOf(Date);
  });

  it('caps list length at eight and drops a confidence it does not know', async () => {
    arrange();
    answer({ summary: 's', steps: Array.from({ length: 12 }, (_, i) => `step ${i}`), confidence: 'certain' });
    const advice = await adviseIssue(issue);
    expect(advice.steps).toHaveLength(8);
    expect(advice.confidence).toBe('LOW');
  });

  it('turns missing or wrong-typed fields into empty ones', async () => {
    arrange();
    answer({ summary: 42, likely_causes: 'no', steps: null });
    await expect(adviseIssue(issue)).resolves.toMatchObject({ summary: '', causes: [], steps: [], next_time: [], confidence: 'LOW' });
  });

  it('says why there is no advice when the answer is not JSON', async () => {
    arrange();
    answer('plain words');
    await expect(adviseIssue(issue)).resolves.toMatchObject({
      summary: '', causes: [], confidence: '', model: 'gpt-x', error: 'OpenAI answered with something that is not JSON.',
    });
  });

  it('records the model error as the advice error and logs it, never throwing', async () => {
    arrange();
    (openaiChat as jest.Mock).mockResolvedValue({ ok: false, code: 'NOT_CONFIGURED', message: 'OPENAI_API_KEY is not configured', model: 'gpt-x' });
    await expect(adviseIssue(issue)).resolves.toMatchObject({ summary: '', model: 'gpt-x', error: 'OPENAI_API_KEY is not configured' });
    expect(logs.server.warn).toHaveBeenCalledWith('appBuild', 'releaseAdvice', { issue: 'i1', code: 'NOT_CONFIGURED', msg: 'OPENAI_API_KEY is not configured' });
  });
});
