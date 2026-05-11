import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import EnvironmentVariableRow from './EnvironmentVariableRow';
import {
  CLEAR_ENVIRONMENT_VARIABLE,
  ENVIRONMENT_VARIABLES,
  UPDATE_ENVIRONMENT_VARIABLE,
  environmentVariableSchema,
  type EnvironmentVariableRow as EnvRow,
} from './environmentVariables';

interface Props {
  onToast: (message: string) => void;
}

export default function EnvironmentVariablesSection({ onToast }: Props) {
  const { data, loading, error, refetch } = useQuery(ENVIRONMENT_VARIABLES, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateEnv] = useMutation(UPDATE_ENVIRONMENT_VARIABLE);
  const [clearEnv] = useMutation(CLEAR_ENVIRONMENT_VARIABLE);
  const rows = (data?.environmentVariables ?? []) as EnvRow[];
  const groups = useMemo(() => Array.from(new Set(rows.map((row) => row.group))), [rows]);
  const [activeGroup, setActiveGroup] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [opError, setOpError] = useState<string | null>(null);

  const selectedGroup = activeGroup || groups[0] || '';
  const visibleRows = rows.filter((row) => row.group === selectedGroup);

  const save = async (key: string, value: string) => {
    setBusyKey(key);
    setOpError(null);
    try {
      await environmentVariableSchema.validate({ key, value });
      await updateEnv({ variables: { key, value } });
      onToast('Environment override saved');
      await refetch();
    } catch (saveError: any) {
      setOpError(saveError.message || 'Failed to save environment variable');
    } finally {
      setBusyKey('');
    }
  };

  const clear = async (key: string) => {
    setBusyKey(key);
    setOpError(null);
    try {
      await clearEnv({ variables: { key } });
      onToast('Environment override cleared');
      await refetch();
    } catch (clearError: any) {
      setOpError(clearError.message || 'Failed to clear environment variable');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1">Environment Variables</Typography>
            <Typography variant="body2" color="text.secondary">
              Database overrides are used first; empty overrides fall back to process environment values.
            </Typography>
          </Box>
          {opError && <Alert severity="error">{opError}</Alert>}
          {loading && !data ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
          ) : error ? (
            <Alert severity="error">{error.message}</Alert>
          ) : (
            <>
              <Tabs
                value={selectedGroup}
                onChange={(_event, value) => setActiveGroup(value)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {groups.map((group) => <Tab key={group} value={group} label={group} />)}
              </Tabs>
              <Box>
                {visibleRows.map((row) => (
                  <EnvironmentVariableRow
                    key={row.key}
                    row={row}
                    busy={busyKey === row.key}
                    onSave={save}
                    onClear={clear}
                  />
                ))}
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}