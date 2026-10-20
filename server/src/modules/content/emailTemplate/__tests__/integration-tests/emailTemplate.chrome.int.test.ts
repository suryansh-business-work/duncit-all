import crypto from 'node:crypto';
import { emailTemplateService, renderTemplateBody, shippedDefault } from '../../emailTemplate.service';
import { EmailTemplateModel } from '../../emailTemplate.model';
import { connectTemplateFragments, stripChrome } from '../../emailTemplate.chrome';
import { emailFragmentService } from '@modules/content/emailFragment/emailFragment.service';
import { EmailFragmentModel } from '@modules/content/emailFragment/emailFragment.model';

/** A body that still draws its own logo and copyright, as pre-fragment rows did. */
const LEGACY_CHROME = [
  '<mjml><mj-body>',
  '<mj-section><mj-column><mj-image src="{{brand_logo_url}}" /></mj-column></mj-section>',
  '<mj-section><mj-column><mj-text>Hi {{name}}</mj-text></mj-column></mj-section>',
  "<mj-section><mj-column><mj-text>&copy; Duncit. You're receiving this because you asked.</mj-text></mj-column></mj-section>",
  '</mj-body></mjml>',
].join('\n');

const insertRow = (slug: string, mjml: string, fragment_key: string | null = null) =>
  EmailTemplateModel.create({
    template_id: crypto.randomUUID(),
    slug,
    name: slug,
    subject: 'Subject',
    mjml,
    fragment_key,
  });

describe('connecting templates to their header/footer fragment', () => {
  beforeEach(async () => {
    await emailFragmentService.seedDefaults();
  });

  it('gives a pre-fragment shipped row its category fragment on boot, so it no longer sends bare', async () => {
    const shipped = shippedDefault('email-verification-otp');
    await insertRow('email-verification-otp', shipped!.mjml, null);

    await emailTemplateService.seedDefaults();

    const row = await EmailTemplateModel.findOne({ slug: 'email-verification-otp' }).lean();
    expect(row?.fragment_key).toBe('authentication');
    const vars = { otp: '686722', brand_logo_url: 'https://cdn.example/logo.png' };
    const rendered = await emailTemplateService.render('email-verification-otp', vars);
    const bare = await renderTemplateBody({ mjml: shipped!.mjml, fragment_key: null, vars });
    expect(rendered.html).toContain('686722');
    // The body has no logo of its own; only the fragment's header draws it.
    expect(bare.html).not.toContain('https://cdn.example/logo.png');
    expect(rendered.html).toContain('https://cdn.example/logo.png');
  });

  it('strips a built-in logo and footer while linking, so nothing renders twice', async () => {
    await insertRow('email-verification-otp', LEGACY_CHROME, null);

    const { rows, connected } = await connectTemplateFragments();

    const row = await EmailTemplateModel.findOne({ slug: 'email-verification-otp' }).lean();
    expect(connected).toBe(1);
    expect(rows.find((r) => r.slug === 'email-verification-otp')?.action).toBe('stripped');
    expect(row?.fragment_key).toBe('authentication');
    expect(row?.mjml).not.toContain('brand_logo_url');
    expect(row?.mjml).not.toContain('&copy;');
    expect(row?.mjml).toContain('Hi {{name}}');
    expect(row?.footer_note).toBe("You're receiving this because you asked.");
  });

  it("leaves an admin's own template alone without a fallback, and links it when one is given", async () => {
    await insertRow('my-campaign', '<mjml><mj-body><mj-text>Hello</mj-text></mj-body></mjml>', null);

    const skipped = await connectTemplateFragments();
    expect(skipped.rows.find((r) => r.slug === 'my-campaign')?.action).toBe('skipped');
    expect((await EmailTemplateModel.findOne({ slug: 'my-campaign' }).lean())?.fragment_key).toBeNull();

    const linked = await connectTemplateFragments({ fallback: 'marketing' });
    expect(linked.connected).toBe(1);
    expect((await EmailTemplateModel.findOne({ slug: 'my-campaign' }).lean())?.fragment_key).toBe('marketing');
  });

  it('writes nothing on a dry run and reports already-connected rows on a re-run', async () => {
    await insertRow('email-verification-otp', shippedDefault('email-verification-otp')!.mjml, null);

    const dry = await connectTemplateFragments({ dryRun: true });
    expect(dry.connected).toBe(0);
    expect(dry.rows.find((r) => r.slug === 'email-verification-otp')?.action).toBe('linked');
    expect((await EmailTemplateModel.findOne({ slug: 'email-verification-otp' }).lean())?.fragment_key).toBeNull();

    await connectTemplateFragments();
    const again = await connectTemplateFragments();
    expect(again.connected).toBe(0);
    expect(again.rows.find((r) => r.slug === 'email-verification-otp')?.action).toBe('already');
  });

  it('refuses to link a key with no fragment behind it', async () => {
    await EmailFragmentModel.deleteOne({ key: 'authentication' });
    await insertRow('email-verification-otp', shippedDefault('email-verification-otp')!.mjml, null);

    const { rows, connected } = await connectTemplateFragments();

    expect(connected).toBe(0);
    expect(rows.find((r) => r.slug === 'email-verification-otp')?.action).toBe('no-fragment');
    expect((await EmailTemplateModel.findOne({ slug: 'email-verification-otp' }).lean())?.fragment_key).toBeNull();
  });

  it('gives a template started from the bare starter the general fragment, and keeps an explicit pick', async () => {
    const started = await emailTemplateService.create({ slug: 'starter-one', name: 'One', subject: 'S' });
    expect(started.fragment_key).toBe('notification');

    const picked = await emailTemplateService.create({
      slug: 'starter-two',
      name: 'Two',
      subject: 'S',
      fragment_key: 'support',
    });
    expect(picked.fragment_key).toBe('support');
  });

  it('stripChrome returns a body with no chrome unchanged', () => {
    const body = '<mjml><mj-body><mj-section><mj-text>Plain</mj-text></mj-section></mj-body></mjml>';
    expect(stripChrome(body)).toEqual({ mjml: body, footerNote: '', removedHeader: false, removedFooter: false });
  });
});
