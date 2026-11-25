import type { GraphQLContext } from '@context';
import { crmService } from '@modules/crm/crm/crm.service';
import { prospectLeadService } from '@modules/crm/prospectLead/prospectLead.service';
import { CommunicationLogModel } from '@modules/crm/communicationLog/communicationLog.model';
import { VenueLeadModel } from '@modules/crm/crm/crm.model';
import { servamService } from '@services/servam/servam.service';
import { summarizeCallInBackground } from '@modules/crm/call/call.summary';
import { deviceCallResolvers } from '../../deviceCall.resolver';

jest.mock('@modules/crm/call/call.summary', () => ({ summarizeCallInBackground: jest.fn() }));

/**
 * The Duncit CRM app's server half: caller ID lookups, the offline directory,
 * and calls made on a phone's own SIM landing in the lead's communication log.
 */

const crm = { user: { id: 'crm-1', roles: ['CRM_MANAGER'] } } as unknown as GraphQLContext;
const otherCrm = { user: { id: 'crm-2', roles: ['CRM_MANAGER'] } } as unknown as GraphQLContext;
const admin = { user: { id: 'boss', roles: ['SUPER_ADMIN'] } } as unknown as GraphQLContext;
const member = { user: { id: 'u-1', roles: ['USER'] } } as unknown as GraphQLContext;

const { Query, Mutation } = deviceCallResolvers;
const RECORDING = 'https://ik.imagekit.io/duncit/staging/staff/crm-1/call_recordings/call.m4a';

const seed = async () => {
  const venue = await crmService.createVenueLead({
    venue_name: 'Smash Arena',
    city: 'Pune',
    full_address: 'Plot 12',
    contacts: [{ name: 'Rohit', role: 'Owner', mobile_number: '+91 98110 00001', whatsapp_number: '98110 00009' }],
  });
  const creator = await prospectLeadService.create('CREATOR_LEAD', {
    creator_name: 'Riya Runs',
    city: 'Mumbai',
    contacts: [{ name: 'Riya', mobile_number: '9822000002' }],
  });
  return { venue: venue!, creator: creator! };
};

const callInput = (entity_id: string, over: Record<string, unknown> = {}) => ({
  client_call_id: 'device-a:101',
  entity_type: 'VENUE_LEAD',
  entity_id,
  contact_number: '09811000001',
  contact_name: 'Rohit',
  direction: 'INBOUND',
  outcome: 'COMPLETED',
  started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  duration_seconds: 134,
  ...over,
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

afterEach(() => jest.restoreAllMocks());

describe('crmPhoneLookup', () => {
  it('finds the lead behind a number however it was typed, by mobile or WhatsApp', async () => {
    const { venue } = await seed();

    const byMobile = await Query.crmPhoneLookup({}, { phone: '9811000001' }, crm);
    expect(byMobile.phone_key).toBe('9811000001');
    expect(byMobile.matches).toHaveLength(1);
    expect(byMobile.matches[0]).toMatchObject({
      entity_type: 'VENUE_LEAD',
      lead_id: venue.id,
      lead_name: 'Smash Arena',
      contact_name: 'Rohit',
      contact_role: 'Owner',
      city: 'Pune',
    });

    const byWhatsapp = await Query.crmPhoneLookup({}, { phone: '+91-98110-00009' }, crm);
    expect(byWhatsapp.matches.map((m) => m.lead_id)).toEqual([venue.id]);
  });

  it('answers empty for an unknown number and for one too short to identify anyone', async () => {
    await seed();
    expect((await Query.crmPhoneLookup({}, { phone: '9000000000' }, crm)).matches).toEqual([]);
    expect(await Query.crmPhoneLookup({}, { phone: '123' }, crm)).toEqual({ phone_key: '', matches: [] });
  });

  it('is CRM staff only', () => {
    expect(() => Query.crmPhoneLookup({}, { phone: '9811000001' }, member)).toThrow('Access Denied');
  });
});

describe('crmPhoneDirectory', () => {
  it('walks every lead kind page by page and ends with a null cursor', async () => {
    const { venue, creator } = await seed();
    const entries: Array<{ phone_key: string; lead_id: string }> = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await Query.crmPhoneDirectory({}, { cursor, limit: 1 }, crm);
      entries.push(...page.items);
      cursor = page.next_cursor;
      pages += 1;
    } while (cursor && pages < 20);

    expect(cursor).toBeNull();
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phone_key: '9811000001', lead_id: venue.id }),
        expect.objectContaining({ phone_key: '9811000009', lead_id: venue.id }),
        expect.objectContaining({ phone_key: '9822000002', lead_id: creator.id }),
      ])
    );
  });

  it('is CRM staff only', () => {
    expect(() => Query.crmPhoneDirectory({}, {}, member)).toThrow('Access Denied');
  });
});

describe('logCrmDeviceCall', () => {
  it('writes an inbound call to the communication log and the lead timeline', async () => {
    const { venue } = await seed();

    const log = await Mutation.logCrmDeviceCall({}, { input: callInput(venue.id, { note: 'Wants Sunday' }) }, crm);

    expect(log).toMatchObject({
      type: 'CALL',
      direction: 'INBOUND',
      status: 'COMPLETED',
      duration_seconds: 134,
      contact_value: '09811000001',
      transcript_status: 'NONE',
      created_by: 'crm-1',
    });
    const stored = await VenueLeadModel.findById(venue.id).lean();
    expect(stored?.activity_log.at(-1)).toMatchObject({
      type: 'CALL',
      summary: 'Inbound call (2m 14s): Wants Sunday',
      status: 'COMPLETED',
      created_by: 'crm-1',
    });
  });

  it('returns the same log when the app re-sends a call, without touching the timeline again', async () => {
    const { venue } = await seed();

    const first = await Mutation.logCrmDeviceCall({}, { input: callInput(venue.id) }, crm);
    const again = await Mutation.logCrmDeviceCall({}, { input: callInput(venue.id) }, crm);

    expect(again?.id).toBe(first?.id);
    expect(await CommunicationLogModel.countDocuments({ external_id: 'device:device-a:101' })).toBe(1);
    const stored = await VenueLeadModel.findById(venue.id).lean();
    expect(stored?.activity_log.filter((a) => a.type === 'CALL')).toHaveLength(1);
  });

  it('keeps two people’s calls apart even when their devices reuse a call id', async () => {
    const { venue } = await seed();
    const mine = await Mutation.logCrmDeviceCall({}, { input: callInput(venue.id) }, crm);
    const theirs = await Mutation.logCrmDeviceCall({}, { input: callInput(venue.id) }, otherCrm);
    expect(theirs?.id).not.toBe(mine?.id);
  });

  it('refuses a call against a lead that does not exist', async () => {
    await expect(
      Mutation.logCrmDeviceCall({}, { input: callInput('64b000000000000000000099') }, crm)
    ).rejects.toThrow('Lead not found');
  });

  it('refuses a malformed report, naming the field', async () => {
    const { venue } = await seed();
    await expect(
      Mutation.logCrmDeviceCall({}, { input: callInput(venue.id, { duration_seconds: -5 }) }, crm)
    ).rejects.toThrow('duration_seconds');
  });

  it('is CRM staff only', () => {
    expect(() => Mutation.logCrmDeviceCall({}, { input: {} }, member)).toThrow('Access Denied');
  });
});

describe('attachCrmDeviceCallRecording', () => {
  const logCall = async () => {
    const { venue } = await seed();
    return (await Mutation.logCrmDeviceCall({}, { input: callInput(venue.id) }, crm))!;
  };

  it('stores the recording, transcribes it in the background and asks for the summary', async () => {
    const transcribe = jest.spyOn(servamService, 'transcribe').mockResolvedValue({ ok: true, message: 'ok', transcript: 'Agent: Hello' });
    const log = await logCall();

    const attached = await Mutation.attachCrmDeviceCallRecording(
      {},
      { input: { log_id: log.id, recording_url: RECORDING, file_name: 'call.m4a', content_type: 'audio/mp4' } },
      crm
    );
    expect(attached).toMatchObject({ recording_url: RECORDING, transcript_status: 'PENDING' });

    await flush();
    await flush();
    expect(transcribe).toHaveBeenCalledWith({ audioUrl: RECORDING, fileName: 'call.m4a', contentType: 'audio/mp4', withTimestamps: false });
    const stored = await CommunicationLogModel.findById(log.id).lean();
    expect(stored).toMatchObject({ transcript: 'Agent: Hello', transcript_status: 'READY' });
    expect(summarizeCallInBackground).toHaveBeenCalledWith(log.id);
  });

  it('records why there is no transcript when speech-to-text fails', async () => {
    jest.spyOn(servamService, 'transcribe').mockResolvedValue({ ok: false, message: 'Servam AI is not configured' });
    const log = await logCall();

    await Mutation.attachCrmDeviceCallRecording({}, { input: { log_id: log.id, recording_url: RECORDING } }, crm);
    await flush();
    await flush();

    const stored = await CommunicationLogModel.findById(log.id).lean();
    expect(stored).toMatchObject({ transcript_status: 'FAILED', error_message: 'Servam AI is not configured' });
  });

  it('does nothing new when the same recording is attached twice', async () => {
    const transcribe = jest.spyOn(servamService, 'transcribe').mockResolvedValue({ ok: true, message: 'ok', transcript: 'x' });
    const log = await logCall();
    await Mutation.attachCrmDeviceCallRecording({}, { input: { log_id: log.id, recording_url: RECORDING } }, crm);
    await flush();
    await Mutation.attachCrmDeviceCallRecording({}, { input: { log_id: log.id, recording_url: RECORDING } }, crm);
    await flush();
    expect(transcribe).toHaveBeenCalledTimes(1);
  });

  it('refuses a recording that was not uploaded through Duncit', async () => {
    const log = await logCall();
    await expect(
      Mutation.attachCrmDeviceCallRecording({}, { input: { log_id: log.id, recording_url: 'https://evil.example/a.m4a' } }, crm)
    ).rejects.toThrow('uploaded through Duncit');
  });

  it('lets only the caller or a super admin attach it', async () => {
    jest.spyOn(servamService, 'transcribe').mockResolvedValue({ ok: false, message: 'off' });
    const log = await logCall();
    await expect(
      Mutation.attachCrmDeviceCallRecording({}, { input: { log_id: log.id, recording_url: RECORDING } }, otherCrm)
    ).rejects.toThrow('Only the person who made the call');
    await expect(
      Mutation.attachCrmDeviceCallRecording({}, { input: { log_id: log.id, recording_url: RECORDING } }, admin)
    ).resolves.toMatchObject({ recording_url: RECORDING });
  });

  it('refuses a log that is not a device call', async () => {
    const { venue } = await seed();
    const twilio = await CommunicationLogModel.create({
      type: 'CALL',
      entity_type: 'VENUE_LEAD',
      entity_id: venue.id,
      contact_value: '9811000001',
      created_by: 'crm-1',
      metadata: { mode: 'PORTAL' },
    });
    await expect(
      Mutation.attachCrmDeviceCallRecording({}, { input: { log_id: String(twilio._id), recording_url: RECORDING } }, crm)
    ).rejects.toThrow('Device call not found');
  });
});
