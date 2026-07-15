import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Button, ListItemText, Menu, MenuItem } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { SURVEYS, type SurveyKind } from './queries';

type DefaultRow = {
  id: string;
  kind: SurveyKind;
  super_category_name?: string | null;
  category_name?: string | null;
  sub_category_name?: string | null;
};

const KIND_LABELS: Record<SurveyKind, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'Seller', CLUB_ADMIN: 'Club Admin' };
const KIND_ORDER: SurveyKind[] = ['VENUE', 'HOST', 'ECOMM', 'CLUB_ADMIN'];
const isDefault = (r: DefaultRow) => !r.super_category_name && !r.category_name && !r.sub_category_name;

/** Compact entry point to the kind-level fallback ("default") surveys — used
 * when no category-specific survey exists for the applicant's chosen category. */
export default function DefaultSurveysSection() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const { data } = useQuery<{ surveys: DefaultRow[] }>(SURVEYS, {
    variables: { kind: null, super_category_id: null, category_id: null, sub_category_id: null },
    fetchPolicy: 'cache-and-network',
  });

  const byKind = new Map<SurveyKind, DefaultRow>((data?.surveys ?? []).filter(isDefault).map((s) => [s.kind, s]));

  const go = (kind: SurveyKind) => {
    setAnchor(null);
    const existing = byKind.get(kind);
    if (existing) navigate(`/surveys/${existing.id}/edit?default=1`);
    else navigate(`/surveys/new?kind=${kind}&default=1`);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<StarIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Default Survey
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {KIND_ORDER.map((kind) => (
          <MenuItem key={kind} onClick={() => go(kind)}>
            <ListItemText primary={`${KIND_LABELS[kind]} default`} secondary={byKind.has(kind) ? 'Edit' : 'Create'} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
