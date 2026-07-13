import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';

const PUBLIC_USERS_BY_IDS = gql`
  query FriendProfiles($ids: [ID!]!) {
    publicUsersByIds(ids: $ids) {
      user_id
      full_name
      profile_photo
    }
  }
`;

interface Props {
  friendIds: string[];
}

export default function ClubFriendsSection({ friendIds }: Readonly<Props>) {
  const [open, setOpen] = useState(false);

  const { data } = useQuery(PUBLIC_USERS_BY_IDS, {
    variables: { ids: friendIds },
    skip: friendIds.length === 0,
    fetchPolicy: 'cache-first',
  });

  const friends: any[] = data?.publicUsersByIds ?? [];

  if (friends.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Friends Here
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 36, height: 36 } }}>
          {friends.map((f) => (
            <Avatar key={f.user_id} src={f.profile_photo} alt={f.full_name}>
              {f.full_name?.[0]}
            </Avatar>
          ))}
        </AvatarGroup>
        <Box>
          <Typography variant="body2" fontWeight={700}>
            {friends.length === 1 ? friends[0].full_name : `${friends[0].full_name} and ${friends.length - 1} more`}
          </Typography>
          <Button size="small" sx={{ p: 0, minWidth: 0, fontWeight: 700 }} onClick={() => setOpen(true)}>
            View all
          </Button>
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon />
          Friends in this club
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <List dense>
            {friends.map((f) => (
              <ListItem key={f.user_id}>
                <ListItemAvatar>
                  <Avatar src={f.profile_photo}>{f.full_name?.[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={f.full_name} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
