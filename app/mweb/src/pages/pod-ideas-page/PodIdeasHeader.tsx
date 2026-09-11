import { Stack } from '@mui/material';
import { useNavigate } from 'react-router';
import AddIcon from '@mui/icons-material/AddRounded';
import { DuncitButton } from '@duncit/buttons';
import PageHeader from '../../components/PageHeader';
import SearchPillField from '../pod-list/SearchPillField';
import { useTranslation } from '../../i18n/useTranslation';

interface PodIdeasHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  onShare: () => void;
}

/** Back + "Pod Ideas" with the green Share pill on the right, then the search
 * pill — the same bar native's StackScreen draws for Pod Ideas. */
export default function PodIdeasHeader({ search, setSearch, onShare }: Readonly<PodIdeasHeaderProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const shareButton = (
    <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={onShare} sx={{ minHeight: 40, height: 40, px: 2 }}>
      Share idea
    </DuncitButton>
  );
  return (
    <Stack spacing={2} sx={{ mb: 2.5 }}>
      <PageHeader title={t('mweb.podIdeas.podIdeas')} onBack={() => navigate(-1)} right={shareButton} />
      <SearchPillField
        placeholder={t('mweb.podIdeas.searchIdeas')}
        value={search}
        onChange={setSearch}
      />
    </Stack>
  );
}
