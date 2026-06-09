import { useState } from 'react';
import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface Item {
  slug: string;
  label?: string;
}

interface Props {
  title: string;
  items: Item[];
  /** Slugs declared on the template (selected). */
  declared: Set<string>;
  /** Toggle declared membership (select / deselect). */
  onToggle: (slug: string) => void;
  /**
   * When set, a chip is red if its slug is NOT in this catalogue (a foreign /
   * unrecognised variable). Used for the "Detected in template" row. When
   * omitted, undeclared chips are red (used for the "Available for …" rows).
   */
  knownSlugs?: Set<string>;
  emptyHint?: string;
}

/**
 * Titled row of variable chips. Declared (selected) chips are filled/primary;
 * undeclared ones — i.e. not yet in the template — are red, so it's obvious
 * what's missing. Click the body to select/deselect; click the icon to copy
 * the {{ slug }} placeholder.
 */
export default function VariableChips({ title, items, declared, onToggle, knownSlugs, emptyHint }: Readonly<Props>) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`{{ ${slug} }}`);
      setCopied(slug);
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Stack spacing={0.5}>
      {title && <Typography variant="subtitle2">{title}</Typography>}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {items.length === 0 ? (
          <Typography variant="caption" color="text.secondary">{emptyHint ?? 'None'}</Typography>
        ) : (
          items.map((it) => {
            const selected = declared.has(it.slug);
            const foreign = knownSlugs ? !knownSlugs.has(it.slug) : false;
            // Only foreign (detected-but-unavailable) chips are red. Available
            // chips are never red — declared = primary, otherwise neutral.
            const color = foreign ? 'error' : selected ? 'primary' : 'default';
            const tip = foreign
              ? 'Not an available Venue/Host variable'
              : selected
                ? 'In template — click to remove'
                : 'Not in template — click to add';
            return (
              <Tooltip key={it.slug} title={tip}>
                <Chip
                  label={it.label ? `${it.label} · ${it.slug}` : it.slug}
                  size="small"
                  color={color}
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => onToggle(it.slug)}
                  onDelete={() => copy(it.slug)}
                  deleteIcon={
                    <Tooltip title={copied === it.slug ? 'Copied!' : `Copy {{ ${it.slug} }}`}>
                      {copied === it.slug ? <CheckIcon /> : <ContentCopyIcon />}
                    </Tooltip>
                  }
                />
              </Tooltip>
            );
          })
        )}
      </Stack>
    </Stack>
  );
}
