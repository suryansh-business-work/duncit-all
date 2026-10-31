import { logs } from '@observability/log';
import { mailPreferenceService } from '@modules/content/mailPreference/mailPreference.service';
import { waPreferenceAllows } from '@modules/platform/whatsapp/whatsapp.service';
import { MarketingLeadModel, type MarketingLeadDoc } from '../leads/marketingLead.model';
import { emailKey, phoneKey } from '../leads/marketingLead.keys';
import { timelineEntry } from '../leads/marketingLead.service';
import { SYSTEM_LEAD_ACTOR } from '../leads/marketingLead.types';
import { OutreachEnrollmentModel, OutreachSequenceModel, type OutreachEnrollmentDoc, type OutreachSequenceDoc } from './outreach.model';
import { stopEnrollment } from './outreach.runner';

/**
 * A lead writing back. Called from the automation engine's two inbound doors
 * (WhatsApp webhook, connected Gmail mailbox) after STOP / START has already
 * been applied to the number, so the preference read here is the answer: a
 * number that just opted out ends its enrollments OPTED_OUT, anything else is
 * a reply. A reply moves the lead to REPLIED and, when the sequence says so,
 * stops it.
 */
const OPEN_STAGES = new Set(['NEW', 'CONTACTED']);

async function onLeadReply(match: Record<string, unknown>, optedOut: boolean, channel: string): Promise<number> {
  const leads = await MarketingLeadModel.find(match).select('_id stage').lean<MarketingLeadDoc[]>();
  if (leads.length === 0) return 0;
  const enrollments = await OutreachEnrollmentModel.find({ lead_id: { $in: leads.map((lead) => lead._id) }, status: { $in: ['ACTIVE', 'PAUSED', 'FAILED'] } }).lean<OutreachEnrollmentDoc[]>();
  if (enrollments.length === 0) return 0;
  const sequences = await OutreachSequenceModel.find({ _id: { $in: enrollments.map((row) => row.sequence_id) } }).select('stop_on_reply').lean<OutreachSequenceDoc[]>();
  const stops = new Map(sequences.map((seq) => [String(seq._id), seq.stop_on_reply]));
  for (const enrollment of enrollments) {
    if (optedOut) await stopEnrollment(enrollment, 'OPTED_OUT', `Opted out on ${channel}`);
    else if (stops.get(String(enrollment.sequence_id)) === false) {
      await OutreachEnrollmentModel.updateOne({ _id: enrollment._id }, { $push: { history: { at: new Date(), kind: 'REPLIED', step_index: -1, text: `Replied on ${channel}` } } });
    } else await stopEnrollment(enrollment, 'REPLIED', `Replied on ${channel}`);
  }
  const enrolledLeads = new Set(enrollments.map((row) => String(row.lead_id)));
  for (const lead of leads.filter((row) => enrolledLeads.has(String(row._id)))) {
    const text = optedOut ? `Opted out of outreach on ${channel}` : `Replied on ${channel}`;
    const toReplied = !optedOut && OPEN_STAGES.has(lead.stage);
    const push = [timelineEntry('OUTREACH', text, SYSTEM_LEAD_ACTOR), ...(toReplied ? [timelineEntry('STAGE', `${lead.stage} → REPLIED`, SYSTEM_LEAD_ACTOR)] : [])];
    await MarketingLeadModel.updateOne({ _id: lead._id }, { ...(toReplied ? { $set: { stage: 'REPLIED' } } : {}), $push: { timeline: { $each: push } } });
  }
  return enrollments.length;
}

export async function outreachWhatsappReply(from: string): Promise<number> {
  const key = phoneKey(from);
  if (!key) return 0;
  return onLeadReply({ phone_keys: key }, !(await waPreferenceAllows(from, 'marketing')), 'WhatsApp');
}

export async function outreachEmailReply(fromEmail: string): Promise<number> {
  const key = emailKey(fromEmail);
  if (!key) return 0;
  return onLeadReply({ email_keys: key }, !(await mailPreferenceService.allows(key, 'marketing')), 'email');
}

/** The inbound doors never fail on our account: a reply we could not match is logged, not thrown. */
export const noteOutreachReply = (channel: 'WHATSAPP' | 'EMAIL', from: string): Promise<void> =>
  (channel === 'WHATSAPP' ? outreachWhatsappReply(from) : outreachEmailReply(from)).then(
    () => undefined,
    (error: unknown) => logs.server.warn('outreach', 'reply', { error, channel })
  );
