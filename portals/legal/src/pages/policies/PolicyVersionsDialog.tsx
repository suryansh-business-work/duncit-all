import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { POLICY_VERSIONS, type Policy, type PolicyVersion } from '../../graphql/policies';

interface RowProps {
  version: PolicyVersion;
  label: string;
  currentLabel: string;
  editedBy: string;
  when: string;
  expanded: boolean;
  readLabel: string;
  emptyLabel: string;
  onToggle: (id: string) => void;
}

/** One wording, expandable in place. Hoisted so it is not redefined per render. */
function VersionRow({
  version,
  label,
  currentLabel,
  editedBy,
  when,
  expanded,
  readLabel,
  emptyLabel,
  onToggle,
}: Readonly<RowProps>) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <Typography variant="body2" sx={{
          fontWeight: 800
        }}>
          {label}
        </Typography>
        {version.is_current && <Chip size="small" color="success" label={currentLabel} />}
        <Box sx={{ flex: 1 }} />
        <DuncitButton size="small" onClick={() => onToggle(version.id)}>
          {readLabel}
        </DuncitButton>
      </Stack>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {version.title} · {when} · {editedBy}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
        {version.content_hash}
      </Typography>
      {expanded && (
        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
          {version.content ? (
            <DuncitRichTextInput value={version.content} onChange={() => undefined} readOnly bare />
          ) : (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {emptyLabel}
            </Typography>
          )}
        </Paper>
      )}
    </Paper>
  );
}

interface Props {
  /** The policy whose history to show; null keeps the dialog closed. */
  policy: Policy | null;
  onClose: () => void;
}

/**
 * Every wording a policy has had.
 *
 * Newest first, because the question is nearly always "what changed", and the
 * fingerprint is shown on every row: it is the value the acceptance log stores,
 * so it is what ties a version here to a person there.
 */
export default function PolicyVersionsDialog({ policy, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, loading, error } = useQuery<{ policyVersions: PolicyVersion[] }>(POLICY_VERSIONS, {
    variables: { id: policy?.id },
    skip: !policy,
    fetchPolicy: 'cache-and-network',
  });
  const versions = [...(data?.policyVersions ?? [])].sort((a, b) => b.version_no - a.version_no);

  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id));

  const renderBody = () => {
    if (error) return <Alert severity="error">{t('legal.policies.versions.loadFailed')}</Alert>;
    if (loading && versions.length === 0) {
      return (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (versions.length === 0) {
      return (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('legal.policies.versions.empty')}
        </Typography>
      );
    }
    return (
      <Stack spacing={1.25}>
        {versions.map((version) => (
          <VersionRow
            key={version.id}
            version={version}
            label={t('legal.policies.versions.versionLabel', {
              vars: { no: String(version.version_no) },
            })}
            currentLabel={t('legal.policies.versions.current')}
            editedBy={
              version.updated_by_name
                ? t('legal.policies.versions.by', { vars: { name: version.updated_by_name } })
                : t('legal.policies.versions.unknownEditor')
            }
            when={version.created_at ? formatDateTime(new Date(version.created_at)) : ''}
            expanded={openId === version.id}
            readLabel={t('legal.policies.versions.read')}
            emptyLabel={t('legal.policies.versions.contentEmpty')}
            onToggle={toggle}
          />
        ))}
      </Stack>
    );
  };

  return (
    <Dialog open={!!policy} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>
        {t('legal.policies.versions.title', { vars: { title: policy?.title ?? '' } })}
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
          {t('legal.policies.versions.subtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>{renderBody()}</DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
