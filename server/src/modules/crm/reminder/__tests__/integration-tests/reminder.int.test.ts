import { reminderService } from '../../reminder.service';
import { Types } from 'mongoose';

const leadId = new Types.ObjectId().toString();

describe('reminderService integration', () => {
  it('creates, lists by lead, toggles done and deletes', async () => {
    const r = await reminderService.create(
      { entity_type: 'VENUE_LEAD', lead_id: leadId, title: 'Call back', due_at: '2026-07-01T10:00:00.000Z' },
      'tester'
    );
    expect(r!.title).toBe('Call back');
    expect(r!.status).toBe('PENDING');

    const list = await reminderService.list({ entity_type: 'VENUE_LEAD', lead_id: leadId });
    expect(list).toHaveLength(1);

    const toggled = await reminderService.toggleDone(r!.id);
    expect(toggled!.status).toBe('DONE');

    expect(await reminderService.remove(r!.id)).toBe(true);
    expect(await reminderService.list({ lead_id: leadId })).toHaveLength(0);
  });

  it('filters by due-date range', async () => {
    await reminderService.create({ title: 'Jan', due_at: '2026-01-15T00:00:00.000Z' });
    await reminderService.create({ title: 'Dec', due_at: '2026-12-15T00:00:00.000Z' });
    const q1 = await reminderService.list({ from: '2026-01-01T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z' });
    expect(q1.map((r) => r!.title)).toContain('Jan');
    expect(q1.map((r) => r!.title)).not.toContain('Dec');
  });

  it('requires title and due date', async () => {
    await expect(reminderService.create({ title: '', due_at: '2026-01-01' } as any)).rejects.toThrow(/title/i);
    await expect(reminderService.create({ title: 'x', due_at: '' } as any)).rejects.toThrow(/due date/i);
  });
});
