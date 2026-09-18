import { Link as RouterLink } from 'react-router';
import { Avatar, ButtonBase, Stack, Typography } from '@mui/material';

import type { StorePetType } from '../graphql/settings';
import { paths } from '../lib/paths';
import { STORE_TOKENS as T } from '../theme/tokens';

interface PetTypeChipsProps {
  pets: Pick<StorePetType, 'id' | 'name' | 'slug' | 'image_url' | 'icon_url'>[];
  /** The chip drawn dark (the pet being browsed or filtered). */
  selectedSlug?: string;
  /** Filter mode: a toggle rather than a link. */
  onSelect?: (slug: string) => void;
  label: string;
}

const chipSx = (selected: boolean) => ({
  borderRadius: T.radius.pill,
  pl: 0.5,
  pr: 2,
  py: 0.5,
  minHeight: 48,
  bgcolor: selected ? T.navBar : T.surface,
  color: selected ? T.onBrand : T.ink,
  border: 1,
  borderColor: selected ? T.navBar : T.border,
  flexShrink: 0,
});

/** Pet types as pill chips — a round photo and the name; the chosen one goes dark. */
export function PetTypeChips({ pets, selectedSlug, onSelect, label }: Readonly<PetTypeChipsProps>) {
  return (
    <Stack component="ul" direction="row" spacing={1} aria-label={label} sx={{ listStyle: 'none', p: 0, m: 0, overflowX: 'auto', pb: 0.5 }}>
      {pets.map((pet) => {
        const selected = pet.slug === selectedSlug;
        const body = (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Avatar src={pet.icon_url || pet.image_url} alt="" sx={{ width: 40, height: 40, bgcolor: T.brandTint }} />
            <Typography sx={{ fontWeight: 700, color: 'inherit' }}>{pet.name}</Typography>
          </Stack>
        );
        return (
          <Stack component="li" key={pet.id}>
            {onSelect ? (
              <ButtonBase aria-pressed={selected} onClick={() => onSelect(pet.slug)} sx={chipSx(selected)}>
                {body}
              </ButtonBase>
            ) : (
              <ButtonBase component={RouterLink} to={paths.petType(pet.slug)} aria-current={selected ? 'page' : undefined} sx={chipSx(selected)}>
                {body}
              </ButtonBase>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
