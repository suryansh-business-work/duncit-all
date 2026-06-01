import { Types } from 'mongoose';
import { communicationLogService } from '../../communicationLog.service';

const entityId = new Types.ObjectId().toString();

describe('communicationLogService integration', () => {
  it('creates a CALL log (transcript pending) and lists it', async () => {
    const created = await communicationLogService.create({
      type: 'CALL',
      entity_type: 'VENUE_LEAD',
      entity_id: entityId,
      contact_value: '+919999999999',
      provider_name: 'twilio',
    });
    expect(created!.type).toBe('CALL');
    expect(created!.transcript_status).toBe('PENDING');

    const page = await communicationLogService.list({}, {});
    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
  });

  it('filters by type and entity', async () => {
    await communicationLogService.create({ type: 'EMAIL', entity_type: 'HOST_LEAD', entity_id: entityId, contact_value: 'a@b.com' });
    await communicationLogService.create({ type: 'CALL', entity_type: 'VENUE_LEAD', entity_id: entityId, contact_value: '+91' });

    const emails = await communicationLogService.list({ type: 'EMAIL' }, {});
    expect(emails.total).toBe(1);
    const byEntity = await communicationLogService.list({ entity_id: entityId }, {});
    expect(byEntity.total).toBe(2);
  });

  it('only allows transcripts for CALL logs', async () => {
    const email = await communicationLogService.create({ type: 'EMAIL', entity_type: 'HOST_LEAD', entity_id: entityId, contact_value: 'a@b.com' });
    await expect(communicationLogService.requestTranscript(email!.id)).rejects.toThrow(/only available for call/i);
    await expect(communicationLogService.requestTranscript(new Types.ObjectId().toString())).rejects.toThrow(/not found/i);
  });
});
