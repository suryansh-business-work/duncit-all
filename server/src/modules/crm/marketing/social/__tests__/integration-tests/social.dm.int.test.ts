/**
 * Direct messages against a real database: a DM stored once however it
 * arrives, the conversation's clocks, counters and status, stop/start
 * keywords, the default assignee, a lead writing back (Instagram Leads and
 * Sequences), Social Settings and its validation, and the Inbox's DM queue
 * (views, thread, assign, status, read) behind its role check.
 */
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { IgLeadModel } from '../../../igLeads/igLead.model';
import { MarketingLeadModel } from '../../../leads/marketingLead.model';
import { OutreachEnrollmentModel, OutreachSequenceModel } from '../../../outreach/outreach.model';
import { SocialConversationModel, SocialMessageModel } from '../../social.conversation.model';
import { conversationThread, createLeadFromConversation, socialConversations } from '../../social.conversations';
import { linkDmToLeads, recordDm, type IncomingDm } from '../../social.dm.ingest';
import { channelFilter, socialInbox } from '../../social.inbox';
import { inboxItemsTable } from '../../social.inbox.items';
import { socialInboxResolvers } from '../../social.inbox.resolver';
import { SocialAccountModel, SocialCommentModel, SocialPostModel } from '../../social.model';
import { socialService } from '../../social.service';
import { SOCIAL_SETTINGS_DEFAULTS, SocialSettingsModel, loadSocialSettings, resetSocialSettingsCache, saveSocialSettings } from '../../social.settings';

const ACCOUNT = new Types.ObjectId().toHexString();
const at = (iso: string) => new Date(iso);

const dm = (over: Partial<IncomingDm> = {}): IncomingDm => ({
  account_id: ACCOUNT,
  platform: 'INSTAGRAM',
  participant_id: 'igsid-1',
  direction: 'IN',
  external_id: `m-${new Types.ObjectId().toHexString()}`,
  text: 'Hello there',
  sent_at: at('2026-11-24T10:00:00Z'),
  ...over,
});

const conversation = () => SocialConversationModel.findOne({ account_id: ACCOUNT, 'participant.external_id': 'igsid-1' }).lean();
const settingsInput = (over: Record<string, unknown> = {}) => ({ ...SOCIAL_SETTINGS_DEFAULTS, ...over });

let seq = 0;
const staff = () => {
  seq += 1;
  return UserModel.create({ auth: { email: `dm${seq}@duncit.com` }, profile: { first_name: 'Dee', last_name: 'Em' }, metadata: { status: 'ACTIVE' } });
};

beforeEach(() => resetSocialSettingsCache());

describe('recordDm', () => {
  it('makes the conversation on the first message and stores the message once, however often it arrives', async () => {
    const first = await recordDm(dm({ external_id: 'm-1' }));
    expect(first).toMatchObject({ created: true, duplicate: false });
    const again = await recordDm(dm({ external_id: 'm-1' }));
    expect(again).toEqual({ conversation_id: first.conversation_id, created: false, duplicate: true });
    expect(await SocialMessageModel.countDocuments({ conversation_id: first.conversation_id })).toBe(1);
    expect(await conversation()).toMatchObject({
      platform: 'INSTAGRAM',
      status: 'OPEN',
      unread_count: 1,
      last_message_text: 'Hello there',
      last_inbound_at: at('2026-11-24T10:00:00Z'),
      ai_status: 'PENDING',
      assigned_user_id: null,
    });
  });

  it('moves the window only on the person’s messages, and keeps the newest message as the preview whatever order they come in', async () => {
    await recordDm(dm({ text: 'later', sent_at: at('2026-11-24T12:00:00Z') }));
    await recordDm(dm({ text: 'earlier', sent_at: at('2026-11-24T09:00:00Z') }));
    await recordDm(dm({ direction: 'OUT', text: 'our reply', sent_at: at('2026-11-24T13:00:00Z') }));
    const stored = await conversation();
    expect(stored?.last_message_text).toBe('our reply');
    expect(stored?.last_message_at).toEqual(at('2026-11-24T13:00:00Z'));
    expect(stored?.last_inbound_at).toEqual(at('2026-11-24T12:00:00Z'));
    expect(stored?.unread_count).toBe(2);
  });

  it('shows an attachment-only message by its kind, and stores an outbound message as SENT with who sent it', async () => {
    const { conversation_id } = await recordDm(dm({ text: '', attachments: [{ type: 'image', url: 'https://cdn/a.jpg' }] }));
    expect((await conversation())?.last_message_text).toBe('[image]');
    await recordDm(dm({ direction: 'OUT', text: 'Thanks', sent_by_user_id: 'u-1', sent_by_name: 'Dee', tag: 'HUMAN_AGENT', sent_at: at('2026-11-24T11:00:00Z') }));
    const out = await SocialMessageModel.findOne({ conversation_id, direction: 'OUT' }).lean();
    expect(out).toMatchObject({ status: 'SENT', sent_by_name: 'Dee', tag: 'HUMAN_AGENT', automation_rule_id: '' });
  });

  it('reopens an answered or done conversation when the person writes again, but never one marked spam', async () => {
    const { conversation_id } = await recordDm(dm());
    await SocialConversationModel.updateOne({ _id: conversation_id }, { $set: { status: 'REPLIED' } });
    await recordDm(dm());
    expect((await conversation())?.status).toBe('OPEN');
    await SocialConversationModel.updateOne({ _id: conversation_id }, { $set: { status: 'SPAM' } });
    await recordDm(dm());
    expect((await conversation())?.status).toBe('SPAM');
  });

  it('opts the person out on a stop keyword and back in on a start keyword, ignoring case and spaces', async () => {
    await recordDm(dm({ text: '  stop ' }));
    expect((await conversation())?.opted_out).toBe(true);
    await recordDm(dm({ text: 'Start' }));
    expect((await conversation())?.opted_out).toBe(false);
    await recordDm(dm({ text: 'please stop by tomorrow' }));
    expect((await conversation())?.opted_out).toBe(false);
  });

  it('assigns a new conversation to the Settings’ default assignee, and leaves the AI alone when triage is off', async () => {
    const person = await staff();
    await SocialSettingsModel.create({ key: 'default', default_assignee_user_id: String(person._id), auto_triage: false });
    await recordDm(dm());
    await SocialConversationModel.updateOne({ account_id: ACCOUNT }, { $set: { ai_status: 'CLEAN' } });
    await recordDm(dm());
    const stored = await conversation();
    expect(String(stored?.assigned_user_id)).toBe(String(person._id));
    expect(stored?.ai_status).toBe('CLEAN');
  });

  it('links a lead when the person is already known by username', async () => {
    await IgLeadModel.create({ username: 'asha.k', status: 'CONTACTED' });
    const { conversation_id } = await recordDm(dm());
    await SocialConversationModel.updateOne({ _id: conversation_id }, { $set: { 'participant.username': 'asha.k' } });
    await recordDm(dm());
    expect((await IgLeadModel.findOne({ username: 'asha.k' }).lean())?.status).toBe('REPLIED');
  });
});

describe('linkDmToLeads', () => {
  it('marks a waiting Instagram Lead Replied, stops a Marketing lead’s sequence, and remembers both on the conversation', async () => {
    const { conversation_id } = await recordDm(dm());
    const ig = await IgLeadModel.create({ username: 'asha.k', status: 'NEW', next_follow_up_at: new Date() });
    const lead = await MarketingLeadModel.create({ name: 'Asha', source: 'INSTAGRAM', instagram_handle: 'asha.k', stage: 'CONTACTED' });
    const sequence = await OutreachSequenceModel.create({ name: 'Cafes' });
    await OutreachEnrollmentModel.create({ sequence_id: sequence._id, lead_id: lead._id, status: 'ACTIVE' });

    await linkDmToLeads(conversation_id, '@Asha.K', false);

    expect(await IgLeadModel.findById(ig._id).lean()).toMatchObject({ status: 'REPLIED', next_follow_up_at: null });
    expect((await MarketingLeadModel.findById(lead._id).lean())?.stage).toBe('REPLIED');
    expect((await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean())?.status).toBe('REPLIED');
    const stored = await SocialConversationModel.findById(conversation_id).lean();
    expect(String(stored?.ig_lead_id)).toBe(String(ig._id));
    expect(String(stored?.marketing_lead_id)).toBe(String(lead._id));
  });

  it('ends a sequence opted out when the person sent a stop keyword, and leaves a closed Instagram Lead closed', async () => {
    const { conversation_id } = await recordDm(dm());
    await IgLeadModel.create({ username: 'ravi', status: 'CONVERTED' });
    const lead = await MarketingLeadModel.create({ name: 'Ravi', source: 'INSTAGRAM', instagram_handle: 'ravi' });
    const sequence = await OutreachSequenceModel.create({ name: 'Gyms' });
    await OutreachEnrollmentModel.create({ sequence_id: sequence._id, lead_id: lead._id, status: 'ACTIVE' });

    await linkDmToLeads(conversation_id, 'ravi', true);

    expect((await IgLeadModel.findOne({ username: 'ravi' }).lean())?.status).toBe('CONVERTED');
    expect((await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean())?.status).toBe('OPTED_OUT');
  });

  it('does nothing for an unknown or unusable handle', async () => {
    const { conversation_id } = await recordDm(dm());
    await linkDmToLeads(conversation_id, 'nobody.here', false);
    await linkDmToLeads(conversation_id, '!!!', false);
    expect((await SocialConversationModel.findById(conversation_id).lean())?.ig_lead_id).toBeNull();
  });
});

describe('Social Settings', () => {
  it('reads the defaults until anything is saved', async () => {
    expect(await loadSocialSettings()).toEqual(SOCIAL_SETTINGS_DEFAULTS);
  });

  it('saves a valid set, normalising keywords, and is read back at once', async () => {
    const saved = await saveSocialSettings(settingsInput({ sync_every_hours: 6, opt_out_keywords: ['stop', ' Stop ', 'quit'], ai_reply_guidelines: '  Warm, short.  ' }), 'u-1');
    expect(saved).toMatchObject({ sync_every_hours: 6, opt_out_keywords: ['STOP', 'QUIT'], ai_reply_guidelines: 'Warm, short.' });
    expect(await loadSocialSettings()).toMatchObject({ sync_every_hours: 6 });
    expect((await SocialSettingsModel.findOne({ key: 'default' }).lean())?.updated_by).toBe('u-1');
  });

  it('refuses values outside their bounds, unknown fields, an unknown assignee and a keyword on both lists', async () => {
    await expect(saveSocialSettings(settingsInput({ sync_every_hours: 0 }), 'u')).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' }, message: expect.stringContaining('sync_every_hours') });
    await expect(saveSocialSettings(settingsInput({ auto_reply_daily_cap: 501 }), 'u')).rejects.toThrow('auto_reply_daily_cap');
    await expect(saveSocialSettings(settingsInput({ ai_reply_guidelines: 'x'.repeat(2001) }), 'u')).rejects.toThrow('ai_reply_guidelines');
    await expect(saveSocialSettings({ ...settingsInput(), surprise: true }, 'u')).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(saveSocialSettings(settingsInput({ default_assignee_user_id: new Types.ObjectId().toHexString() }), 'u')).rejects.toThrow('not a known user');
    await expect(saveSocialSettings(settingsInput({ opt_in_keywords: ['STOP'] }), 'u')).rejects.toThrow('cannot both opt out and opt in');
    expect(await SocialSettingsModel.countDocuments()).toBe(0);
  });

  it('serves a cached copy within its short lifetime, and the stored one after', async () => {
    const now = Date.now();
    await loadSocialSettings(now);
    await SocialSettingsModel.create({ key: 'default', backfill_days: 10 });
    expect((await loadSocialSettings(now + 1_000)).backfill_days).toBe(SOCIAL_SETTINGS_DEFAULTS.backfill_days);
    expect((await loadSocialSettings(now + 60_000)).backfill_days).toBe(10);
  });

  it('names the default assignee for the Settings page, and nobody when there is none', async () => {
    const person = await staff();
    const resolve = socialInboxResolvers.SocialSettings.default_assignee_name;
    expect(await resolve({ ...SOCIAL_SETTINGS_DEFAULTS, default_assignee_user_id: String(person._id) })).toBe('Dee Em');
    expect(await resolve({ ...SOCIAL_SETTINGS_DEFAULTS })).toBeNull();
    expect(await resolve({ ...SOCIAL_SETTINGS_DEFAULTS, default_assignee_user_id: new Types.ObjectId().toHexString() })).toBeNull();
  });

  it('lets an Inbox editor read Settings but only a manager change them', async () => {
    const editor = makeContext({ roles: ['MARKETING_EDITOR'] });
    await expect(socialInboxResolvers.Query.socialSettings(undefined, undefined, editor)).resolves.toMatchObject({ backfill_days: 30 });
    expect(() => socialInboxResolvers.Mutation.updateSocialSettings(undefined, { input: settingsInput() }, editor)).toThrow();
    const manager = makeContext({ roles: ['MARKETING_MANAGER'] });
    await expect(socialInboxResolvers.Mutation.updateSocialSettings(undefined, { input: settingsInput({ backfill_days: 7 }) }, manager)).resolves.toMatchObject({ backfill_days: 7 });
  });
});

describe('the DM queue', () => {
  it('lists conversations by view with their account, assignee and window, and counts the summary', async () => {
    const account = await SocialAccountModel.create({ _id: new Types.ObjectId(ACCOUNT), provider: 'INSTAGRAM', platform: 'INSTAGRAM', external_id: 'ig-1', name: 'Duncit IG', scopes: ['instagram_manage_messages'] });
    const person = await staff();
    const recent = new Date(Date.now() - 3_600_000);
    const { conversation_id } = await recordDm(dm({ sent_at: recent }));
    await recordDm(dm({ participant_id: 'igsid-2', sent_at: new Date(Date.now() - 10 * 86_400_000) }));
    await socialConversations.assign(conversation_id, String(person._id), 'actor');

    const all = await socialConversations.table({ page: 1, page_size: 10 }, 'ALL', 'me');
    expect(all.total).toBe(2);
    const mine = await socialConversations.table(null, 'MINE', String(person._id));
    expect(mine.rows).toHaveLength(1);
    expect(mine.rows[0]).toMatchObject({ account_name: 'Duncit IG', assigned_name: 'Dee Em', window_state: 'OPEN', unread_count: 1, opted_out: false });
    const stale = all.rows.find((row) => row.id !== conversation_id);
    expect(stale).toMatchObject({ window_state: 'CLOSED', window_closes_at: null });
    expect(await socialConversations.summary(String(person._id))).toEqual({ open: 2, flagged: 0, unassigned: 1, mine: 1 });
    expect(String(account._id)).toBe(ACCOUNT);
  });

  it('opens a thread oldest first with what would stop a reply, and marks it read, done or reopened', async () => {
    await SocialAccountModel.create({ _id: new Types.ObjectId(ACCOUNT), provider: 'INSTAGRAM', platform: 'INSTAGRAM', external_id: 'ig-1', scopes: ['instagram_basic'] });
    const { conversation_id } = await recordDm(dm({ text: 'first', sent_at: at('2026-11-24T09:00:00Z') }));
    await recordDm(dm({ text: 'second', sent_at: at('2026-11-24T10:00:00Z') }));
    const thread = await conversationThread(conversation_id);
    expect(thread.messages.map((m) => m.text)).toEqual(['first', 'second']);
    expect(thread).toMatchObject({ missing_permission: 'instagram_manage_messages', max_length: 1000 });

    expect((await socialConversations.markRead(conversation_id)).conversation.unread_count).toBe(0);
    expect((await socialConversations.setStatus(conversation_id, 'DONE', 'actor')).conversation.status).toBe('DONE');
    await expect(socialConversations.assign(conversation_id, new Types.ObjectId().toHexString(), 'actor')).rejects.toThrow('not a known user');
    expect((await socialConversations.assign(conversation_id, null, 'actor')).conversation.assigned_user_id).toBeNull();
  });

  it('answers NOT_FOUND for a conversation that does not exist, and refuses a role outside the Inbox', async () => {
    await expect(conversationThread('nope')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(socialConversations.markRead(new Types.ObjectId().toHexString())).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    const outsider = makeContext({ roles: ['CLUB_ADMIN'] });
    expect(() => socialInboxResolvers.Query.socialConversationsTable(undefined, {}, outsider)).toThrow();
    expect(() => socialInboxResolvers.Query.socialDmSummary(undefined, undefined, outsider)).toThrow();
  });
});

describe('the All tab and the channel tabs', () => {
  async function seed() {
    const account = await SocialAccountModel.create({ _id: new Types.ObjectId(ACCOUNT), provider: 'INSTAGRAM', platform: 'INSTAGRAM', external_id: 'ig-1', name: 'Duncit IG' });
    const post = await SocialPostModel.create({ account_id: ACCOUNT, platform: 'INSTAGRAM', external_id: 'media-1', published_at: at('2026-11-20T00:00:00Z') });
    await SocialCommentModel.create([
      { account_id: ACCOUNT, post_id: String(post._id), platform: 'INSTAGRAM', external_id: 'c-1', author_name: 'Ravi', text: 'Love it', published_at: at('2026-11-24T08:00:00Z') },
      { account_id: ACCOUNT, post_id: String(post._id), platform: 'THREADS', external_id: 't-1', author_handle: 'meera', text: 'Thread reply', published_at: at('2026-11-24T09:00:00Z') },
      { account_id: ACCOUNT, post_id: String(post._id), platform: 'INSTAGRAM', external_id: 'c-done', author_name: 'Old', text: 'Done one', published_at: at('2026-11-24T11:00:00Z'), status: 'DONE' },
    ]);
    const { conversation_id } = await recordDm(dm({ text: 'Price please', sent_at: at('2026-11-24T10:00:00Z') }));
    await SocialConversationModel.updateOne({ _id: conversation_id }, { $set: { 'participant.name': 'Asha' } });
    return { account, conversation_id };
  }

  it('lists comments, Threads replies and DMs as one queue newest first, on the view', async () => {
    const { conversation_id } = await seed();
    const page = await inboxItemsTable({ page: 1, page_size: 10 }, 'OPEN', 'me');
    expect(page.total).toBe(3);
    expect(page.rows.map((row) => `${row.kind}:${row.author}:${row.text}`)).toEqual(['DM:Asha:Price please', 'THREADS_REPLY:meera:Thread reply', 'COMMENT:Ravi:Love it']);
    expect(page.rows[0]).toMatchObject({ id: conversation_id, account_name: 'Duncit IG', unread_count: 1, status: 'OPEN', platform: 'INSTAGRAM' });
    expect((await inboxItemsTable(null, 'ALL', 'me')).total).toBe(4);
  });

  it('searches text and author across both, pages the result, and pins "mine" to the asker', async () => {
    const { conversation_id } = await seed();
    expect((await inboxItemsTable({ search: 'asha' }, 'ALL', 'me')).rows.map((row) => row.kind)).toEqual(['DM']);
    expect((await inboxItemsTable({ search: 'love' }, 'ALL', 'me')).rows.map((row) => row.kind)).toEqual(['COMMENT']);
    const second = await inboxItemsTable({ page: 2, page_size: 2 }, 'ALL', 'me');
    expect(second).toMatchObject({ page: 2, page_size: 2, total: 4 });
    expect(second.rows).toHaveLength(2);
    const person = await staff();
    await socialConversations.assign(conversation_id, String(person._id), 'actor');
    const mine = await inboxItemsTable(null, 'MINE', String(person._id));
    expect(mine.rows.map((row) => [row.kind, row.assigned_name])).toEqual([['DM', 'Dee Em']]);
  });

  it('splits the comment queue into every network’s comments and Threads replies', async () => {
    await seed();
    const comments = await socialInbox.table(null, 'OPEN', 'me', 'COMMENTS');
    expect(comments.rows.map((row) => row.platform)).toEqual(['INSTAGRAM']);
    const threads = await socialInbox.table(null, 'OPEN', 'me', 'THREADS_REPLIES');
    expect(threads.rows.map((row) => row.platform)).toEqual(['THREADS']);
    expect(channelFilter(null)).toEqual({});
  });

  it('tells the Accounts page what messaging lacks, and why the last DM read or webhook subscription failed', async () => {
    await SocialAccountModel.create({ provider: 'INSTAGRAM', platform: 'INSTAGRAM', external_id: 'ig-a', scopes: ['instagram_basic'], dm_error: 'boom', webhook_error: '' });
    await SocialAccountModel.create({ provider: 'FACEBOOK', platform: 'FACEBOOK', external_id: 'page-a', scopes: ['pages_messaging'], webhook_error: 'needs pages_manage_metadata' });
    await SocialAccountModel.create({ provider: 'X', platform: 'X', external_id: 'x-a' });
    const accounts = await socialService.accounts();
    const by = (id: string) => accounts.find((account) => account.platform === id);
    expect(by('INSTAGRAM')).toMatchObject({ messaging_missing_permission: 'instagram_manage_messages', dm_error: 'boom', webhook_error: '' });
    expect(by('FACEBOOK')).toMatchObject({ messaging_missing_permission: null, webhook_error: 'needs pages_manage_metadata' });
    expect(by('X')).toMatchObject({ messaging_missing_permission: null, dm_error: '' });
  });
});

describe('createLeadFromConversation', () => {
  const user = { id: new Types.ObjectId().toHexString(), email: 'dee@duncit.com' };

  it('adds the person to the pipeline as a replied Instagram lead and links the conversation', async () => {
    const { conversation_id } = await recordDm(dm());
    await SocialConversationModel.updateOne({ _id: conversation_id }, { $set: { 'participant.username': 'asha.k', 'participant.name': 'Asha K' } });
    const made = await createLeadFromConversation(conversation_id, user);
    expect(made.merged).toBe(false);
    const lead = await MarketingLeadModel.findById(made.lead_id).lean();
    expect(lead).toMatchObject({ name: 'Asha K', source: 'INSTAGRAM', instagram_handle: 'asha.k', stage: 'REPLIED' });
    expect(made.thread.conversation.marketing_lead_id).toBe(made.lead_id);
  });

  it('matches a lead already in the pipeline by handle rather than adding a second', async () => {
    const existing = await MarketingLeadModel.create({ name: 'Asha', source: 'MANUAL', instagram_handle: 'asha.k' });
    const { conversation_id } = await recordDm(dm());
    await SocialConversationModel.updateOne({ _id: conversation_id }, { $set: { 'participant.username': 'asha.k' } });
    const made = await createLeadFromConversation(conversation_id, user);
    expect(made).toMatchObject({ merged: true, lead_id: String(existing._id) });
    expect(await MarketingLeadModel.countDocuments()).toBe(1);
  });

  it('refuses a person with no name yet, and a conversation that is not there', async () => {
    const { conversation_id } = await recordDm(dm());
    await expect(createLeadFromConversation(conversation_id, user)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(createLeadFromConversation(new Types.ObjectId().toHexString(), user)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('opens a comment of the All tab by id through the resolver', async () => {
    const post = await SocialPostModel.create({ account_id: ACCOUNT, platform: 'INSTAGRAM', external_id: 'media-9', published_at: new Date() });
    const comment = await SocialCommentModel.create({ account_id: ACCOUNT, post_id: String(post._id), platform: 'INSTAGRAM', external_id: 'c-9', text: 'Hi', published_at: new Date() });
    const ctx = makeContext({ roles: ['MARKETING_EDITOR'] });
    await expect(socialInboxResolvers.Query.socialInboxComment(undefined, { id: String(comment._id) }, ctx)).resolves.toMatchObject({ id: String(comment._id), text: 'Hi', status: 'OPEN' });
  });
});
