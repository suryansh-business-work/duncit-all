import PublicIcon from '@mui/icons-material/Public';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';

export type NotifScope = 'GLOBAL' | 'LOCATION' | 'ZONE' | 'USER' | 'AUDIENCE_LIST';

/** A saved Target Audience list, offered as a notification audience. */
export interface AudienceListOption {
  id: string;
  name: string;
  member_count: number;
}

export interface NotifForm {
  title: string;
  body: string;
  image_url: string;
  link_url: string;
  scope: NotifScope;
  silent: boolean;
  location_id: string;
  zone_name: string;
  target_user_ids: string[];
  audience_list_id: string;
}

export const blankForm: NotifForm = {
  title: '',
  body: '',
  image_url: '',
  link_url: '',
  scope: 'GLOBAL',
  silent: false,
  location_id: '',
  zone_name: '',
  target_user_ids: [],
  audience_list_id: '',
};

export const SCOPES = [
  { value: 'GLOBAL', label: 'All users (Global)', icon: <PublicIcon fontSize="small" /> },
  { value: 'LOCATION', label: 'By Location', icon: <LocationOnIcon fontSize="small" /> },
  { value: 'ZONE', label: 'By Zone', icon: <MapIcon fontSize="small" /> },
  { value: 'USER', label: 'Specific Users', icon: <PersonIcon fontSize="small" /> },
  { value: 'AUDIENCE_LIST', label: 'Saved audience list', icon: <GroupsIcon fontSize="small" /> },
];

/** How many people a chosen audience currently reaches, or null when the
 * audience has no count of its own (a location, a zone). */
export function reachOf(
  form: Pick<NotifForm, 'scope' | 'target_user_ids' | 'audience_list_id'>,
  lists: AudienceListOption[],
  totalUsers: number,
): number | null {
  if (form.scope === 'GLOBAL') return totalUsers;
  if (form.scope === 'USER') return form.target_user_ids.length;
  if (form.scope === 'AUDIENCE_LIST') {
    return lists.find((l) => l.id === form.audience_list_id)?.member_count ?? null;
  }
  return null;
}
