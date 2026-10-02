import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitIconButton } from '@duncit/buttons';
import { CATEGORIES, CatItem, Level } from '../queries';
import ColumnRow from './ColumnRow';

interface Props {
  title: string;
  level: Level;
  parentId: string | null | undefined;
  parentName?: string;
  selectedId: string | null;
  onSelect: (item: CatItem) => void;
  onCreate: () => void;
  onEdit: (item: CatItem) => void;
  onDelete: (item: CatItem) => void;
}

export default function ColumnPanel({
  title,
  level,
  parentId,
  parentName,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const enabled = level === 'SUPER' || !!parentId;
  const { data, loading, error } = useQuery<{ categories: CatItem[] }>(CATEGORIES, {
    variables: { filter: { level, parent_id: parentId ?? null } },
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
  });

  const items: CatItem[] = data?.categories ?? [];

  let body: ReactNode;
  if (enabled) {
    if (loading && items.length === 0) {
      body = (
        <Stack
          sx={{
            alignItems: "center",
            p: 4
          }}>
          <CircularProgress size={24} />
        </Stack>
      );
    } else if (error) {
      body = (
        <Alert severity="error" sx={{ m: 2 }}>
          {error.message}
        </Alert>
      );
    } else if (items.length === 0) {
      body = (
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No items yet. Click + to create one.
          </Typography>
        </Box>
      );
    } else {
      body = (
        <List dense disablePadding>
          {items.map((it) => (
            <ColumnRow
              key={it.id}
              it={it}
              level={level}
              selectedId={selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </List>
      );
    }
  } else {
    body = (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Select a {level === 'CATEGORY' ? 'super category' : 'category'} on the left.
        </Typography>
      </Box>
    );
  }

  const createTitle = enabled ? `New ${title}` : 'Select a parent first';
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Box>
            <Typography variant="subtitle1" component="h2" sx={{
              fontWeight: 600
            }}>
              {title}
            </Typography>
            {parentName && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                in <strong>{parentName}</strong>
              </Typography>
            )}
          </Box>
          <Tooltip title={createTitle}>
            <span>
              <DuncitIconButton
                color="primary"
                aria-label={createTitle}
                data-testid="category-column-create"
                onClick={onCreate}
                disabled={!enabled}
              >
                <AddIcon />
              </DuncitIconButton>
            </span>
          </Tooltip>
        </Stack>
      </CardContent>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto' }}>{body}</Box>
    </Card>
  );
}
