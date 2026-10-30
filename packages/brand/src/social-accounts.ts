/**
 * The company's accounts elsewhere. Drawn as a row of marks by SocialLinks and
 * named as the organization's `sameAs` profiles in its structured data, so a
 * changed handle is changed once.
 */
export interface SocialAccount {
  /** Font Awesome brand class, e.g. `fa-instagram`. */
  icon: string;
  label: string;
  href: string;
}

export const DUNCIT_SOCIAL: SocialAccount[] = [
  { icon: 'fa-instagram', label: 'Instagram', href: 'https://www.instagram.com/duncit_app/' },
  { icon: 'fa-linkedin-in', label: 'LinkedIn', href: 'https://linkedin.com/company/duncit' },
  { icon: 'fa-facebook-f', label: 'Facebook', href: 'https://facebook.com/duncitapp' },
];
