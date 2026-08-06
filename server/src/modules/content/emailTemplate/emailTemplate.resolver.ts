import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import {
  emailTemplateService,
  applyVars,
  detectVariables,
  renderTemplateBody,
} from './emailTemplate.service';
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
      args: {
        mjml: string;
        vars?: string | null;
        fragment_key?: string | null;
        footer_note?: string | null;
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      // A send's own variables underneath the caller's, so the preview shows
      // the real logo and real localized copy rather than raw {{t:…}} keys.
      const vars = { ...(await emailPreviewVars()), ...parseVars(args.vars) };
      // The preview shows what will actually be sent — the SAME renderer the
      // send uses, wrap and footer sentence included. Preview and send used to
      // each do this themselves, and drifted: the preview omitted the footer
      // sentence, so every previewed email carried a literal {{footer_note}}
      // where the real one carries a line of copy.
      const { html, errors } = await renderTemplateBody({
        mjml: args.mjml,
        fragment_key: args.fragment_key,
        footer_note: args.footer_note ?? undefined,
        vars,
      });
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
      // Wrapped, like a real send, through the same renderer — a test email
      // that renders differently from the send is a test of the wrong thing.
      const rendered = await renderTemplateBody({
        mjml: tpl.mjml,
        fragment_key: tpl.fragment_key,
        footer_note: tpl.footer_note,
        vars,
      });
      if (rendered.errors.length) return { ok: false, message: rendered.errors.join('; ') };
      try {
        // Through the shared provider layer, so a test goes out the same way a
        // real email does — this used to build a third nodemailer transport of
        // its own beside the two that were already consolidated.
        const sent = await sendHtmlEmail({
          to: args.to,
          // Through applyVars, like a real send. A subject left raw showed a
          // literal {{pod_title}} in every test email while the real one showed
          // the value — the one line of an email you see before opening it.
          subject: applyVars(tpl.subject, vars),
          html: rendered.html,
          category: 'internal',
          // Named in the log, and filed as a TEST so someone checking their
          // own work is never mistaken for a real send to a customer.
          template: tpl.slug,
          fragment_key: tpl.fragment_key,
          source: 'TEST',
          source_detail: tpl.slug,
          // Only what the admin typed. The send's own vars — the logo, the
          // localized copy — are the same on every row and would bury the two
          // or three values anyone opens this row to check.
          vars: parseVars(args.vars),
        });
        // sendHtmlEmail reports rather than throws, so a refusal has to be
        // read off the result or this would claim success for a send that
        // never happened.
        if (sent.skipped) {
          return { ok: false, message: 'Test email was not sent — see Emails > Logs' };
        }
        return { ok: true, message: 'Test email sent' };
      } catch (e: any) {
        return { ok: false, message: e.message || 'Send failed' };
      }
    },
  },
};
