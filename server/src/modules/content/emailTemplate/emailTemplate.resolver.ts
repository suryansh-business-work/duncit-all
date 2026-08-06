import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { emailTemplateService, renderMjml, detectVariables } from './emailTemplate.service';
import { emailFragmentService } from '@modules/content/emailFragment/emailFragment.service';
import { emailPreviewVars, sendHtmlEmail } from '@services/email/email.service';
import { GraphQLError } from 'graphql';

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
    renderEmailTemplate: async (
      _p: unknown,
      args: { mjml: string; vars?: string | null; fragment_key?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      // A send's own variables underneath the caller's, so the preview shows
      // the real logo and real localized copy rather than raw {{t:…}} keys.
      const vars = { ...(await emailPreviewVars()), ...parseVars(args.vars) };
      // The preview shows what will actually be sent, wrap included — an editor
      // that previews only the body is how a broken footer reaches production.
      const source = await emailFragmentService.wrap(args.mjml, args.fragment_key);
      const { html, errors } = renderMjml(source, vars);
      return {
        subject: '',
        html,
        errors,
        // Only the body's own variables: the fragment's are supplied by the
        // send path, so listing them would ask an admin to fill them in.
        detected_variables: detectVariables(args.mjml),
      };
    },
  },
  Mutation: {
    createEmailTemplate: async (
      _p: unknown,
      args: { input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      try {
        const doc = await emailTemplateService.create(args.input);
        if (!doc) {
          throw new GraphQLError('Failed to create email template (no document returned)', {
            extensions: { code: 'INTERNAL_ERROR' },
          });
        }
        return doc;
      } catch (e: any) {
        if (e instanceof GraphQLError) throw e;
        // Mongo duplicate key
        if (e?.code === 11000) {
          throw new GraphQLError('Slug already exists', {
            extensions: { code: 'CONFLICT' },
          });
        }
        throw new GraphQLError(e?.message || 'Failed to create email template', {
          extensions: { code: 'INTERNAL_ERROR' },
        });
      }
    },
    updateEmailTemplate: async (
      _p: unknown,
      args: { template_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      const doc = await emailTemplateService.update(args.template_id, args.input);
      if (!doc) {
        throw new GraphQLError('Email template not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return doc;
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
      // Same variables a real send has, so the test email is the real email.
      const vars = { ...(await emailPreviewVars()), ...parseVars(args.vars) };
      // Wrapped, like a real send. A test that skips the header and footer is
      // exactly the test that lets a broken footer reach production.
      const source = await emailFragmentService.wrap(tpl.mjml, tpl.fragment_key);
      const rendered = renderMjml(source, vars);
      if (rendered.errors.length) return { ok: false, message: rendered.errors.join('; ') };
      try {
        // Through the shared provider layer, so a test goes out the same way a
        // real email does — this used to build a third nodemailer transport of
        // its own beside the two that were already consolidated.
        await sendHtmlEmail({
          to: args.to,
          subject: tpl.subject,
          html: rendered.html,
          category: 'internal',
        });
        return { ok: true, message: 'Test email sent' };
      } catch (e: any) {
        return { ok: false, message: e.message || 'Send failed' };
      }
    },
  },
};
