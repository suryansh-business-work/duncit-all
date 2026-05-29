import * as yup from 'yup';
import { GraphQLError } from 'graphql';
import { ContactSubmissionModel, type IContactSubmission, type ContactStatus } from './contact.model';
import { sendEmail } from '@services/email/email.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { getUrlConfigs } from '@config/url-configs';

const submitSchema = yup.object({
  name: yup.string().required('Name is required').max(120),
  email: yup.string().required('Email is required').email('Invalid email').max(160),
  subject: yup.string().max(200).default(''),
  message: yup.string().required('Message is required').min(5).max(5000),
  attachments: yup.array().of(yup.string().url().required()).max(10).default([]),
});

const toPub = (c: IContactSubmission) => ({
  id: String(c._id),
  name: c.name,
  email: c.email,
  subject: c.subject || '',
  message: c.message,
  attachments: Array.isArray((c as any).attachments) ? (c as any).attachments : [],
  status: c.status,
  created_at: c.created_at.toISOString(),
  updated_at: c.updated_at.toISOString(),
});

export const contactService = {
  async list(status?: ContactStatus, email?: string | null) {
    const q: any = {};
    if (status) q.status = status;
    if (email?.trim()) q.email = email.trim().toLowerCase();
    const docs = await ContactSubmissionModel.find(q).sort({ created_at: -1 }).exec();
    return docs.map(toPub);
  },

  async submit(input: { name: string; email: string; subject?: string; message: string; attachments?: string[] }) {
    let payload: { name: string; email: string; subject: string; message: string; attachments: string[] };
    try {
      payload = await submitSchema.validate(input, { abortEarly: false });
    } catch (e: any) {
      throw new GraphQLError(e.message || 'Invalid input', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    await ContactSubmissionModel.create(payload);
    try {
      const branding = await settingsService.getBranding();
      const urlConfigs = await getUrlConfigs();
      const supportEmail = branding?.support_email || urlConfigs.supportEmail;
      await sendEmail({
        to: payload.email,
        subject: `We received your message — ${branding?.app_name || 'Duncit'}`,
        template: 'contact-received',
        vars: {
          name: payload.name,
          subject: payload.subject || '(no subject)',
          message: payload.message,
          app_name: branding?.app_name || 'Duncit',
          logo_url: branding?.logo_url || 'https://duncit.com/duncit-logo.svg',
          support_email: supportEmail,
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('contact ack email failed:', e);
    }
    return { ok: true, message: 'Thanks! We have received your message.' };
  },

  async updateStatus(id: string, status: ContactStatus) {
    const doc = await ContactSubmissionModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );
    if (!doc) throw new GraphQLError('Contact submission not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(doc);
  },
};
