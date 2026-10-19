import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { staffChatService as svc } from '../../staffChat.service';
import { StaffMessageModel, threadKey } from '../../staffChat.model';
import { StaffCallModel } from '../../staffCall.model';
import { StaffChatStateModel } from '../../staffChatState.model';

/** A user row inserted raw, so the fixture is exactly the shape under test. */
async function user(doc: Record<string, unknown>): Promise<string> {
  const res = await UserModel.collection.insertOne(doc);
  return String(res.insertedId);
}

const staff = (first: string, roles: string[] = ['EMPLOYEE'], extra: Record<string, unknown> = {}) =>
  user({
    profile: { first_name: first, last_name: 'Staff' },
    auth: { email: `${first.toLowerCase()}@example.com` },
    metadata: { role_keys: roles },
    ...extra,
  });

/** A message row inserted raw with an explicit timestamp, so ordering is deterministic. */
async function rawMessage(from: string, to: string, at: string, over: Record<string, unknown> = {}): Promise<string> {
  const res = await StaffMessageModel.collection.insertOne({
    thread_key: threadKey(from, to),
    from_user_id: from,
    to_user_id: to,
    text: `msg ${at}`,
    attachment_url: '',
    read_at: null,
    delivered_at: null,
    deleted_at: null,
    pinned_at: null,
    reactions: [],
    edits: [],
    created_at: new Date(at),
    updated_at: new Date(at),
    ...over,
  });
  return String(res.insertedId);
}

const expectCode = (promise: Promise<unknown>, code: string, message?: string) =>
  expect(promise).rejects.toMatchObject({ extensions: { code }, ...(message ? { message } : {}) });

describe('coworkers', () => {
  it('lists staff other than me, sorted by name, with only their staff roles and a full card', async () => {
    const me = await staff('Me');
    await staff('Zara', ['FINANCE_MANAGER', 'USER'], {
      auth: { email: 'zara@example.com', phone: { extension: '+91', number: '0000000001' } },
      profile: { first_name: 'Zara', last_name: '', profile_photo: 'https://cdn/z.png', city: 'Pune', timezone: 'Asia/Kolkata', bio: 'Numbers' },
    });
    await staff('Arun', ['EMPLOYEE'], { auth: { email: 'arun@example.com', phone: { number: ' 0000000002 ' } } });
    await user({ profile: { first_name: 'Customer' }, metadata: { role_keys: ['USER'] } });

    const list = await svc.coworkers(me);

    expect(list.map((c) => c.name)).toEqual(['Arun Staff', 'Zara']);
    expect(list[1]).toEqual({
      id: expect.any(String),
      name: 'Zara',
      email: 'zara@example.com',
      photo: 'https://cdn/z.png',
      phone: '+91 0000000001',
      city: 'Pune',
      timezone: 'Asia/Kolkata',
      bio: 'Numbers',
      roles: ['FINANCE_MANAGER'],
    });
    expect(list[0]).toEqual(expect.objectContaining({ phone: '0000000002', photo: '', city: '', timezone: '', bio: '' }));
  });

  it('narrows by role and by an escaped search over name and email', async () => {
    const me = await staff('Me');
    await staff('Priya', ['HR_MANAGER']);
    await staff('Rahul', ['TECH_MANAGER'], { auth: { email: 'c++dev@example.com' } });

    expect((await svc.coworkers(me, null, 'HR_MANAGER')).map((c) => c.name)).toEqual(['Priya Staff']);
    expect((await svc.coworkers(me, '  pri ')).map((c) => c.name)).toEqual(['Priya Staff']);
    // "c++" is matched literally, not compiled as a quantifier.
    expect((await svc.coworkers(me, 'c++')).map((c) => c.name)).toEqual(['Rahul Staff']);
    expect(await svc.coworkers(me, 'nobody')).toEqual([]);
  });

  it('falls back to the email, then "Someone", for a nameless coworker', async () => {
    const me = await staff('Me');
    await user({ auth: { email: 'nameless@example.com' }, metadata: { role_keys: ['EMPLOYEE'] } });
    await user({ metadata: { role_keys: ['EMPLOYEE'] } });
    const names = (await svc.coworkers(me)).map((c) => c.name);
    expect(names).toEqual(['nameless@example.com', 'Someone']);
  });
});

describe('displayName', () => {
  it('reads the name, or says "Coworker" for an unknown id', async () => {
    const id = await staff('Neha');
    await expect(svc.displayName(id)).resolves.toBe('Neha Staff');
    await expect(svc.displayName(new Types.ObjectId().toString())).resolves.toBe('Coworker');
  });
});

describe('chat state', () => {
  it('returns defaults for someone who never saved anything', async () => {
    await expect(svc.chatState('u1')).resolves.toEqual({
      panel_open: false,
      role_filter: '',
      open_peer_id: null,
      density: 'COMFORTABLE',
      bubble_color: 'primary',
      font_size: 14,
      time_zone: '',
      enter_to_send: true,
      mic_id: '',
      cam_id: '',
      mic_label: '',
      cam_label: '',
    });
  });

  it('saves only the fields given, with the right types, and clamps the font size', async () => {
    const first = await svc.saveChatState('u1', {
      panel_open: true,
      role_filter: 'HR_MANAGER',
      open_peer_id: 'peer-1',
      density: 'COMPACT',
      bubble_color: 'info',
      font_size: 40,
      time_zone: 'Asia/Kolkata',
      enter_to_send: false,
      mic_id: 'mic',
      cam_id: 'cam',
      mic_label: 'Mic',
      cam_label: 'Cam',
    });
    expect(first).toEqual({
      panel_open: true,
      role_filter: 'HR_MANAGER',
      open_peer_id: 'peer-1',
      density: 'COMPACT',
      bubble_color: 'info',
      font_size: 22,
      time_zone: 'Asia/Kolkata',
      enter_to_send: false,
      mic_id: 'mic',
      cam_id: 'cam',
      mic_label: 'Mic',
      cam_label: 'Cam',
    });

    // Wrong types are ignored, null clears the open peer, a tiny font clamps up.
    const second = await svc.saveChatState('u1', { panel_open: 'yes', font_size: 3.4, open_peer_id: null });
    expect(second).toEqual(expect.objectContaining({ panel_open: true, open_peer_id: null, font_size: 11, density: 'COMPACT' }));
    expect(await StaffChatStateModel.countDocuments({ user_id: 'u1' })).toBe(1);
    await expect(svc.chatState('u1')).resolves.toEqual(second);
  });

  it('leaves open_peer_id alone when it is not passed and rounds the font size', async () => {
    await svc.saveChatState('u2', { open_peer_id: 'p' });
    const state = await svc.saveChatState('u2', { font_size: 15.6 });
    expect(state.open_peer_id).toBe('p');
    expect(state.font_size).toBe(16);
  });
});

describe('send', () => {
  it('refuses an empty message, messaging yourself and a non-staff recipient', async () => {
    const me = await staff('Me');
    const customer = await user({ profile: { first_name: 'Cust' }, metadata: { role_keys: ['USER'] } });
    await expectCode(svc.send(me, customer, '   '), 'BAD_USER_INPUT', 'Write something, or attach a file');
    await expectCode(svc.send(me, me, 'hi'), 'BAD_USER_INPUT', 'You cannot message yourself');
    await expectCode(svc.send(me, customer, 'hi'), 'NOT_FOUND', 'That person is not a coworker');
    expect(await StaffMessageModel.countDocuments()).toBe(0);
  });

  it('stores a trimmed message, cleans the attachment and records a mention of the peer', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const sent = await svc.send(
      me,
      peer,
      '  hey @peer look  ',
      { url: ' https://cdn/voice.webm ', name: ' note ', type: ' audio/webm ', size: 12.9, peaks: [-1, 0.5, 2, Number.NaN] },
      { replyToId: 'r1' }
    );
    // Plain JSON, so the hydrated document's arrays compare as plain arrays.
    expect(JSON.parse(JSON.stringify(sent))).toEqual(
      expect.objectContaining({
        from_user_id: me,
        to_user_id: peer,
        text: 'hey @peer look',
        attachment_url: 'https://cdn/voice.webm',
        attachment_name: 'note',
        attachment_type: 'audio/webm',
        attachment_size: 12,
        attachment_peaks: [0, 0.5, 1, 0],
        reply_to_id: 'r1',
        forwarded_from: null,
        mentions: [peer],
        read_at: null,
        deleted_at: null,
        reactions: [],
      })
    );
    expect(typeof sent.created_at).toBe('string');
    const stored = await StaffMessageModel.findById(sent.id).lean();
    expect(stored?.thread_key).toBe(threadKey(me, peer));
  });

  it('accepts a file with no caption, caps the waveform and records no mention for an email-like @', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const sent = await svc.send(me, peer, '', { url: 'https://cdn/f.pdf', size: -5, peaks: Array(300).fill(0.2) });
    expect(sent.text).toBe('');
    expect(sent.attachment_size).toBe(0);
    expect(sent.attachment_peaks).toHaveLength(128);

    const plain = await svc.send(me, peer, 'mail me at a@b.com', null);
    expect(plain.mentions).toHaveLength(0);
    expect(plain.attachment_url).toBe('');
  });
});

describe('threads, messages and read state', () => {
  it('lists my conversations newest first with the last line and my unread count', async () => {
    const me = await staff('Me');
    const a = await staff('Asha');
    const b = await staff('Bala');
    const gone = new Types.ObjectId().toString();
    await rawMessage(a, me, '2026-10-01T10:00:00Z');
    await rawMessage(a, me, '2026-10-01T10:01:00Z', { text: 'a latest' });
    await rawMessage(me, b, '2026-10-01T09:00:00Z');
    await rawMessage(b, me, '2026-10-01T11:00:00Z', { text: 'b latest', read_at: new Date('2026-10-01T11:05:00Z') });
    await rawMessage(me, b, '2026-10-01T12:00:00Z', { text: 'my reply' });
    // A conversation with someone whose account no longer exists is dropped.
    await rawMessage(gone, me, '2026-10-01T13:00:00Z');

    const threads = await svc.threads(me);

    expect(threads).toEqual([
      expect.objectContaining({ last_text: 'my reply', last_from_me: true, unread: 0, last_at: '2026-10-01T12:00:00.000Z' }),
      expect.objectContaining({ last_text: 'a latest', last_from_me: false, unread: 2 }),
    ]);
    expect(threads[0].peer.id).toBe(b);
    expect(threads[1].peer.name).toBe('Asha Staff');
  });

  it('pages a conversation oldest first with a created_at cursor and a clamped limit', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    for (let minute = 0; minute < 5; minute += 1) {
      await rawMessage(minute % 2 ? me : peer, minute % 2 ? peer : me, `2026-10-01T10:0${minute}:00Z`);
    }
    const latest = await svc.messages(me, peer, 2);
    expect(latest.map((m) => m.text)).toEqual(['msg 2026-10-01T10:03:00Z', 'msg 2026-10-01T10:04:00Z']);

    const older = await svc.messages(me, peer, 2, '2026-10-01T10:03:00.000Z');
    expect(older.map((m) => m.text)).toEqual(['msg 2026-10-01T10:01:00Z', 'msg 2026-10-01T10:02:00Z']);

    expect(await svc.messages(me, peer, 0)).toHaveLength(1);
    expect(await svc.messages(peer, me)).toHaveLength(5);
  });

  it('shows a deleted message as a blank placeholder and maps legacy reactions', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    await rawMessage(peer, me, '2026-10-01T10:00:00Z', {
      reactions: [
        { user_id: me, kind: 'THUMBS_UP' },
        { user_id: peer, emoji: 'HEART', at: new Date('2026-10-01T10:02:00Z') },
      ],
    });
    await rawMessage(peer, me, '2026-10-01T10:01:00Z', {
      text: 'secret',
      attachment_url: 'https://cdn/x',
      attachment_size: 9,
      attachment_peaks: [0.4],
      deleted_at: new Date('2026-10-01T10:05:00Z'),
      reactions: [{ user_id: me, emoji: '👍' }],
    });

    const [live, deleted] = await svc.messages(me, peer);

    expect(live.reactions).toEqual([
      { user_id: me, emoji: '👍', at: null },
      { user_id: peer, emoji: '❤️', at: '2026-10-01T10:02:00.000Z' },
    ]);
    expect(deleted).toEqual(
      expect.objectContaining({
        text: '',
        attachment_url: '',
        attachment_size: 0,
        attachment_peaks: [],
        reactions: [],
        deleted_at: '2026-10-01T10:05:00.000Z',
      })
    );
  });

  it('marks delivered and read only for what the peer sent me, and counts my unread', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const other = await staff('Other');
    await rawMessage(peer, me, '2026-10-01T10:00:00Z');
    await rawMessage(peer, me, '2026-10-01T10:01:00Z', { delivered_at: new Date('2026-10-01T10:01:30Z') });
    await rawMessage(me, peer, '2026-10-01T10:02:00Z');
    await rawMessage(other, me, '2026-10-01T10:03:00Z');

    expect(await svc.unreadCount(me)).toBe(3);
    expect(await svc.markDelivered(me, peer)).toBe(1);
    expect(await svc.markDelivered(me, peer)).toBe(0);

    expect(await svc.markRead(me, peer)).toBe(2);
    expect(await svc.markRead(me, peer)).toBe(0);
    expect(await svc.unreadCount(me)).toBe(1);
    const mine = await StaffMessageModel.findOne({ from_user_id: me }).lean();
    expect(mine?.read_at).toBeNull();
  });

  it('marks an undelivered message delivered when it is read', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const id = await rawMessage(peer, me, '2026-10-01T10:00:00Z');
    await svc.markRead(me, peer);
    const doc = await StaffMessageModel.findById(id).lean();
    expect(doc?.delivered_at).toBeInstanceOf(Date);
    expect(doc?.read_at?.getTime()).toBe(doc?.delivered_at?.getTime());
  });

  it('clears a whole conversation for both sides and nothing else', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const other = await staff('Other');
    await rawMessage(me, peer, '2026-10-01T10:00:00Z');
    await rawMessage(peer, me, '2026-10-01T10:01:00Z');
    await rawMessage(other, me, '2026-10-01T10:02:00Z');
    expect(await svc.clearThread(peer, me)).toBe(2);
    expect(await StaffMessageModel.countDocuments()).toBe(1);
  });
});

describe('forward, pin, search', () => {
  it('forwards a copy, crediting the original author', async () => {
    const me = await staff('Me');
    const author = await staff('Author');
    const target = await staff('Target');
    const id = await rawMessage(author, me, '2026-10-01T10:00:00Z', {
      text: 'the address',
      attachment_url: 'https://cdn/map.png',
      attachment_name: 'map',
      attachment_type: 'image/png',
      attachment_size: 100,
    });

    const copy = await svc.forward(me, id, target);

    expect(copy).toEqual(
      expect.objectContaining({
        from_user_id: me,
        to_user_id: target,
        text: 'the address',
        attachment_url: 'https://cdn/map.png',
        attachment_name: 'map',
        attachment_size: 100,
        forwarded_from: author,
      })
    );
  });

  it('refuses to forward a missing, foreign or deleted message', async () => {
    const me = await staff('Me');
    const a = await staff('A');
    const b = await staff('B');
    const foreign = await rawMessage(a, b, '2026-10-01T10:00:00Z');
    const deleted = await rawMessage(a, me, '2026-10-01T10:01:00Z', { deleted_at: new Date() });
    await expectCode(svc.forward(me, new Types.ObjectId().toString(), b), 'NOT_FOUND');
    await expectCode(svc.forward(me, foreign, b), 'FORBIDDEN');
    await expectCode(svc.forward(me, deleted, b), 'BAD_USER_INPUT', 'That message was deleted');
  });

  it('toggles a pin on a message in my thread and lists pins newest first', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const first = await rawMessage(peer, me, '2026-10-01T10:00:00Z');
    const second = await rawMessage(me, peer, '2026-10-01T10:01:00Z');

    const pinned = await svc.pin(me, first);
    expect(pinned.pinned_by).toBe(me);
    expect(typeof pinned.pinned_at).toBe('string');
    // Back-date the first pin so "newest pin first" does not hinge on the clock.
    await StaffMessageModel.collection.updateOne(
      { _id: new Types.ObjectId(first) },
      { $set: { pinned_at: new Date('2026-10-01T09:00:00Z') } }
    );
    await svc.pin(peer, second);
    expect((await svc.pinned(me, peer)).map((m) => m.id)).toEqual([second, first]);

    const unpinned = await svc.pin(peer, first);
    expect(unpinned).toEqual(expect.objectContaining({ pinned_at: null, pinned_by: null }));
    expect((await svc.pinned(peer, me)).map((m) => m.id)).toEqual([second]);
  });

  it('refuses to pin a missing or foreign message', async () => {
    const me = await staff('Me');
    const a = await staff('A');
    const b = await staff('B');
    const foreign = await rawMessage(a, b, '2026-10-01T10:00:00Z');
    await expectCode(svc.pin(me, new Types.ObjectId().toString()), 'NOT_FOUND');
    await expectCode(svc.pin(me, foreign), 'FORBIDDEN');
  });

  it('searches one thread by text, sender, files, links and date range, skipping deleted messages', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const other = await staff('Other');
    const link = await rawMessage(peer, me, '2026-10-01T10:00:00Z', { text: 'see https://duncit.com/plan' });
    const file = await rawMessage(me, peer, '2026-10-02T10:00:00Z', { text: 'the plan', attachment_url: 'https://cdn/plan.pdf' });
    const plain = await rawMessage(peer, me, '2026-10-03T10:00:00Z', { text: 'plan c++ ready' });
    await rawMessage(peer, me, '2026-10-03T11:00:00Z', { text: 'plan gone', deleted_at: new Date() });
    await rawMessage(other, me, '2026-10-03T12:00:00Z', { text: 'plan elsewhere' });

    const ids = async (input: Parameters<typeof svc.search>[2]) => (await svc.search(me, peer, input)).map((m) => m.id);

    expect(await ids({ text: ' plan ' })).toEqual([plain, file, link]);
    expect(await ids({ text: 'c++' })).toEqual([plain]);
    expect(await ids({ fromUserId: me })).toEqual([file]);
    expect(await ids({ onlyFiles: true })).toEqual([file]);
    expect(await ids({ text: 'plan', onlyLinks: true })).toEqual([link]);
    expect(await ids({ after: '2026-10-02T00:00:00Z' })).toEqual([plain, file]);
    expect(await ids({ before: '2026-10-02T12:00:00Z' })).toEqual([file, link]);
    expect(await ids({ after: '2026-10-02T00:00:00Z', before: '2026-10-02T23:59:59Z' })).toEqual([file]);
    expect(await ids({})).toEqual([plain, file, link]);
  });
});

describe('edit, react, remove', () => {
  it('edits my own message, keeping the earlier wording for admins', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const id = await rawMessage(me, peer, '2026-10-01T10:00:00Z', { text: 'first' });

    await svc.edit(me, id, ' second ');
    const edited = await svc.edit(me, id, 'third');

    expect(edited.text).toBe('third');
    expect(typeof edited.edited_at).toBe('string');
    const history = await svc.messageEdits(id);
    expect(history.map((h) => h.text)).toEqual(['first', 'second']);
    expect(typeof history[0].at).toBe('string');
  });

  it('refuses an empty edit, someone else’s message and a deleted one', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const theirs = await rawMessage(peer, me, '2026-10-01T10:00:00Z');
    const deleted = await rawMessage(me, peer, '2026-10-01T10:01:00Z', { deleted_at: new Date() });
    await expectCode(svc.edit(me, theirs, '  '), 'BAD_USER_INPUT', 'An edit cannot be empty');
    await expectCode(svc.edit(me, theirs, 'mine now'), 'FORBIDDEN');
    await expectCode(svc.edit(me, deleted, 'back'), 'BAD_USER_INPUT', 'That message was deleted');
  });

  it('reads the edit history of a message that was never edited, and of legacy rows', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const plain = await rawMessage(me, peer, '2026-10-01T10:00:00Z');
    const legacy = await rawMessage(me, peer, '2026-10-01T10:01:00Z', { edits: [{}] });
    const noEdits = await rawMessage(me, peer, '2026-10-01T10:02:00Z', { edits: undefined });
    await expect(svc.messageEdits(plain)).resolves.toEqual([]);
    await expect(svc.messageEdits(legacy)).resolves.toEqual([{ text: '', at: null }]);
    await expect(svc.messageEdits(noEdits)).resolves.toEqual([]);
    await expectCode(svc.messageEdits(new Types.ObjectId().toString()), 'NOT_FOUND', 'No such message');
  });

  it('keeps one reaction per person: add, replace, take back', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const id = await rawMessage(peer, me, '2026-10-01T10:00:00Z', { reactions: [{ user_id: peer, emoji: '😂', at: new Date() }] });

    const added = await svc.react(me, id, ' 👍 ');
    expect(added.reactions.map((r) => [r.user_id, r.emoji])).toEqual([
      [peer, '😂'],
      [me, '👍'],
    ]);
    const replaced = await svc.react(me, id, '❤️');
    expect(replaced.reactions.map((r) => [r.user_id, r.emoji])).toEqual([
      [peer, '😂'],
      [me, '❤️'],
    ]);
    const removed = await svc.react(me, id, '❤️');
    expect(removed.reactions.map((r) => r.user_id)).toEqual([peer]);
  });

  it('takes back a legacy THUMBS_UP when the same emoji is sent again', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const id = await rawMessage(peer, me, '2026-10-01T10:00:00Z', { reactions: [{ user_id: me, emoji: 'THUMBS_UP', at: new Date() }] });
    const out = await svc.react(me, id, '👍');
    expect(out.reactions).toEqual([]);
  });

  it('refuses a reaction on a missing, foreign or deleted message, or with no emoji', async () => {
    const me = await staff('Me');
    const a = await staff('A');
    const b = await staff('B');
    const foreign = await rawMessage(a, b, '2026-10-01T10:00:00Z');
    const deleted = await rawMessage(a, me, '2026-10-01T10:01:00Z', { deleted_at: new Date() });
    const live = await rawMessage(a, me, '2026-10-01T10:02:00Z');
    await expectCode(svc.react(me, new Types.ObjectId().toString(), '👍'), 'NOT_FOUND');
    await expectCode(svc.react(me, foreign, '👍'), 'FORBIDDEN');
    await expectCode(svc.react(me, deleted, '👍'), 'BAD_USER_INPUT', 'That message was deleted');
    await expectCode(svc.react(me, live, '   '), 'BAD_USER_INPUT', 'Pick an emoji');
  });

  it('removes my message as a tombstone and keeps the first deletion time on a repeat', async () => {
    const me = await staff('Me');
    const peer = await staff('Peer');
    const id = await rawMessage(me, peer, '2026-10-01T10:00:00Z', {
      text: 'oops',
      attachment_url: 'https://cdn/x',
      attachment_name: 'x',
      attachment_type: 'image/png',
    });

    const removed = await svc.remove(me, id);
    expect(removed).toEqual(expect.objectContaining({ text: '', attachment_url: '', attachment_name: '', attachment_type: '' }));
    expect(typeof removed.deleted_at).toBe('string');

    const again = await svc.remove(me, id);
    expect(again.deleted_at).toBe(removed.deleted_at);
    const stored = await StaffMessageModel.findById(id).lean();
    expect(stored).toEqual(expect.objectContaining({ text: '', attachment_url: '' }));

    await expectCode(svc.remove(peer, id), 'FORBIDDEN', 'That is not your message');
  });
});

describe('calls', () => {
  it('records a call, lists the thread’s calls newest first and clamps the limit', async () => {
    const me = 'user-me';
    const peer = 'user-peer';
    const older = await svc.recordCall({
      meId: me,
      peerId: peer,
      kind: 'AUDIO',
      outcome: 'MISSED',
      durationSeconds: -3,
      startedAt: new Date('2026-10-01T10:00:00Z'),
    });
    const newer = await svc.recordCall({
      meId: peer,
      peerId: me,
      kind: 'VIDEO',
      outcome: 'ANSWERED',
      durationSeconds: 61.6,
      startedAt: new Date('2026-10-01T11:00:00Z'),
    });

    const calls = await svc.calls(me, peer);

    expect(calls.map((c) => c.id)).toEqual([newer, older]);
    expect(calls[0]).toEqual(
      expect.objectContaining({
        from_user_id: peer,
        to_user_id: me,
        kind: 'VIDEO',
        outcome: 'ANSWERED',
        duration_seconds: 62,
        started_at: '2026-10-01T11:00:00.000Z',
        recording_url: null,
      })
    );
    expect(typeof calls[0].ended_at).toBe('string');
    expect(calls[1].duration_seconds).toBe(0);
    expect(await svc.calls(me, peer, 0)).toHaveLength(1);
  });

  it('attaches a recording only to a call the caller was on', async () => {
    const callId = await svc.recordCall({
      meId: 'a',
      peerId: 'b',
      kind: 'VIDEO',
      outcome: 'ANSWERED',
      durationSeconds: 10,
      startedAt: new Date('2026-10-01T10:00:00Z'),
    });

    await expectCode(svc.attachRecording('intruder', callId, 'https://cdn/evil.mp4'), 'NOT_FOUND', 'That call is not yours');
    expect((await StaffCallModel.findById(callId).lean())?.recording_url).toBeNull();

    await expect(svc.attachRecording('b', callId, 'https://cdn/call.mp4')).resolves.toBe(true);
    expect((await StaffCallModel.findById(callId).lean())?.recording_url).toBe('https://cdn/call.mp4');
  });
});
