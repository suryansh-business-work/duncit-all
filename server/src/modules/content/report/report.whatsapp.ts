import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';

/**
 * The WhatsApp twin of the `content-report-received` email: the reporter is
 * told their report reached Legal, with the reference to quote. `entityId` is
 * the report itself, so a repeat filing of the same report is not re-sent —
 * the email already confirms the edit. Never throws: the report is filed.
 */
export async function sendReportReceivedWhatsApp(reporterId: Types.ObjectId, reportId: string, reportNo: string) {
  try {
    const user = await UserModel.findById(reporterId)
      .select('profile.first_name auth.phone communication.whatsapp')
      .lean<{ profile?: { first_name?: string } } & Record<string, unknown>>();
    if (!user) return;
    const name = user.profile?.first_name?.trim() || 'there';
    await whatsappService.send({
      event: 'USER_REPORT_RECEIVED',
      entityId: reportId,
      user,
      name,
      params: [name, reportNo],
    });
  } catch (error) {
    logs.server.error('report.whatsapp', 'sendReportReceivedWhatsApp', { error, report_no: reportNo });
  }
}
