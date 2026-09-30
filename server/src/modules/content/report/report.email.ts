import { UserModel } from '@modules/access/user/user.model';
import { sendEmail } from '@services/email/email.service';
import type { IContentReport } from './contentReport.model';

/** Notify the author once when their content first enters the Legal queue. */
export async function notifyReportedContentOwner(report: IContentReport): Promise<void> {
  if (!report.target_owner_id) return;
  const owner = await UserModel.findById(report.target_owner_id)
    .select('auth.email profile.first_name')
    .lean();
  const email = owner?.auth?.email;
  if (!email) return;

  await sendEmail({
    to: email,
    subject: '{{t:email.contentReported.subject}}',
    template: 'ugc-content-reported',
    category: 'legal',
    vars: {
      name: owner.profile?.first_name?.trim() || '',
      report_no: report.report_no ?? '',
    },
  });
}
