jest.mock('@services/email/email.service', () => ({
  sendInterviewApplicantEmail: jest.fn().mockResolvedValue(undefined),
  sendInterviewAdminEmail: jest.fn().mockResolvedValue(undefined),
  sendInterviewScheduledEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import { interviewService } from '../../interview.service';

const userId = new Types.ObjectId().toString();
const slot = (offset: number) => ({
  start: new Date(Date.now() + offset).toISOString(),
  end: new Date(Date.now() + offset + 3_600_000).toISOString(),
});

const baseInput = () => ({
  type: 'HOST',
  applicant_name: 'Asha',
  applicant_email: 'asha@x.com',
  applicant_phone: '+919999999999',
  about: 'I want to host pods',
  preferred_slots: [slot(86_400_000)],
});

describe('interviewService integration', () => {
  it('creates an interview in PENDING and lists it', async () => {
    const created = await interviewService.create(baseInput(), userId);
    expect(created.status).toBe('PENDING');

    expect(await interviewService.list()).toHaveLength(1);
    expect(await interviewService.listForUser(userId)).toHaveLength(1);
    expect((await interviewService.getById(created.id))?.applicant_name).toBe('Asha');
  });

  it('schedules an interview via update', async () => {
    const created = await interviewService.create(baseInput(), userId);
    const scheduled = await interviewService.update(created.id, {
      scheduled_slot: slot(172_800_000),
      meeting_link: 'https://meet/abc',
    });
    expect(scheduled.status).toBe('SCHEDULED');
    expect(scheduled.meeting_link).toBe('https://meet/abc');
  });

  it('removes an interview', async () => {
    const created = await interviewService.create(baseInput(), userId);
    expect(await interviewService.remove(created.id)).toBe(true);
    expect(await interviewService.list()).toHaveLength(0);
  });
});
