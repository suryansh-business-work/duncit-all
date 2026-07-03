import { jobApplicationService } from '../../jobApplication.service';
import { JobApplicationModel } from '../../jobApplication.model';

const baseInput = {
  role_content_id: null,
  role_title: 'Frontend Engineer',
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+919876543210',
  resume_url: 'https://drive.example.com/cv',
  portfolio_url: '',
  cover_note: 'I ship fast.',
};

describe('jobApplicationService integration', () => {
  it('stores a public application and lists it for triage', async () => {
    const result = await jobApplicationService.submit(baseInput);
    expect(result.ok).toBe(true);

    const list = await jobApplicationService.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      role_title: 'Frontend Engineer',
      name: 'Asha Rao',
      email: 'asha@example.com',
      status: 'NEW',
    });
  });

  it('soft-dedupes a rapid double submit of the same email + role', async () => {
    await jobApplicationService.submit(baseInput);
    const again = await jobApplicationService.submit(baseInput);
    expect(again.ok).toBe(true);
    expect(await JobApplicationModel.countDocuments()).toBe(1);

    // A different role from the same person is a separate application.
    await jobApplicationService.submit({ ...baseInput, role_title: 'Designer' });
    expect(await JobApplicationModel.countDocuments()).toBe(2);
  });

  it('filters by status and updates it', async () => {
    await jobApplicationService.submit(baseInput);
    const [app] = await jobApplicationService.list('NEW');
    const updated = await jobApplicationService.updateStatus(app.id, 'SHORTLISTED');
    expect(updated.status).toBe('SHORTLISTED');
    expect(await jobApplicationService.list('NEW')).toHaveLength(0);
    expect(await jobApplicationService.list('SHORTLISTED')).toHaveLength(1);
  });

  it('rejects a bad id and reports missing applications', async () => {
    await expect(jobApplicationService.updateStatus('nope', 'HIRED')).rejects.toThrow(/invalid/i);
    await expect(
      jobApplicationService.updateStatus('64b000000000000000000000', 'HIRED')
    ).rejects.toThrow(/not found/i);
  });
});
