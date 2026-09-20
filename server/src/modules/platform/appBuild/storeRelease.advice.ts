import { logs } from '@observability/log';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { getStoreListing } from './storeListing.service';
import { StoreReleaseIssueModel, type IStoreReleaseAdvice, type IStoreReleaseIssue } from './storeRelease.model';

/**
 * What to do about a rejection, from OpenAI.
 *
 * The model sees the store's state, the reviewer's message when an operator
 * has pasted one, the shape of the Store Listing (what is filled, what is
 * empty — never the demo password) and the app's recent rejections, and
 * answers with the likely cause, the steps to take now and what to do
 * differently next time. Both prompt turns live in the AI Library
 * (`tech.store_release_advice`), so the reading is retuned there, never here.
 *
 * Never throws: a rejection is recorded and announced whether or not OpenAI
 * answered, and the advice carries its own `error` when it did not.
 */

const MAX_LIST = 8;
const RECENT_ISSUES = 5;
const CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH']);

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v
        .slice(0, MAX_LIST)
        .map((row) => text(row, max))
        .filter(Boolean)
    : [];

/** The listing as the model needs it — what is present, how long, never the secrets. */
async function listingShape() {
  const listing = await getStoreListing();
  return {
    name: listing.name,
    subtitle: listing.subtitle,
    primary_category: listing.primary_category,
    privacy_policy_url: Boolean(listing.privacy_policy_url),
    support_url: Boolean(listing.support_url),
    marketing_url: Boolean(listing.marketing_url),
    contact_email: Boolean(listing.contact_email),
    contact_phone: Boolean(listing.contact_phone),
    demo_account_required: listing.demo_account_required,
    demo_account_provided: Boolean(listing.demo_account_name && listing.demo_account_password),
    review_notes_chars: listing.review_notes.length,
    description_chars: listing.description.length,
    whats_new_chars: listing.whats_new.length,
    keywords_chars: listing.keywords.length,
    iphone_screenshots: listing.iphone_screenshots.length,
    ipad_screenshots: listing.ipad_screenshots.length,
    android_phone_screenshots: listing.android_phone_screenshots.length,
    android_feature_graphic: Boolean(listing.android_feature_graphic),
    android_icon: Boolean(listing.android_icon),
  };
}

async function recentIssues(issue: IStoreReleaseIssue) {
  const rows = await StoreReleaseIssueModel.find({ store: issue.store, _id: { $ne: issue._id } })
    .sort({ detected_at: -1 })
    .limit(RECENT_ISSUES)
    .lean<IStoreReleaseIssue[]>();
  return rows.map((row) => ({
    version: row.version,
    build_number: row.build_number,
    kind: row.kind,
    state: row.state,
    reviewer_message: row.reviewer_message.slice(0, 600),
    resolved: Boolean(row.resolved_at),
    resubmitted_build_no: row.resubmitted_build_no,
  }));
}

/** The model's JSON, held to the shape the portal renders — anything missing becomes empty, never invented. */
function parseAdvice(raw: string, model: string): IStoreReleaseAdvice {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyAdvice(model, 'OpenAI answered with something that is not JSON.');
  }
  const confidence = text(parsed.confidence, 10).toUpperCase();
  return {
    summary: text(parsed.summary, 1500),
    causes: list(parsed.likely_causes, 400),
    steps: list(parsed.steps, 600),
    next_time: list(parsed.next_time, 400),
    confidence: CONFIDENCE.has(confidence) ? confidence : 'LOW',
    model,
    generated_at: new Date(),
    error: '',
  };
}

const emptyAdvice = (model: string, error: string): IStoreReleaseAdvice => ({
  summary: '',
  causes: [],
  steps: [],
  next_time: [],
  confidence: '',
  model,
  generated_at: new Date(),
  error,
});

/** Ask OpenAI what to do about this issue. Returns advice, or advice that says why there is none. */
export async function adviseIssue(issue: IStoreReleaseIssue, userId?: string): Promise<IStoreReleaseAdvice> {
  const data = {
    store: issue.store,
    kind: issue.kind,
    source: issue.source,
    version: issue.version,
    build_number: issue.build_number,
    state: issue.state,
    review_state: issue.review_state,
    reviewer_message: issue.reviewer_message,
    listing: await listingShape(),
    recent_issues: await recentIssues(issue),
  };
  const [system, userTurn] = await Promise.all([
    resolvePrompt('tech.store_release_advice'),
    resolvePrompt('tech.store_release_advice.user', { issue_data: JSON.stringify(data) }),
  ]);
  const res = await openaiChat({
    task: 'platform.store_release_advice',
    detail: `${issue.store} ${issue.version} (${issue.build_number})`,
    model: system.model,
    temperature: 0.2,
    json: true,
    user_id: userId,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: userTurn.content },
    ],
  });
  if (!res.ok) {
    logs.server.warn('appBuild', 'releaseAdvice', { issue: issue.id, code: res.code, msg: res.message });
    return emptyAdvice(res.model, res.message);
  }
  return parseAdvice(res.content, res.model);
}
