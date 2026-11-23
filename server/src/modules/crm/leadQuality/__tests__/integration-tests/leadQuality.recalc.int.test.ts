jest.mock('@modules/platform/backgroundJob/backgroundJob.runner', () => ({ scheduleJob: jest.fn() }));

import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { BackgroundJobModel, type LeanBackgroundJob } from '@modules/platform/backgroundJob/backgroundJob.model';
import { crmService } from '@modules/crm/crm/crm.service';
import { VenueLeadModel } from '@modules/crm/crm/crm.model';
import { leadQualityService } from '../../leadQuality.service';
import { recalcRunning, startRecalc, SYSTEM_JOB_ACTOR } from '../../leadQuality.recalc';
import { recalcLeadQualityStep } from '../../leadQuality.recalcStep';

/**
 * Bulk recalculation runs as a LEAD_QUALITY_RECALC background job: sized up
 * front, worked in batches from a cursor, failures kept with their reason.
 */

const actor = { id: 'crm-1', email: 'asha@duncit.com', roles: ['CRM_MANAGER'] };

const venues = async (count: number) => {
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const lead = await crmService.createVenueLead({ venue_name: `Venue ${i}`, city: 'Pune', full_address: `Plot ${i}`, instagram_link: `https://www.instagram.com/venue${i}/` });
    ids.push(String(lead?.id));
  }
  return ids;
};

const jobOf = async (id: string) => (await BackgroundJobModel.findById(id).lean<LeanBackgroundJob>()) as LeanBackgroundJob;

describe('startRecalc', () => {
  it('sizes the job, records it for the person and hands it to the runner', async () => {
    await venues(3);
    const started = await startRecalc(actor, { entity_type: 'VENUE_LEAD', trigger: 'RECALCULATE' });
    expect(started?.total).toBe(3);
    const job = await jobOf(String(started?.job_id));
    expect(job).toMatchObject({ kind: 'LEAD_QUALITY_RECALC', label: 'Venue lead quality scores', status: 'RUNNING', total: 3, actor });
    expect(scheduleJob).toHaveBeenCalledWith(String(started?.job_id));
    expect(await recalcRunning('VENUE_LEAD')).toBe(true);
    expect(await recalcRunning('HOST_LEAD')).toBe(false);
  });

  it('starts nothing when no lead is in scope', async () => {
    expect(await startRecalc(actor, { entity_type: 'HOST_LEAD', trigger: 'RECALCULATE' })).toBeNull();
  });

  it('can take only the leads that were never scored, or only the ids given', async () => {
    const ids = await venues(3);
    await VenueLeadModel.updateOne({ _id: ids[1] }, { $unset: { quality: 1 } });
    expect((await startRecalc(SYSTEM_JOB_ACTOR, { entity_type: 'VENUE_LEAD', trigger: 'BACKFILL', only_unscored: true }))?.total).toBe(1);
    expect((await startRecalc(actor, { entity_type: 'VENUE_LEAD', trigger: 'RECALCULATE', ids: [ids[0], 'not-an-id'] }))?.total).toBe(1);
  });
});

describe('recalcLeadQualityStep', () => {
  it('scores every lead in scope and stops when the scope is done', async () => {
    const ids = await venues(2);
    await VenueLeadModel.updateMany({}, { $unset: { quality: 1 } });
    const started = await startRecalc(actor, { entity_type: 'VENUE_LEAD', trigger: 'CONFIG_PUBLISH' });
    expect(await recalcLeadQualityStep(await jobOf(String(started?.job_id)))).toBe(false);
    const job = await jobOf(String(started?.job_id));
    expect(job).toMatchObject({ succeeded: 2, failed: 0 });
    expect(String(job.cursor)).toBe(ids[1]);
    expect((await VenueLeadModel.find({ quality: { $exists: true } }).lean()).length).toBe(2);
    expect(await recalcLeadQualityStep(job)).toBe(false);
  });

  it('keeps going past a lead that fails, recording why', async () => {
    const ids = await venues(2);
    const started = await startRecalc(actor, { entity_type: 'VENUE_LEAD', trigger: 'RECALCULATE' });
    const real = leadQualityService.score.bind(leadQualityService);
    jest.spyOn(leadQualityService, 'score').mockImplementation((type, id, options) => (id === ids[0] ? Promise.reject(new Error('boom')) : real(type, id, options)));
    await recalcLeadQualityStep(await jobOf(String(started?.job_id)));
    expect(await jobOf(String(started?.job_id))).toMatchObject({ succeeded: 1, failed: 1, failures: [{ id: ids[0], message: 'boom' }] });
    jest.restoreAllMocks();
  });
});
