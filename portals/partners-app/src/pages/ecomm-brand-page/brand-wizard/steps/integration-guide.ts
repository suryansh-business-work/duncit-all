import { INTEGRATION_LINKS } from '../../../../config/integration-links';
import type { BrandIntegrationProvider } from '../../queries';
import type { Translate } from '../wizard-steps';

export interface IntegrationGuideLink {
  key: 'openApi' | 'signup' | 'docs';
  label: string;
  href: string;
}

export interface IntegrationGuide {
  /** Numbered, in the order the partner does them. */
  steps: string[];
  links: IntegrationGuideLink[];
}

/** What to do, step by step, to connect one provider — literal keys for the localization gate. */
export function integrationGuide(t: Translate, provider: BrandIntegrationProvider): IntegrationGuide {
  if (provider === 'SHIPROCKET') {
    const links = INTEGRATION_LINKS.SHIPROCKET;
    return {
      steps: [
        t('partners.brandWizard.integration.shiprocketStep1'),
        t('partners.brandWizard.integration.shiprocketStep2'),
        t('partners.brandWizard.integration.shiprocketStep3'),
        t('partners.brandWizard.integration.shiprocketStep4'),
        t('partners.brandWizard.integration.shiprocketStep5'),
      ],
      links: [
        { key: 'openApi', label: t('partners.brandWizard.integration.shiprocketOpenApi'), href: links.openApi },
        { key: 'signup', label: t('partners.brandWizard.integration.shiprocketSignup'), href: links.signup },
        { key: 'docs', label: t('partners.brandWizard.integration.shiprocketDocs'), href: links.docs },
      ],
    };
  }
  const links = INTEGRATION_LINKS.RAZORPAY;
  return {
    steps: [
      t('partners.brandWizard.integration.razorpayStep1'),
      t('partners.brandWizard.integration.razorpayStep2'),
      t('partners.brandWizard.integration.razorpayStep3'),
      t('partners.brandWizard.integration.razorpayStep4'),
    ],
    links: [
      { key: 'openApi', label: t('partners.brandWizard.integration.razorpayOpenApi'), href: links.openApi },
      { key: 'signup', label: t('partners.brandWizard.integration.razorpaySignup'), href: links.signup },
      { key: 'docs', label: t('partners.brandWizard.integration.razorpayDocs'), href: links.docs },
    ],
  };
}
