import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { CATEGORIES, CatItem, Level } from './queries';
import { isImageIconValue, renderIconByName } from '../../components/IconPickerField';

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
  const { data, loading, error } = useQuery(CATEGORIES, {
    variables: { filter: { level, parent_id: parentId ?? null } },
    skip: !enabled,
    fetchPolicy: 'cache-and-network',
  });

  const items: CatItem[] = data?.categories ?? [];

  let body: ReactNode;
  if (enabled) {
    if (loading && items.length === 0) {
      body = (
        <Stack alignItems="center" sx={{ p: 4 }}>
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
          <Typography variant="body2" color="text.secondary">
            No items yet. Click + to create one.
          </Typography>
        </Box>
      );
    } else {
      body = (
        <List dense disablePadding>
          {items.map((it) => {
            const iconIsImage = isImageIconValue(it.icon);
            const hasIconValue = !!it.icon?.trim();
            const materialIcon = iconIsImage ? null : renderIconByName(it.icon, 'small');
            const mediaFallback = hasIconValue ? undefined : it.media[0]?.url;
            const avatarSrc = iconIsImage ? it.icon : mediaFallback;
            const textIcon = iconIsImage ? '' : it.icon;
            const ellipsis = (it.description?.length ?? 0) > 50 ? '…' : '';
            const secondaryText = it.description
              ? it.description.slice(0, 50) + ellipsis
              : undefined;
            return (
              <ListItemButton
                key={it.id}
                selected={selectedId === it.id}
                onClick={() => onSelect(it)}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1.5,
                    bgcolor: 'primary.main',
                    fontSize: 16,
                  }}
                  src={avatarSrc}
                >
                  {materialIcon || textIcon || it.name[0]}
                </Avatar>
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" fontWeight={500}>
                        {it.name}
                      </Typography>
                      {it.is_system && (
                        <Chip label="system" size="small" sx={{ height: 16, fontSize: 10 }} />
                      )}
                      {!it.is_active && (
                        <Chip
                          label="inactive"
                          size="small"
                          color="warning"
                          sx={{ height: 16, fontSize: 10 }}
                        />
                      )}
                    </Stack>
                  }
                  secondary={secondaryText}
                />
                <Stack direction="row">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(it);
                    }}
                  >
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(it);
                    }}
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                  {level !== 'SUB' && <ChevronRightIcon fontSize="small" />}
                </Stack>
              </ListItemButton>
            );
          })}
        </List>
      );
    }
  } else {
    body = (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Select a {level === 'CATEGORY' ? 'super category' : 'category'} on the left.
        </Typography>
      </Box>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {title}
            </Typography>
            {parentName && (
              <Typography variant="caption" color="text.secondary">
                in <strong>{parentName}</strong>
              </Typography>
            )}
          </Box>
          <Tooltip title={enabled ? `New ${title}` : 'Select a parent first'}>
            <span>
              <IconButton color="primary" onClick={onCreate} disabled={!enabled}>
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </CardContent>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto' }}>{body}</Box>
    </Card>
  );
}
