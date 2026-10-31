import { Box } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import { occasionArtwork } from '@duncit/utils';
import type { VectorLayerValues } from './occasion-theme.types';

interface Props {
  artwork: string;
  /** A CUSTOM flyer's own layers. */
  layers?: readonly VectorLayerValues[];
}

const SIZE = { width: (th: Theme) => th.spacing(7), height: (th: Theme) => th.spacing(3.5) };

/**
 * A flyer's artwork at thumbnail size, painted from the same vector layers the
 * apps fly (Santa's sleigh, the witch, the kite). An uploaded image has no
 * vector to draw, so it shows as an image glyph.
 */
export default function ArtworkThumb({ artwork, layers = [] }: Readonly<Props>) {
  const art = occasionArtwork({ artwork, custom_layers: layers });
  if (!art) {
    return (
      <Box sx={{ ...SIZE, display: 'grid', placeItems: 'center', color: 'text.secondary' }} aria-hidden>
        <ImageRoundedIcon fontSize="small" />
      </Box>
    );
  }
  return (
    <Box
      component="svg"
      viewBox={`0 0 ${art.width} ${art.height}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      aria-hidden
      sx={{ ...SIZE, display: 'block', flexShrink: 0 }}
    >
      {art.layers.map((layer) => (
        <path
          key={`${layer.x},${layer.y}:${layer.fill}:${layer.stroke}:${layer.path}`}
          d={layer.path}
          transform={`translate(${layer.x} ${layer.y})`}
          fill={layer.fill || 'none'}
          stroke={layer.stroke || 'none'}
          strokeWidth={layer.stroke_width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Box>
  );
}
