import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useTranslation } from '../../i18n/useTranslation';
import PolicyBodyDialog from './PolicyBodyDialog';
import type { SignupPolicy } from './useSignupPolicies';

interface RowProps {
  policy: SignupPolicy;
  accepted: boolean;
  onToggle: (id: string, next: boolean) => void;
  onRead: (policy: SignupPolicy) => void;
  readLabel: string;
}

/*
  Hoisted to module scope rather than nested in the list (rule 26a): a component
  redefined on every render of its parent remounts each row, and a remounting
  checkbox loses focus the moment it is ticked.
*/
function PolicyRow({ policy, accepted, onToggle, onRead, readLabel }: Readonly<RowProps>) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        py: 0.5,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
      <Checkbox
        checked={accepted}
        onChange={(e) => onToggle(policy.id, e.target.checked)}
        slotProps={{
          input: { 'aria-label': policy.title }
        }}
      />
      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
        {policy.title}
      </Typography>
      <Button
        size="small"
        onClick={() => onRead(policy)}
        startIcon={<DescriptionOutlinedIcon fontSize="small" />}
      >
        {readLabel}
      </Button>
    </Stack>
  );
}

interface Props {
  policies: readonly SignupPolicy[];
  loading: boolean;
  failed: boolean;
  accepted: readonly string[];
  onToggle: (id: string, next: boolean) => void;
}

/** The rows themselves, plus the two states in which there are none to show. */
export default function PolicyAcceptanceList({
  policies,
  loading,
  failed,
  accepted,
  onToggle,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [reading, setReading] = useState<SignupPolicy | null>(null);
  const ticked = new Set(accepted);

  if (failed) {
    return <Alert severity="error">{t('policyAcceptance.loadFailed')}</Alert>;
  }
  if (loading) {
    return (
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: "center",
          py: 2
        }}>
        <CircularProgress size={18} />
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('policyAcceptance.loading')}
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <Stack>
        {policies.map((policy) => (
          <PolicyRow
            key={policy.id}
            policy={policy}
            accepted={ticked.has(policy.id)}
            onToggle={onToggle}
            onRead={setReading}
            readLabel={t('policyAcceptance.readAction')}
          />
        ))}
      </Stack>
      <PolicyBodyDialog policy={reading} onClose={() => setReading(null)} />
    </>
  );
}
