import SearchIcon from '@mui/icons-material/Search';
import { DuncitIconButton } from '@duncit/buttons';

import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';

/** The px the field keeps free on its right for this button (and the clear icon beside it). */
export const SUBMIT_ROOM = 64;

/** The solid red search button inside the search field's right end. */
export function SearchSubmit() {
  const { t } = useStoreT();
  return (
    <DuncitIconButton
      type="submit"
      aria-label={t('ecommStore.search.submit')}
      sx={{
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 44,
        height: 44,
        borderRadius: `${T.radius.control}px`,
        bgcolor: T.cta,
        color: T.onBrand,
        '&:hover': { bgcolor: T.ctaHover },
      }}
      data-testid="search-submit"
    >
      <SearchIcon />
    </DuncitIconButton>
  );
}
