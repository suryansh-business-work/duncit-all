import { Fragment } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Avatar, Box, List, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

import type { StoreNavigation } from '../../../graphql/settings';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { categoriesForPet, menuChildren } from '../navigation';
import { MenuLink } from './MenuSections';

interface PetSectionsProps {
  nav: StoreNavigation;
  onNavigate: () => void;
}

/**
 * "Shop by pet": one disclosure per pet. The summary only opens it; inside are
 * "Everything for {pet}", then that pet's aisles with their sub-aisles.
 */
export function PetSections({ nav, onNavigate }: Readonly<PetSectionsProps>) {
  const { t } = useStoreT();
  if (nav.pet_types.length === 0) return null;
  return (
    <Box data-testid="mobile-menu-pets">
      <Typography variant="subtitle2" component="h3" sx={{ px: 2, pt: 2, pb: 1, fontWeight: 700 }}>
        {t('ecommStore.menu.shopByPet')}
      </Typography>
      {nav.pet_types.map((pet) => (
        <Accordion key={pet.id} disableGutters elevation={0} square sx={{ '&::before': { display: 'none' } }} data-testid={`mobile-menu-pet-${pet.id}`}>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ minHeight: 48, px: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Avatar src={pet.icon_url || pet.image_url} alt="" sx={{ width: 32, height: 32, bgcolor: T.brandTint }} />
              <Typography sx={{ fontWeight: 700 }}>{pet.name}</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List disablePadding>
              <MenuLink
                to={paths.petType(pet.slug)}
                label={t('ecommStore.menu.shopAllPet', { vars: { pet: pet.name } })}
                onNavigate={onNavigate}
                testId={`mobile-menu-pet-all-${pet.id}`}
              />
              {categoriesForPet(nav.categories, pet.id).map((aisle) => (
                <Fragment key={aisle.id}>
                  <MenuLink to={paths.category(aisle.slug)} label={aisle.name} onNavigate={onNavigate} testId={`mobile-menu-aisle-${aisle.id}`} />
                  {menuChildren(aisle).map((child) => (
                    <MenuLink key={child.id} to={paths.category(child.slug)} label={child.name} onNavigate={onNavigate} indent testId={`mobile-menu-aisle-${child.id}`} />
                  ))}
                </Fragment>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
