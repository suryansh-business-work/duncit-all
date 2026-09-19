import { List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useTranslation } from '@duncit/shell';

/**
 * What neither store lets an API set — each answered once in the store's own
 * console and kept across versions. Listed here so the first push does not
 * fail on a question nobody knew was waiting.
 */
const APPLE_ITEMS = [
  'tech.storeListing.appleCreateApp',
  'tech.storeListing.appleAgreements',
  'tech.storeListing.appleAgeRating',
  'tech.storeListing.applePricing',
  'tech.storeListing.appleContentRights',
  'tech.storeListing.appleTrader',
  'tech.storeListing.applePrivacyLabels',
] as const;

const PLAY_ITEMS = [
  'tech.storeListing.playFirstRelease',
  'tech.storeListing.playPrivacyPolicy',
  'tech.storeListing.playDataSafety',
  'tech.storeListing.playContentRating',
  'tech.storeListing.playCategory',
  'tech.storeListing.playServiceAccount',
] as const;

interface StoreListProps {
  title: string;
  items: readonly string[];
  testId: string;
}

const StoreList = ({ title, items, testId }: Readonly<StoreListProps>) => {
  const { t } = useTranslation();
  return (
    <Stack data-testid={testId}>
      <Typography variant="subtitle2">{title}</Typography>
      <List dense disablePadding>
        {items.map((key) => (
          <ListItem key={key} disableGutters sx={{ alignItems: 'flex-start' }}>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
              <TaskAltIcon fontSize="small" color="action" />
            </ListItemIcon>
            <ListItemText primary={t(key)} />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
};

export default function ManualChecklist() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} data-testid="store-listing-checklist">
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t('tech.storeListing.checklistTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.storeListing.checklistIntro')}
      </Typography>
      <StoreList title={t('tech.storeListing.checklistApple')} items={APPLE_ITEMS} testId="store-listing-checklist-apple" />
      <StoreList title={t('tech.storeListing.checklistPlay')} items={PLAY_ITEMS} testId="store-listing-checklist-play" />
    </Stack>
  );
}
