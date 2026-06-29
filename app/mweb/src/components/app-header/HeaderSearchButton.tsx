import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  locationId: string;
  zoneName: string;
}

/** Global header search — opens the full Search experience (clubs, pods,
 * categories, suggestions, sort & filter), available from every page. */
export default function HeaderSearchButton(_props: Readonly<Props>) {
  const navigate = useNavigate();
  return (
    <Tooltip title="Search">
      <IconButton
        aria-label="Search"
        onClick={() => navigate('/search')}
        sx={{ minWidth: 44, minHeight: 44 }}
      >
        <SearchIcon />
      </IconButton>
    </Tooltip>
  );
}
