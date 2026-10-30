import { Box } from '@mui/material';

import { railItemSx, ScrollRail, type RailVisible } from '../../../../components/ProductSlider';
import { SectionHeading } from '../../../../components/SectionHeading';
import { paths } from '../../../../lib/paths';
import { useStoreT } from '../../../../i18n';
import type { SectionProps } from '../types';
import { PetTile, type PetTileData } from './PetTile';

/** Four tiles on a desktop; a peek of the next on a phone. */
const TILE_VISIBLE: RailVisible = { xs: 1.25, sm: 2.2, md: 4 };

/** The operator's own tiles when the section has any, else one per pet type. */
function tilesOf(section: SectionProps['section']): PetTileData[] {
  if (section.items.length > 0) {
    return section.items.map((item) => ({
      id: item.id,
      eyebrow: item.eyebrow,
      title: item.title,
      subtitle: item.subtitle,
      image: item.image_url,
      link: item.link || paths.shop,
    }));
  }
  return section.pet_types.map((pet) => ({
    id: pet.id,
    eyebrow: '',
    title: pet.name,
    subtitle: pet.description,
    image: pet.image_url || pet.icon_url,
    link: paths.petType(pet.slug),
  }));
}

/** PET_TYPES, "Shop by Pet": tinted tiles in a snap-scrolling row. */
export function PetTypesSection({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  const tiles = tilesOf(section);
  if (tiles.length === 0) return null;
  const title = section.title || t('ecommStore.menu.shopByPet');
  const itemSx = railItemSx(TILE_VISIBLE);
  return (
    <Box component="section" aria-label={title}>
      <SectionHeading title={title} subtitle={section.subtitle} viewAll={paths.shop} />
      <ScrollRail label={title} count={tiles.length}>
        {tiles.map((tile, position) => (
          <Box component="li" key={tile.id} sx={itemSx}>
            <PetTile tile={tile} position={position} />
          </Box>
        ))}
      </ScrollRail>
    </Box>
  );
}
