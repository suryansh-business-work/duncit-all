import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

export interface CodeToken {
  name: string;
  value: string;
}

interface Props {
  tokens: CodeToken[];
  /** Puts `var(--name)` where the cursor is. */
  onInsert: (text: string) => void;
}

/** A value a browser can paint as a swatch: hex, rgb/hsl/oklch, or a named colour in a colour token. */
const COLOR_VALUE = /^(?:#[\da-f]{3,8}|(?:rgb|hsl|oklch|oklab|color)a?\(.*\))$/i;
const looksLikeColor = (token: CodeToken) => COLOR_VALUE.test(token.value.trim()) || token.name.includes('color');

/**
 * The site's design tokens beside the code: every CSS variable the site
 * declares, with its value (and a swatch for colours). Clicking one writes
 * `var(--name)` into the code, so a component follows the design system
 * instead of copying its values.
 */
export default function CodeTokens({ tokens, onInsert }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Box component="aside" aria-labelledby="cms-code-tokens" sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }} data-testid="cms-code-tokens">
      <Typography id="cms-code-tokens" variant="subtitle2" component="h3">
        {t('websiteApp.cms.code.tokens')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('websiteApp.cms.code.tokensHint')}
      </Typography>
      {tokens.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('websiteApp.cms.code.noTokens')}
        </Typography>
      ) : (
        <List dense disablePadding sx={{ overflowY: 'auto', maxHeight: 360, mt: 0.5 }}>
          {tokens.map((token) => (
            <ListItemButton
              key={token.name}
              onClick={() => onInsert(`var(${token.name})`)}
              aria-label={t('websiteApp.cms.code.insertToken', { vars: { name: token.name } })}
              sx={{ px: 1, gap: 1 }}
            >
              {looksLikeColor(token) && (
                <Box aria-hidden sx={{ width: 16, height: 16, flexShrink: 0, borderRadius: 0.5, border: 1, borderColor: 'divider', bgcolor: token.value }} />
              )}
              <ListItemText
                primary={token.name}
                secondary={token.value}
                slotProps={{
                  primary: { component: 'code', variant: 'caption', sx: { display: 'block' } },
                  secondary: { variant: 'caption', noWrap: true },
                }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
