import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import {
  FOOD_OTHER_SECTION_KEY,
  foodSectionKey,
  isFoodSectionOpen,
  venueFoodItemPath,
  type FoodMenuGroup,
  type VenueFoodItem,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import FoodItemCard from './FoodItemCard';

interface Props {
  venueId: string;
  groups: FoodMenuGroup[];
  currency: string;
  canOrder: boolean;
  quantityOf: (itemId: string) => number;
  onQuantity: (itemId: string, quantity: number) => void;
  /** The menu has named categories — each becomes a section that folds. */
  sectioned: boolean;
  /** The sections the guest folded (their keys). */
  collapsed: ReadonlyArray<string>;
  onToggle: (key: string) => void;
}

type DishesProps = Pick<Props, 'venueId' | 'currency' | 'canOrder' | 'quantityOf' | 'onQuantity'> & {
  items: VenueFoodItem[];
};

function Dishes({ venueId, items, currency, canOrder, quantityOf, onQuantity }: Readonly<DishesProps>) {
  return (
    <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {items.map((item) => (
        <FoodItemCard
          key={item.id}
          item={item}
          currency={currency}
          canOrder={canOrder}
          quantity={quantityOf(item.id)}
          onQuantity={onQuantity}
          detailsPath={venueFoodItemPath(venueId, item.id)}
        />
      ))}
    </Stack>
  );
}

/**
 * The menu under its category headings, each a section that folds (the
 * dishes with no category follow under "More dishes"). A menu with no
 * categories at all is one plain list. The dish cards are unchanged — each
 * name opens the dish's own page.
 */
export default function FoodMenuList({ groups, sectioned, collapsed, onToggle, ...dishes }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!sectioned) {
    return (
      <Stack data-testid="food-menu-list">
        <Dishes {...dishes} items={groups.flatMap((group) => group.items)} />
      </Stack>
    );
  }
  return (
    <Stack spacing={1} data-testid="food-menu-list">
      {groups.map((group, index) => {
        const key = foodSectionKey(group);
        const title = group.category || t(FOOD_OTHER_SECTION_KEY);
        return (
          <Accordion
            key={key || 'uncategorised'}
            disableGutters
            elevation={0}
            expanded={isFoodSectionOpen(key, collapsed)}
            onChange={() => onToggle(key)}
            sx={{ bgcolor: 'transparent', '&::before': { display: 'none' } }}
            data-testid={`food-menu-section-${index}`}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              id={`food-menu-section-${index}-header`}
              aria-controls={`food-menu-section-${index}-content`}
              sx={{ px: 2 }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', minWidth: 0 }}>
                <Typography component="span" sx={{ fontSize: '1rem', fontWeight: 700, wordBreak: 'break-word' }}>
                  {title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', flex: '0 0 auto' }}>
                  {t('mweb.venueFood.menuSearch.sectionCount', { count: group.items.length })}
                </Typography>
              </Stack>
            </AccordionSummary>
            {/* MUI wraps the summary in an h3 and gives the region the summary's id and aria-controls. */}
            {/* The theme draws each section as a bordered card, so its heading and dishes sit inset from that border. */}
            <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
              <Dishes {...dishes} items={group.items} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}
