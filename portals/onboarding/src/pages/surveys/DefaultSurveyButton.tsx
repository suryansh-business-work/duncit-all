import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { SURVEYS, type SurveyKind } from './queries';

type DefaultRow = {
  id: string;
  kind: SurveyKind;
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
};

// The kind-level default carries no scope. Detect it by the scope IDs (not the
// display names) so an orphaned scoped survey — whose category was deleted, so
// its *_name resolves to null while the id lingers — is never mistaken for it.
const isDefault = (r: DefaultRow) => !r.super_category_id && !r.category_id && !r.sub_category_id;

/** Opens the kind-level fallback ("default") survey for one kind — used when no
 *  category-specific survey exists for the applicant's chosen category. */
export default function DefaultSurveyButton({ kind }: Readonly<{ kind: SurveyKind }>) {
  const navigate = useNavigate();
  const { data } = useQuery<{ surveys: DefaultRow[] }>(SURVEYS, {
    variables: { kind, super_category_id: null, category_id: null, sub_category_id: null },
    fetchPolicy: 'cache-and-network',
  });

  const existing = (data?.surveys ?? []).find(isDefault);
  const go = () => {
    if (existing) navigate(`/surveys/${existing.id}/edit?default=1`);
    else navigate(`/surveys/new?kind=${kind}&default=1`);
  };

  return (
    <Button variant="outlined" startIcon={<StarIcon />} onClick={go}>
      Default Survey
    </Button>
  );
}
