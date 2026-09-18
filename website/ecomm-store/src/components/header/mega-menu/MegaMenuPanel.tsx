import { Link as RouterLink } from 'react-router';
import { Box, Divider, Link, List, ListItem, ListItemButton, Stack, Typography } from '@mui/material';

import type { StoreNavigation, StorePetType } from '../../../graphql/settings';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { categoriesForPet, menuChildren } from '../navigation';

interface PanelProps {
  nav: StoreNavigation;
  activePet: StorePetType | null;
  onPickPet: (pet: StorePetType) => void;
  onNavigate: () => void;
}

/** Pet types on the left; the chosen pet's aisles and the collections on the right. */
export function MegaMenuPanel({ nav, activePet, onPickPet, onNavigate }: Readonly<PanelProps>) {
  const { t } = useStoreT();
  const aisles = activePet ? categoriesForPet(nav.categories, activePet.id) : [];
  return (
    <Stack direction="row" sx={{ width: { md: 760, lg: 900 }, maxWidth: '95vw', p: 2, gap: 2 }}>
      <List dense sx={{ width: 200, flexShrink: 0 }} aria-label={t('ecommStore.menu.petTypes')}>
        {nav.pet_types.map((pet) => (
          <ListItem key={pet.id} disablePadding>
            <ListItemButton
              selected={activePet?.id === pet.id}
              aria-current={activePet?.id === pet.id ? 'true' : undefined}
              onClick={() => onPickPet(pet)}
              onFocus={() => onPickPet(pet)}
              onMouseEnter={() => onPickPet(pet)}
              sx={{ minHeight: 44, borderRadius: 1 }}
            >
              {pet.name}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider orientation="vertical" flexItem />
      <Box sx={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 2 }}>
        {activePet ? (
          <Link component={RouterLink} to={paths.petType(activePet.slug)} onClick={onNavigate} sx={{ fontWeight: 700, gridColumn: '1 / -1' }}>
            {t('ecommStore.menu.shopAllPet', { vars: { pet: activePet.name } })}
          </Link>
        ) : null}
        {aisles.map((aisle) => (
          <Stack key={aisle.id} spacing={0.5}>
            <Link component={RouterLink} to={paths.category(aisle.slug)} onClick={onNavigate} color="inherit" sx={{ fontWeight: 700 }}>
              {aisle.name}
            </Link>
            {menuChildren(aisle).map((child) => (
              <Link key={child.id} component={RouterLink} to={paths.category(child.slug)} onClick={onNavigate} color="text.secondary" variant="body2">
                {child.name}
              </Link>
            ))}
          </Stack>
        ))}
      </Box>
      {nav.collections.length > 0 ? (
        <Stack spacing={1} sx={{ width: 180, flexShrink: 0 }}>
          <Typography variant="subtitle2" component="p">
            {t('ecommStore.menu.collections')}
          </Typography>
          {nav.collections.map((c) => (
            <Link key={c.id} component={RouterLink} to={paths.collection(c.slug)} onClick={onNavigate} variant="body2">
              {c.name}
            </Link>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
