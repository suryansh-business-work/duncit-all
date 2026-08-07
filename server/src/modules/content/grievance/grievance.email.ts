import { sendEmail } from '@services/email/email.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { GrievanceOfficerModel } from './grievanceOfficer.model';

interface AcknowledgeInput {
  grievance_no: string;
  name: string;
  email: string;
  subject: string;
  description: string;
}

/**
 * The officer's details as one readable block.
 *
 * Built from whatever is filled in rather than a fixed four lines, so an
 * officer with no address published does not send an email with a dangling
 * empty line under their phone number.
 */
async function officerBlock(): Promise<string> {
  const officer = await GrievanceOfficerModel.findOne({ key: 'default' });
  if (!officer?.name) return '';
  return [officer.name, officer.email, officer.phone, officer.address]
    .map((line) => (line ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

/**
 * Tell the complainant their grievance was received, and give them its id.
 *
 * The id is the whole point of the email: it is what they quote when they
 * chase it, and the only thing they have that proves they raised it at all.
 */
export async function sendGrievanceAcknowledgement(input: AcknowledgeInput): Promise<void> {
  const branding = await settingsService.getBranding();
  const appName = branding?.app_name || 'Duncit';
  await sendEmail({
    to: input.email,
    subject: `${input.grievance_no} — ${appName}`,
    template: 'grievance-received',
    category: 'legal',
    vars: {
      name: input.name,
      grievance_no: input.grievance_no,
      subject: input.subject,
      description: input.description,
      officer_block: await officerBlock(),
      app_name: appName,
      logo_url: branding?.logo_url || 'https://duncit.com/duncit-logo.svg',
    },
  });
}
