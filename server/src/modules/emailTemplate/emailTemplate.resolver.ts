import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';
import { emailTemplateService, renderMjml, detectVariables } from './emailTemplate.service';
import nodemailer from 'nodemailer';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN'];

function parseVars(json?: string | null): Record<string, string> {
  if (!json) return {};
  try {
    const o = JSON.parse(json);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) out[k] = String(v);
    return out;
  } catch {
    return {};
  }
}

export const emailTemplateResolvers = {
  Query: {
    emailTemplates: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailTemplateService.list();
    },
    emailTemplate: (_p: unknown, args: { template_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailTemplateService.byId(args.template_id);
    },
    emailTemplateBySlug: (_p: unknown, args: { slug: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailTemplateService.bySlug(args.slug);
    },
    renderEmailTemplate: (
      _p: unknown,
      args: { mjml: string; vars?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      const vars = parseVars(args.vars);
      const { html, errors } = renderMjml(args.mjml, vars);
      return {
        subject: '',
        html,
        errors,
        detected_variables: detectVariables(args.mjml),
      };
    },
  },
  Mutation: {
    createEmailTemplate: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailTemplateService.create(args.input);
    },
    updateEmailTemplate: (
      _p: unknown,
      args: { template_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailTemplateService.update(args.template_id, args.input);
    },
    deleteEmailTemplate: (
      _p: unknown,
      args: { template_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return emailTemplateService.delete(args.template_id);
    },
    sendTestEmail: async (
      _p: unknown,
      args: { template_id: string; to: string; vars?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      const tpl = await emailTemplateService.byId(args.template_id);
      if (!tpl) return { ok: false, message: 'Template not found' };
      const vars = parseVars(args.vars);
      const rendered = renderMjml(tpl.mjml, vars);
      if (rendered.errors.length)
        return { ok: false, message: rendered.errors.join('; ') };
      const transporter = process.env.SMTP_HOST
        ? nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: Number(process.env.SMTP_PORT) === 465,
            auth:
              process.env.SMTP_USER && process.env.SMTP_PASS
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined,
          })
        : nodemailer.createTransport({ jsonTransport: true });
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'Duncit <noreply@duncit.local>',
          to: args.to,
          subject: tpl.subject,
          html: rendered.html,
        });
        return { ok: true, message: 'Test email sent' };
      } catch (e: any) {
        return { ok: false, message: e.message || 'Send failed' };
      }
    },
  },
};
