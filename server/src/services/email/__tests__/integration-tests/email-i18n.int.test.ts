import {
  EMAIL_FALLBACK,
  emailTranslationVars,
  recipientLocale,
  resetEmailTranslationCache,
} from '../../email-i18n';
import { UserModel } from '@modules/access/user/user.model';
import { applyVars } from '@modules/content/emailTemplate/emailTemplate.service';
import { localizationService } from '@modules/platform/localization/localization.service';
import { LocaleModel, TranslationModel } from '@modules/platform/localization/localization.model';

const seed = async () => {
  await localizationService.upsertLocale({
    code: 'en-IN',
    label: 'English',
    is_default: true,
  });
  await localizationService.upsertLocale({ code: 'hi-IN', label: 'हिन्दी' });
};

afterEach(async () => {
  // The catalogue is cached for a TTL; clear it so each case reads fresh.
  resetEmailTranslationCache();
  await Promise.all([
    LocaleModel.deleteMany({}),
    TranslationModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

describe('recipientLocale', () => {
  it("reads the addressee's saved language, case-insensitively", async () => {
    await UserModel.create({
      auth: { email: 'asha@test.com' },
      profile: { first_name: 'Asha', locale: 'hi-IN' },
    });
    expect(await recipientLocale('  Asha@Test.com ')).toBe('hi-IN');
  });

  it('yields null for a non-user address, so the platform default applies', async () => {
    expect(await recipientLocale('stranger@test.com')).toBeNull();
    expect(await recipientLocale('   ')).toBeNull();
  });
});

describe('emailTranslationVars', () => {
  it('serves the bundled fallback when nothing is translated', async () => {
    await seed();
    const vars = await emailTranslationVars('hi-IN');
    // An email must never ship a raw key or a blank line.
    expect(vars['t:email.podRefund.title']).toBe(EMAIL_FALLBACK['email.podRefund.title']);
  });

  it('prefers admin text over the bundle, per locale', async () => {
    await seed();
    await localizationService.upsertTranslation({
      key: 'email.podRefund.title',
      values: [
        { locale: 'en-IN', value: 'Refund started' },
        { locale: 'hi-IN', value: 'रिफ़ंड शुरू' },
      ],
    });
    expect((await emailTranslationVars('hi-IN'))['t:email.podRefund.title']).toBe('रिफ़ंड शुरू');
    expect((await emailTranslationVars('en-IN'))['t:email.podRefund.title']).toBe('Refund started');
  });

  it('falls back to the default locale for an untranslated or unknown language', async () => {
    await seed();
    await localizationService.upsertTranslation({
      key: 'email.podRefund.title',
      values: [{ locale: 'en-IN', value: 'Refund started' }],
    });
    // hi-IN has no text -> the server merge already returned the default's.
    expect((await emailTranslationVars('hi-IN'))['t:email.podRefund.title']).toBe('Refund started');
    // No locale supplied -> the platform default.
    expect((await emailTranslationVars())['t:email.podRefund.title']).toBe('Refund started');
    expect((await emailTranslationVars('  '))['t:email.podRefund.title']).toBe('Refund started');
  });

  it('still returns a complete set when no locale is configured at all', async () => {
    const vars = await emailTranslationVars('hi-IN');
    expect(vars['t:email.common.greeting']).toBe(EMAIL_FALLBACK['email.common.greeting']);
  });
});

describe('applyVars with translation keys', () => {
  it('substitutes dot-path keys into an MJML body', async () => {
    await seed();
    const vars = await emailTranslationVars('en-IN');
    const out = applyVars('<mj-text>{{t:email.podRefund.reason}}: {{reason}}</mj-text>', {
      ...vars,
      reason: 'Pod cancelled',
    });
    expect(out).toBe('<mj-text>Reason: Pod cancelled</mj-text>');
  });

  it('treats a dot in a key literally, so a near-miss token is left alone', () => {
    // Unescaped, `email.a.b` would also match `{{emailXaXb}}` and corrupt it.
    const out = applyVars('{{t:email.a.b}} and {{t:emailXaXb}}', { 't:email.a.b': 'HIT' });
    expect(out).toBe('HIT and {{t:emailXaXb}}');
  });
});
