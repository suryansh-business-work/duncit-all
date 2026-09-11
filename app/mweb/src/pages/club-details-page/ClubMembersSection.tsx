import { useMemo, useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Avatar, AvatarGroup, ButtonBase, Stack } from '@mui/material';
import PodAttendeesDialog, { type AttendeePerson } from '../../components/pod-details/PodAttendeesDialog';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data } = useQuery<any>(CLUB_MEMBERS, {
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
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }}>
      <SectionHeader title="Club Members" actionLabel="View all" onAction={() => setOpen(true)} />
      <ButtonBase
        onClick={() => setOpen(true)}
        aria-label={t('mweb.clubDetails.viewAllClubMembers')}
        sx={{ borderRadius: 999, alignSelf: 'flex-start' }}
      >
        <AvatarGroup
          max={8}
          sx={{
            '& .MuiAvatar-root': {
              width: 36,
              height: 36,
              fontSize: 13,
              bgcolor: 'action.selected',
              color: 'text.primary',
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
      </ButtonBase>
      <PodAttendeesDialog open={open} people={people} onClose={() => setOpen(false)} />
    </Stack>
  );
}
