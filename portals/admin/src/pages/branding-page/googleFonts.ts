/** Curated Google Fonts catalogue for the Branding → Fonts pickers (reusable
 * configuration, not business data). Family names must match Google Fonts. */
export const GOOGLE_FONTS = [
  'Quicksand',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Nunito',
  'Nunito Sans',
  'Raleway',
  'Rubik',
  'Work Sans',
  'DM Sans',
  'Manrope',
  'Outfit',
  'Sora',
  'Urbanist',
  'Plus Jakarta Sans',
  'Figtree',
  'Lexend',
  'Mulish',
  'Karla',
  'Source Sans 3',
  'Noto Sans',
  'IBM Plex Sans',
  'Space Grotesk',
  'Josefin Sans',
  'Comfortaa',
  'Cabin',
  'Assistant',
  'Barlow',
  'Heebo',
  'Hind',
  'Fira Sans',
  'PT Sans',
  'Merriweather',
  'Playfair Display',
  'Lora',
  'Bitter',
  'Archivo',
] as const;

/** Stylesheet URL that loads a Google font family (all the weights we use). */
export function googleFontCssUrl(family: string): string {
  const enc = family.trim().replaceAll(' ', '+');
  return `https://fonts.googleapis.com/css2?family=${enc}:wght@400;500;600;700;800;900&display=swap`;
}
