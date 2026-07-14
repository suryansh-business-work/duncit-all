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

  it('serves the jobApplicationsTable page with search, filter, sort and paging', async () => {
    await jobApplicationService.submit(baseInput);
    await jobApplicationService.submit({ ...baseInput, name: 'Bram Voss', email: 'bram@example.com', role_title: 'Designer' });
    await jobApplicationService.submit({ ...baseInput, name: 'Chan Li', email: 'chan@example.com', role_title: 'Backend Engineer' });
    const rows = await jobApplicationService.list();
    const chan = rows.find((r) => r.name === 'Chan Li');
    await jobApplicationService.updateStatus(chan!.id, 'SHORTLISTED');

    // Plain envelope with the default sort (created_at desc, like the triage inbox).
    const all = await jobApplicationService.table();
    expect(all.total).toBe(3);
    expect(all.rows[0].name).toBe('Chan Li');
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans role_title, name and email.
    const searched = await jobApplicationService.table({ search: 'bram@' });
    expect(searched.rows.map((r) => r.name)).toEqual(['Bram Voss']);
    expect(searched.total).toBe(1);

    // Enum filter narrows (the status select becomes an enum filter).
    const shortlisted = await jobApplicationService.table({
      filters: [{ field: 'status', op: 'eq', value: 'SHORTLISTED' }],
    });
    expect(shortlisted.rows.map((r) => r.name)).toEqual(['Chan Li']);

    // Allowlisted sort + paging keep total and report the clamps back.
    const byName = await jobApplicationService.table({ sort_by: 'name', sort_dir: 'asc' });
    expect(byName.rows.map((r) => r.name)).toEqual(['Asha Rao', 'Bram Voss', 'Chan Li']);

    const page2 = await jobApplicationService.table({
      sort_by: 'name',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(page2.rows.map((r) => r.name)).toEqual(['Bram Voss']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('rejects a bad id and reports missing applications', async () => {
    await expect(jobApplicationService.updateStatus('nope', 'HIRED')).rejects.toThrow(/invalid/i);
    await expect(
      jobApplicationService.updateStatus('64b000000000000000000000', 'HIRED')
    ).rejects.toThrow(/not found/i);
  });
});
