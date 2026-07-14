import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Avatar, AvatarGroup, Box, ButtonBase, Typography } from '@mui/material';
import PodAttendeesDialog, { type AttendeePerson } from '../../components/pod-details/PodAttendeesDialog';

const CLUB_MEMBERS = gql`
  query ClubMembers($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      profile_photo
    }
  }
`;

interface Props {
  memberIds: string[];
}

/** Pod members — everyone attending the club's pods. Tapping the avatar group
 * opens the full list; each row opens that member's full profile (B4-12). */
export default function ClubMembersSection({ memberIds }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery(CLUB_MEMBERS, {
    variables: { ids: memberIds },
    skip: memberIds.length === 0,
    fetchPolicy: 'cache-and-network',
  });

  const people = useMemo<AttendeePerson[]>(() => {
    const byId = new Map(
      (data?.publicUsersByIds ?? []).map((person: any) => [person.user_id, person])
    );
    return memberIds.map((id) => {
      const person: any = byId.get(id);
      return {
        user_id: id,
        full_name: person?.full_name ?? null,
        profile_photo: person?.profile_photo ?? null,
        is_host: false,
      };
    });
  }, [data, memberIds]);

  if (memberIds.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Pod Members
      </Typography>
      <ButtonBase
        onClick={() => setOpen(true)}
        aria-label="View all pod members"
        sx={{ borderRadius: 999, p: 0.5 }}
      >
        <AvatarGroup
          max={8}
          sx={{
            '& .MuiAvatar-root': {
              width: 36,
              height: 36,
              fontSize: 13,
              bgcolor: 'primary.main',
              border: '2px solid',
              borderColor: 'background.paper',
            },
          }}
        >
          {people.map((person) => (
            <Avatar
              key={person.user_id}
              src={person.profile_photo || undefined}
              alt={person.full_name || 'Member'}
            >
              {(person.full_name?.[0] ?? '?').toUpperCase()}
            </Avatar>
          ))}
        </AvatarGroup>
        <Typography variant="caption" color="primary.main" sx={{ ml: 1, fontWeight: 800 }}>
          View all
        </Typography>
      </ButtonBase>
      <PodAttendeesDialog open={open} people={people} onClose={() => setOpen(false)} />
    </Box>
  );
}
