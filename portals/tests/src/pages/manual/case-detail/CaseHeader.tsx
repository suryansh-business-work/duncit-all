import { useMutation } from '@apollo/client/react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Breadcrumbs, Chip, Link, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { CaseTypeIcon } from '../../../components/manual/CaseTypeIcon';
import { CategoryChip } from '../../../components/manual/CategoryChip';
import { DELETE_MANUAL_CASE } from '../shared/case.queries';
import { manualErrorText } from '../shared/errors';
import type { ManualCase } from '../shared/types';
import CaseTitle from './title';

interface Props {
  record: ManualCase;
}

const WHERE = { page: '/manual/cases/:caseKey', component: 'CaseHeader' };

/** The way back to the board, the case's key, status and title, and Delete. */
export default function CaseHeader({ record }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [deleteCase, { loading, client }] = useMutation<{ deleteManualCase: boolean }, { id: string }>(
    DELETE_MANUAL_CASE
  );

  const remove = async () => {
    const ok = await confirm({
      title: t('testsManual.detail.deleteTitle', { vars: { key: record.key } }),
      message: t('testsManual.detail.deleteMessage'),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCase({ variables: { id: record.id } });
      // Only ever this one entry — an evict with no id would drop every cached query.
      const cacheId = client.cache.identify({ __typename: 'ManualTestCase', id: record.id });
      if (cacheId) client.cache.evict({ id: cacheId });
      notifySuccess(t('testsManual.detail.deleted', { vars: { key: record.key } }));
      navigate('/manual/board');
    } catch (err) {
      notifyError(manualErrorText(t, err, t('testsManual.detail.deleteFailed'), WHERE));
    }
  };

  return (
    <Stack spacing={1.5}>
      <Breadcrumbs aria-label={t('testsManual.detail.breadcrumbs')}>
        <Link component={RouterLink} to="/manual/board" underline="hover" color="inherit">
          {t('testsManual.board.title')}
        </Link>
        <Link component={RouterLink} to="/manual/cases" underline="hover" color="inherit">
          {t('testsManual.cases.title')}
        </Link>
        <Typography aria-current="page" sx={{ color: 'text.primary' }}>
          {record.key}
        </Typography>
      </Breadcrumbs>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <CaseTypeIcon type={record.type} fontSize="medium" />
        <Chip size="small" label={record.key} />
        {record.column ? <CategoryChip category={record.column.category} label={record.column.name} /> : null}
        <DuncitButton
          color="error"
          size="small"
          startIcon={<DeleteOutlineIcon />}
          onClick={remove}
          loading={loading}
          sx={{ ml: 'auto' }}
        >
          {t('testsManual.detail.delete')}
        </DuncitButton>
      </Stack>
      <CaseTitle record={record} />
    </Stack>
  );
}
