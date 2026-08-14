import { renderTemplateBody } from '@modules/content/emailTemplate/emailTemplate.service';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';
import fs from 'node:fs';

const vars: Record<string, string> = { brand_logo_url: 'x', support_email: 's@d.com', website_url: 'w', app_name: 'Duncit', year: '2026', unsubscribe_url: 'u' };
for (const [k, v] of Object.entries(EMAIL_FALLBACK)) vars[`t:${k}`] = v;

(async () => {
  const mjml = fs.readFileSync('src/services/email/templates/venue-slot-request.mjml', 'utf8');
  const { html } = await renderTemplateBody({
    mjml,
    fragment_key: 'notification',
    footer_note: '{{t:email.venueSlotRequest.footer}}',
    vars,
  });
  console.log('literal t: placeholder still in footer?', html.includes('{{t:email.venueSlotRequest.footer}}'));
  console.log('resolved sentence present?', html.includes('you requested one of your'));
})();
