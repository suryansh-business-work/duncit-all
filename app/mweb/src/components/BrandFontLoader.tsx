import { useEffect } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const MWEB_FONT = gql`
  query MwebBrandFont {
    branding {
      mweb_font_family
    }
  }
`;

/** Applies the admin-picked Google Font (Branding → Fonts → mWeb) app-wide:
 * injects the stylesheet + an #root override that outranks the MUI theme
 * family. Empty setting = the built-in Quicksand. */
export default function BrandFontLoader() {
  const { data } = useQuery<any>(MWEB_FONT, { fetchPolicy: 'cache-first' });
  const family: string = data?.branding?.mweb_font_family || '';

  useEffect(() => {
    if (!family) return undefined;
    const enc = family.trim().replaceAll(' ', '+');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${enc}:wght@400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
    const style = document.createElement('style');
    style.textContent = `#root, #root * { font-family: '${family}', 'Quicksand', sans-serif; }`;
    document.head.appendChild(style);
    return () => {
      link.remove();
      style.remove();
    };
  }, [family]);

  return null;
}
