import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { logs } from '@duncit/logs';

type IconSet = Readonly<Record<string, SvgIconComponent>>;

const isImageIcon = (value: string | null | undefined) => {
  const next = (value ?? '').trim();
  return /^data:image\//i.test(next) || /^https?:\/\//i.test(next) || next.startsWith('/');
};

/** An MUI icon export is always a PascalCase identifier. */
const isMuiIconName = (value: string) => /^[A-Z][A-Za-z\d]*$/.test(value);

/**
 * An admin may name ANY MUI icon (the picker is freeSolo), so the whole set has
 * to stay reachable — but not at boot. As a static namespace import it put all
 * ~10.7k icons in the boot chunk and evaluated every one on each page load,
 * whether or not a category named an icon at all. It now loads the first time
 * one does.
 */
let iconSet: IconSet | null = null;
let iconSetLoad: Promise<IconSet> | null = null;

function loadIconSet(): Promise<IconSet> {
  iconSetLoad ??= import('@mui/icons-material').then(
    (mod) => {
      iconSet = mod as unknown as IconSet;
      return iconSet;
    },
    (error: unknown) => {
      // A failed chunk (offline, a deploy mid-session) is retried next render.
      iconSetLoad = null;
      throw error;
    }
  );
  return iconSetLoad;
}

function TextMark({ text, fontSize }: Readonly<{ text: string; fontSize: number }>) {
  if (text.length > 2) return null;
  return (
    <Box component="span" sx={{ lineHeight: 1, fontSize, flex: '0 0 auto' }}>
      {text}
    </Box>
  );
}

function NamedMuiIcon({ name, fontSize }: Readonly<{ name: string; fontSize: number }>) {
  const [icons, setIcons] = useState<IconSet | null>(iconSet);

  useEffect(() => {
    if (icons) return undefined;
    let live = true;
    loadIconSet()
      .then((set) => {
        if (live) setIcons(set);
      })
      .catch((error) => logs.mWeb.error('superCategoryIcon', 'loadIconSet', { error, name }));
    return () => {
      live = false;
    };
  }, [icons, name]);

  if (!icons) {
    // Holds the icon's box while the set loads, so the chip does not reflow.
    return <Box component="span" sx={{ display: 'inline-block', width: fontSize, height: fontSize, flex: '0 0 auto' }} />;
  }
  const Icon = icons[name];
  if (Icon) return <Icon sx={{ fontSize, flex: '0 0 auto' }} />;
  return <TextMark text={name} fontSize={fontSize} />;
}

/**
 * Render a super/category `icon` value (image URL, MUI icon name or emoji) as a
 * node. `size` (px) is the icon width — default 18 for the compact header chips;
 * the home vibe tabber passes a larger value for a full-bleed icon. `height`
 * defaults to `size` (square); pass it for a non-square image (icon layout). The
 * MUI-icon / emoji variants use the larger of width/height as their font size.
 */
export function renderSuperCategoryMark(icon: string | null | undefined, size = 18, height = size) {
  const next = (icon ?? '').trim();
  if (!next) return null;
  const fontSize = Math.max(size, height);
  if (isImageIcon(next)) {
    return (
      <Box
        component="img"
        src={next}
        alt=""
        sx={{ width: size, height, objectFit: 'contain', borderRadius: '4px', flex: '0 0 auto' }}
      />
    );
  }
  if (isMuiIconName(next)) return <NamedMuiIcon name={next} fontSize={fontSize} />;
  return <TextMark text={next} fontSize={fontSize} />;
}
