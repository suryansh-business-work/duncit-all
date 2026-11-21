/**
 * The call-specific storage behind the advanced call window, against a real
 * database: transcript segments stored once each, the transcript built from
 * them, a summary run that only one caller can claim, a follow-up reminder
 * recorded once, and the agent's own live call found after a reload.
 */
import { Types } from 'mongoose';
import { CommunicationLogModel } from '../../communicationLog.model';
import { communicationLogService, transcriptText } from '../../communicationLog.service';

const lead = new Types.ObjectId().toString();

const call = (over: Record<string, unknown> = {}) =>
  communicationLogService.create({
    type: 'CALL',
    entity_type: 'VENUE_LEAD',
    entity_id: lead,
    contact_value: '+919800000000',
    status: 'IN_PROGRESS',
    created_by: 'agent1',
    metadata: { mode: 'PORTAL', from_number: '+15550001111', answered_at: '2026-11-22T10:00:00.000Z', muted: true },
    ...over,
  });

const segment = (seq: number, speaker: 'AGENT' | 'LEAD', text: string, track = speaker === 'LEAD' ? 'inbound_track' : 'outbound_track') => ({
  seq,
  track,
  speaker,
  text,
  confidence: 0.9,
  at: new Date('2026-11-22T10:00:05.000Z'),
});

describe('the public log shape', () => {
  it('shows the caller number, answer time, mode and control state, with an empty summary', async () => {
    const log = await call();

    expect(log).toMatchObject({
      from_number: '+15550001111',
      answered_at: '2026-11-22T10:00:00.000Z',
      mode: 'PORTAL',
      muted: true,
      on_hold: false,
      transcript_segments: [],
      summary: { status: 'NONE', text: '', key_points: [], sentiment: null, follow_ups: [], reminder_id: null, error: '', generated_at: null },
    });
  });

  it('shows nothing for a log with no call metadata', async () => {
    const log = await communicationLogService.create({ type: 'EMAIL', entity_type: 'HOST_LEAD', entity_id: lead, contact_value: 'a@b.com' });
    expect(log).toMatchObject({ from_number: null, answered_at: null, mode: null, muted: false, on_hold: false });
  });

  it('reads an older log saved before calls had a summary', async () => {
    const raw = await CommunicationLogModel.collection.insertOne({ type: 'CALL', entity_type: 'VENUE_LEAD', entity_id: new Types.ObjectId(lead), contact_value: '1' });
    const log = await communicationLogService.get(String(raw.insertedId));
    expect(log?.summary.status).toBe('NONE');
    expect(log?.transcript_segments).toEqual([]);
  });
});

describe('appendTranscriptSegment', () => {
  it('stores each utterance once, however often Twilio sends it, and keeps spoken order', async () => {
    const log = await call();

    await expect(communicationLogService.appendTranscriptSegment(log.id, segment(2, 'LEAD', 'Monday works'))).resolves.toBe(true);
    await expect(communicationLogService.appendTranscriptSegment(log.id, segment(2, 'LEAD', 'Monday works'))).resolves.toBe(false);
    await expect(communicationLogService.appendTranscriptSegment(log.id, segment(1, 'AGENT', 'When suits you?'))).resolves.toBe(true);
    // The same sequence number on the other track is a different utterance.
    await expect(communicationLogService.appendTranscriptSegment(log.id, segment(2, 'AGENT', 'Great'))).resolves.toBe(true);

    const stored = await communicationLogService.get(log.id);
    expect(stored?.transcript_segments.map((s) => [s.seq, s.speaker, s.text])).toEqual([
      [1, 'AGENT', 'When suits you?'],
      [2, 'LEAD', 'Monday works'],
      [2, 'AGENT', 'Great'],
    ]);
    expect(stored?.transcript_segments[0]).toMatchObject({ confidence: 0.9, at: '2026-11-22T10:00:05.000Z' });
  });

  it('ignores an id that is not one', async () => {
    await expect(communicationLogService.appendTranscriptSegment('nope', segment(1, 'LEAD', 'x'))).resolves.toBe(false);
  });
});

describe('finalizeLiveTranscript', () => {
  it('writes the speaker-labelled transcript and marks it ready', async () => {
    const log = await call();
    await communicationLogService.appendTranscriptSegment(log.id, segment(2, 'LEAD', ' Call me Monday '));
    await communicationLogService.appendTranscriptSegment(log.id, segment(1, 'AGENT', 'Hello'));

    const done = await communicationLogService.finalizeLiveTranscript(log.id);

    expect(done).toMatchObject({ transcript: 'Agent: Hello\nLead: Call me Monday', transcript_status: 'READY' });
  });

  it('leaves a call with nothing transcribed alone', async () => {
    const log = await call();
    await expect(communicationLogService.finalizeLiveTranscript(log.id)).resolves.toBeNull();
    expect((await communicationLogService.get(log.id))?.transcript_status).toBe('PENDING');
  });

  it('is null for a log that does not exist', async () => {
    await expect(communicationLogService.finalizeLiveTranscript(new Types.ObjectId().toString())).resolves.toBeNull();
  });
});

describe('transcriptText', () => {
  it('copes with no segments and with a segment that has no text', () => {
    expect(transcriptText(undefined)).toBe('');
    expect(transcriptText([{ seq: 1, speaker: 'LEAD', text: null }])).toBe('Lead: ');
  });
});

describe('the summary claim', () => {
  it('lets one run claim a call at a time', async () => {
    const log = await call();

    const first = await communicationLogService.claimSummary(log.id, { force: false });
    expect(first?.summary.status).toBe('PENDING');
    await expect(communicationLogService.claimSummary(log.id, { force: true })).resolves.toBeNull();
  });

  it('never re-runs a ready summary automatically, but does when asked', async () => {
    const log = await call();
    await communicationLogService.claimSummary(log.id, { force: false });
    await communicationLogService.saveSummary(log.id, {
      text: 'Wants pricing',
      key_points: ['40 guests'],
      sentiment: 'POSITIVE',
      outcome: 'Interested',
      follow_ups: ['Send prices'],
    });

    await expect(communicationLogService.claimSummary(log.id, { force: false })).resolves.toBeNull();
    await expect(communicationLogService.claimSummary(log.id, { force: true })).resolves.not.toBeNull();
  });

  it('takes over a run that died more than five minutes ago', async () => {
    const log = await call();
    await CommunicationLogModel.updateOne(
      { _id: log.id },
      { $set: { 'summary.status': 'PENDING', 'summary.claimed_at': new Date(Date.now() - 6 * 60 * 1000) } }
    );

    await expect(communicationLogService.claimSummary(log.id, { force: false })).resolves.not.toBeNull();
  });

  it('claims nothing for an email', async () => {
    const email = await communicationLogService.create({ type: 'EMAIL', entity_type: 'HOST_LEAD', entity_id: lead, contact_value: 'a@b.com' });
    await expect(communicationLogService.claimSummary(email.id, { force: true })).resolves.toBeNull();
  });

  it('stores a ready summary with when it was made', async () => {
    const log = await call();
    const saved = await communicationLogService.saveSummary(log.id, {
      text: 'Wants pricing',
      key_points: ['40 guests'],
      sentiment: 'MIXED',
      outcome: 'Interested',
      follow_ups: [],
    });

    expect(saved?.summary).toMatchObject({ status: 'READY', text: 'Wants pricing', key_points: ['40 guests'], sentiment: 'MIXED', outcome: 'Interested' });
    expect(saved?.summary.generated_at).toEqual(expect.any(String));
  });

  it('stores a failure, capped, for the portal to show', async () => {
    const log = await call();
    await communicationLogService.failSummary(log.id, 'x'.repeat(800));

    const failed = await communicationLogService.get(log.id);
    expect(failed?.summary.status).toBe('FAILED');
    expect(failed?.summary.error).toHaveLength(500);
  });

  it('records the follow-up reminder once', async () => {
    const log = await call();

    await expect(communicationLogService.setSummaryReminder(log.id, 'rem1')).resolves.toBe(true);
    await expect(communicationLogService.setSummaryReminder(log.id, 'rem2')).resolves.toBe(false);
    expect((await communicationLogService.get(log.id))?.summary.reminder_id).toBe('rem1');
  });
});

describe('activeCallFor', () => {
  it("finds the agent's latest live call, and nobody else's", async () => {
    const earlier = await call({ status: 'RINGING' });
    await CommunicationLogModel.collection.updateOne(
      { _id: new Types.ObjectId(earlier.id) },
      { $set: { created_at: new Date(Date.now() - 60 * 1000) } }
    );
    const latest = await call({ status: 'IN_PROGRESS' });
    await call({ created_by: 'agent2' });

    await expect(communicationLogService.activeCallFor('agent1')).resolves.toMatchObject({ id: latest.id });
  });

  it('ignores ended calls, emails and calls too old to still be live', async () => {
    await call({ status: 'COMPLETED' });
    await communicationLogService.create({ type: 'EMAIL', entity_type: 'HOST_LEAD', entity_id: lead, contact_value: 'a@b.com', created_by: 'agent1' });
    const stale = await call();
    await CommunicationLogModel.collection.updateOne(
      { _id: new Types.ObjectId(stale.id) },
      { $set: { created_at: new Date(Date.now() - 4 * 60 * 60 * 1000) } }
    );

    await expect(communicationLogService.activeCallFor('agent1')).resolves.toBeNull();
  });
});
