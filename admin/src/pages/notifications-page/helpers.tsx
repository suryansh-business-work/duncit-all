import PublicIcon from '@mui/icons-material/Public';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';

export type NotifScope = 'GLOBAL' | 'LOCATION' | 'ZONE' | 'USER';

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
};

export const SCOPES = [
  { value: 'GLOBAL', label: 'All users (Global)', icon: <PublicIcon fontSize="small" /> },
  { value: 'LOCATION', label: 'By Location', icon: <LocationOnIcon fontSize="small" /> },
  { value: 'ZONE', label: 'By Zone', icon: <MapIcon fontSize="small" /> },
  { value: 'USER', label: 'Specific Users', icon: <PersonIcon fontSize="small" /> },
];
