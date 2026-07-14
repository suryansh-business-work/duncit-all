import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { CrmEmailTemplateModel } from './crmEmailTemplate.model';
// Reuse the pure MJML helpers (no DB access) from the core module.
import { renderMjml, applyVars, detectVariables } from '@modules/content/emailTemplate/emailTemplate.service';
import { commsService } from '@services/comms/comms.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    template_id: o.template_id,
    slug: o.slug,
    name: o.name,
    description: o.description ?? null,
    subject: o.subject,
    target: o.target ?? 'STATIC',
    mjml: o.mjml,
    variables: (o.variables ?? []).map((v: any) => ({
      key: v.key,
      description: v.description ?? null,
      sample: v.sample ?? null,
    })),
    images: (o.images ?? []).map((a: any) => ({ url: a.url, name: a.name ?? null })),
    attachments: (o.attachments ?? []).map((a: any) => ({ url: a.url, name: a.name ?? null })),
    is_active: o.is_active !== false,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

const slugify = (s: string) =>
  String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function parseVars(json?: string | null): Record<string, string> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Allowlists for the shared table engine (crmEmailTemplatesTable — DUNCIT TABLE CONTRACT v1). */
const EMAIL_TEMPLATE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'slug', 'subject'],
  sortFields: {
    name: 'name',
    slug: 'slug',
    subject: 'subject',
    target: 'target',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    target: { type: 'enum' },
    is_active: { type: 'boolean' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  defaultSort: { name: 1 },
};

export const crmEmailTemplateService = {
  async list() {
    const docs = await CrmEmailTemplateModel.find().sort({ name: 1 });
    return docs.map(pub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the crmEmailTemplatesTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      CrmEmailTemplateModel,
      {},
      input,
      EMAIL_TEMPLATE_TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  async byId(template_id: string) {
    return pub(await CrmEmailTemplateModel.findOne({ template_id }));
  },

  render(mjml: string, varsJson?: string | null) {
    const { html, errors } = renderMjml(mjml, parseVars(varsJson));
    return { html, errors, detected_variables: detectVariables(mjml) };
  },

  async create(input: any, by?: string | null) {
    const slug = slugify(input.slug || input.name);
    if (!slug) throw new GraphQLError('Slug is required', { extensions: { code: 'BAD_USER_INPUT' } });
    if (await CrmEmailTemplateModel.findOne({ slug })) {
      throw new GraphQLError('A CRM template with that slug already exists', { extensions: { code: 'CONFLICT' } });
    }
    const doc = await CrmEmailTemplateModel.create({
      template_id: crypto.randomUUID(),
      slug,
      name: String(input.name || '').trim(),
      description: input.description ?? null,
      subject: String(input.subject || '').trim(),
      target: input.target ?? 'STATIC',
      mjml: input.mjml,
      variables: input.variables ?? [],
      images: input.images ?? [],
      attachments: input.attachments ?? [],
      is_active: input.is_active !== false,
      created_by: by ?? null,
    });
    return pub(doc);
  },

  async update(template_id: string, input: any) {
    const doc = await CrmEmailTemplateModel.findOneAndUpdate(
      { template_id },
      { $set: input },
      { new: true }
    );
    if (!doc) throw new GraphQLError('CRM template not found', { extensions: { code: 'NOT_FOUND' } });
    return pub(doc);
  },

  async delete(template_id: string) {
    const r = await CrmEmailTemplateModel.deleteOne({ template_id });
    return r.deletedCount > 0;
  },

  /** Append an image to the template's library and persist immediately. */
  async addImage(template_id: string, image: { url: string; name?: string | null }) {
    const doc = await CrmEmailTemplateModel.findOneAndUpdate(
      { template_id },
      { $push: { images: { url: image.url, name: image.name ?? null } } },
      { new: true }
    );
    if (!doc) throw new GraphQLError('CRM template not found', { extensions: { code: 'NOT_FOUND' } });
    return pub(doc);
  },

  /** Remove a library image by URL and persist immediately. */
  async removeImage(template_id: string, url: string) {
    const doc = await CrmEmailTemplateModel.findOneAndUpdate(
      { template_id },
      { $pull: { images: { url } } },
      { new: true }
    );
    if (!doc) throw new GraphQLError('CRM template not found', { extensions: { code: 'NOT_FOUND' } });
    return pub(doc);
  },

  /** Render a stored CRM template and send it to one address (test send). */
  async sendTest(template_id: string, to: string, varsJson?: string | null, providerId?: string | null) {
    const tpl = await CrmEmailTemplateModel.findOne({ template_id });
    if (!tpl) throw new GraphQLError('CRM template not found', { extensions: { code: 'NOT_FOUND' } });
    const vars = parseVars(varsJson);
    const { html, errors } = renderMjml(tpl.mjml, vars);
    if (!html) return { ok: false, message: errors[0] || 'Could not render template' };
    const result = await commsService.sendEmail({
      to,
      subject: applyVars(tpl.subject, vars),
      body: html,
      provider_id: providerId ?? null,
      attachments: (tpl.attachments ?? []).map((a: any) => ({ url: a.url, name: a.name })),
    });
    return { ok: result.ok, message: result.message };
  },
};
