import { useState } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { ActionsMenu } from '@duncit/ui';
import { defineDemo } from '../../types';

export interface ActionsMenuMock {
  row_name: string;
  busy: boolean;
  can_duplicate: boolean;
}

/** What the `actions-menu` demo renders: one CMS row and the action last chosen from its menu. */
export function ActionsMenuDemo({ mock }: Readonly<{ mock: ActionsMenuMock }>) {
  const [chosen, setChosen] = useState('—');
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>{mock.row_name}</Typography>
        <ActionsMenu
          buttonLabel={`Actions for ${mock.row_name}`}
          actions={[
            { key: 'edit', label: 'Edit', icon: <EditIcon fontSize="small" />, onClick: () => setChosen('Edit') },
            {
              key: 'duplicate',
              label: 'Duplicate',
              icon: <ContentCopyIcon fontSize="small" />,
              onClick: () => setChosen('Duplicate'),
              hidden: !mock.can_duplicate,
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteIcon fontSize="small" />,
              onClick: () => setChosen('Delete'),
              destructive: true,
              disabled: mock.busy,
            },
          ]}
        />
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
        Last chosen: {chosen}
      </Typography>
    </Paper>
  );
}

export const actionsMenuDemo = defineDemo<ActionsMenuMock>({
  id: 'actions-menu',
  title: 'ActionsMenu — a row’s actions behind one "more" button',
  note: 'Open the menu and pick an action: the menu closes first, then the action runs. Set busy to grey out Delete, or can_duplicate to false to drop Duplicate from the menu.',
  mock: { row_name: 'About us', busy: false, can_duplicate: true },
  render: (mock) => <ActionsMenuDemo mock={mock} />,
});
