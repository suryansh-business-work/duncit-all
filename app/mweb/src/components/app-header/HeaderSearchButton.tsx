import { useNavigate } from 'react-router';
import { Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  locationId: string;
  zoneName: string;
}

/** Global header search — opens the full Search experience (clubs, pods,
 * categories, suggestions, sort & filter), available from every page. */
export default function HeaderSearchButton(_props: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Tooltip title={t('mweb.common.search')}>
      <DuncitIconButton
        aria-label={t('mweb.common.search')}
        onClick={() => navigate('/search')}
        sx={{ minWidth: 44, minHeight: 44 }}
      >
        <SearchIcon />
      </DuncitIconButton>
    </Tooltip>
  );
}
