import { useId, useState } from 'react';
import { Box, Chip, Collapse, Divider, Stack, TableCell, TableRow, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { STATUS_COLOR, STATUS_KEY, keyOr } from '../lead-quality/qualityLabels';
import { formatPoints } from './qualityFormat';
import QualityItem from './QualityItem';
import type { QualityCriterion, QualityEvidence, QualityItemResult } from './qualityTypes';

interface Props {
  criterion: QualityCriterion;
  evidence: ReadonlyMap<string, QualityEvidence>;
  onRecord: (item: QualityItemResult) => void;
}

const COLUMNS = 4;

/** One criterion of the breakdown: its maximum, what it earned and its status; expands to its items. */
export default function CriterionRow({ criterion, evidence, onRecord }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleLabel = open
    ? t('crm.leadQualityTab.hideItems', { vars: { name: criterion.name } })
    : t('crm.leadQualityTab.showItems', { vars: { name: criterion.name } });

  return (
    <>
      <TableRow data-testid={`lead-quality-criterion-${criterion.key}`} sx={open ? undefined : { '& > *': { borderBottom: 0 } }}>
        <TableCell component="th" scope="row">
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <DuncitIconButton size="small" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={panelId} aria-label={toggleLabel}>
              {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </DuncitIconButton>
            <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
              {criterion.name}
            </Typography>
            {criterion.mandatory && <Chip size="small" variant="outlined" label={t('crm.leadQualityTab.gate')} />}
          </Stack>
        </TableCell>
        <TableCell align="right">{formatPoints(criterion.max)}</TableCell>
        <TableCell align="right">{formatPoints(criterion.earned)}</TableCell>
        <TableCell>
          <Chip
            size="small"
            color={STATUS_COLOR[criterion.status] ?? 'default'}
            label={t(keyOr(STATUS_KEY, criterion.status, 'crm.leadQuality.statusPending'))}
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell id={panelId} colSpan={COLUMNS} sx={{ py: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 1.5, pl: { sm: 5 } }}>
              <Stack spacing={1.5} divider={<Divider flexItem />}>
                {criterion.items.map((item) => (
                  <QualityItem key={item.key} item={item} evidence={evidence.get(item.key)} onRecord={onRecord} />
                ))}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
