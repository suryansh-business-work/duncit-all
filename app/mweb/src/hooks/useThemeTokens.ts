import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { dark, light, type ModeColors } from '@duncit/auth-tokens';
import { resolveThemeTokens, type ThemePalettes, type ThemeTokenSettings } from '@duncit/utils';

const THEME_TOKENS = gql`
  query ThemeTokens {
    branding {
      theme_token_source
      theme_tokens_light {
        bg
        surface
        soft
        ink
        muted
        border
        inputBorder
        primary
        primaryHover
        primaryActive
        onPrimary
        accent
        onAccent
        brand
        success
        warning
        error
        info
        onSemantic
      }
      theme_tokens_dark {
        bg
        surface
        soft
        ink
        muted
        border
        inputBorder
        primary
        primaryHover
        primaryActive
        onPrimary
        accent
        onAccent
        brand
        success
        warning
        error
        info
        onSemantic
      }
    }
  }
`;

const LOCAL_PALETTES: ThemePalettes<ModeColors> = { light, dark };

/**
 * The light and dark palettes mWeb themes with: the bundled `@duncit/auth-tokens`
 * until the branding answers, and for good unless the admin set Branding →
 * Theme tokens to Server. Native twin: App.tsx over the branding store.
 */
export function useThemeTokens(): ThemePalettes<ModeColors> {
  const { data } = useQuery<{ branding: ThemeTokenSettings<ModeColors> }>(THEME_TOKENS, {
    fetchPolicy: 'cache-first',
  });
  const settings = data?.branding;
  return useMemo(() => resolveThemeTokens(LOCAL_PALETTES, settings), [settings]);
}
