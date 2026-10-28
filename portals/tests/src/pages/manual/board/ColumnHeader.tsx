import { memo } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useTranslation } from '@duncit/shell';
import { CategoryChip } from '../../../components/manual/CategoryChip';
import { CATEGORY_KEYS } from '../shared/vocabulary';
import type { ManualColumn } from '../shared/types';

interface Props {
  column: ManualColumn;
  /** Cards matching the board's filter. */
  shown: number;
  filtered: boolean;
  headingId: string;
}

/** A column's name, what it means, how many cards it holds — and a warning past its WIP limit. */
export const ColumnHeader = memo(function ColumnHeader({ column, shown, filtered, headingId }: Readonly<Props>) {
  const { t } = useTranslation();
  const size = column.case_count ?? shown;
  const limit = column.wip_limit ?? null;
  const overLimit = limit !== null && size > limit;
  const count =
    limit === null
      ? t('testsManual.board.count', { vars: { count: size } })
      : t('testsManual.board.countOfLimit', { vars: { count: size, limit } });

  return (
    <Stack spacing={0.75} sx={{ p: 1.5, pb: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography id={headingId} component="h2" variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
          {column.name}
        </Typography>
        <Chip
          size="small"
          color={overLimit ? 'warning' : 'default'}
          icon={overLimit ? <WarningAmberOutlinedIcon /> : undefined}
          label={count}
        />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <CategoryChip category={column.category} label={t(CATEGORY_KEYS[column.category])} />
        {filtered ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('testsManual.board.matching', { vars: { count: shown } })}
          </Typography>
        ) : null}
      </Stack>
      {overLimit ? (
        <Typography variant="caption" role="status" sx={{ color: 'warning.dark' }}>
          {t('testsManual.board.overLimit', { vars: { limit: limit ?? 0 } })}
        </Typography>
      ) : null}
    </Stack>
  );
});
