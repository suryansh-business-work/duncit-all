import * as yup from 'yup';
import { GraphQLError } from 'graphql';
import { FaqSubmissionModel, type IFaqSubmission, type FaqSubmissionStatus } from './faqSubmission.model';
import { sendEmail } from '@services/email/email.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { getUrlConfigs } from '@config/url-configs';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

const submitSchema = yup.object({
  question: yup.string().required('Question is required').min(5).max(2000),
  email: yup.string().nullable().notRequired().email('Invalid email').max(160),
  super_category_slug: yup.string().nullable().notRequired().max(80),
});

const toPub = (f: IFaqSubmission) => ({
  id: String(f._id),
  question: f.question,
  email: f.email ?? null,
  super_category_slug: f.super_category_slug ?? null,
  status: f.status,
  converted_faq_id: f.converted_faq_id ? String(f.converted_faq_id) : null,
  created_at: f.created_at.toISOString(),
  updated_at: f.updated_at.toISOString(),
});

/** Allowlists for the shared table engine (faqSubmissionsTable — DUNCIT TABLE CONTRACT v1). */
const FAQ_SUBMISSION_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['question', 'email', 'super_category_slug'],
  sortFields: {
    question: 'question',
    email: 'email',
    super_category_slug: 'super_category_slug',
    status: 'status',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    super_category_slug: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export const faqSubmissionService = {
  async list(status?: FaqSubmissionStatus) {
    const q: any = {};
    if (status) q.status = status;
    const docs = await FaqSubmissionModel.find(q).sort({ created_at: -1 }).exec();
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for faqSubmissionsTable. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IFaqSubmission>(
      FaqSubmissionModel,
      {},
      input,
      FAQ_SUBMISSION_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async submit(input: { question: string; email?: string | null; super_category_slug?: string | null }) {
    let payload: { question: string; email: string | null; super_category_slug: string | null };
    try {
      payload = (await submitSchema.validate(input, { abortEarly: false })) as any;
    } catch (e: any) {
      throw new GraphQLError(e.message || 'Invalid input', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    await FaqSubmissionModel.create({
      question: payload.question,
      email: payload.email || null,
      super_category_slug: payload.super_category_slug || null,
    });
    if (payload.email) {
      try {
        const branding = await settingsService.getBranding();
        const urlConfigs = await getUrlConfigs();
        await sendEmail({
          to: payload.email,
          subject: `We received your question — ${branding?.app_name || 'Duncit'}`,
          template: 'faq-received',
          vars: {
            question: payload.question,
            app_name: branding?.app_name || 'Duncit',
            logo_url: branding?.logo_url || 'https://duncit.com/duncit-logo.svg',
            support_email: branding?.support_email || urlConfigs.supportEmail,
          },
        });
      } catch (e) {
        logs.server.warn('faqSubmission', 'submit', {
          error: e,
          msg: 'faq submission ack email failed',
          email: payload.email,
        });
      }
    }
    return { ok: true, message: 'Thanks! We will look into your question.' };
  },

  async setStatus(id: string, status: FaqSubmissionStatus, converted_faq_id?: string | null) {
    const doc = await FaqSubmissionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          converted_faq_id: converted_faq_id || null,
        },
      },
      { new: true }
    );
    if (!doc) throw new GraphQLError('FAQ submission not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(doc);
  },
};
