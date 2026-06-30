import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { ADD_CLUB_RATING, CLUB_RATINGS } from '../ClubDetailsPage/clubDetailsQueries';
import { notify } from '../../components/notify';
import { format } from 'date-fns';

interface Props {
  clubId: string;
  rating: number;
  ratingsCount: number;
}

export default function ClubRatingSection({ clubId, rating, ratingsCount }: Readonly<Props>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const { data: ratingsData } = useQuery(CLUB_RATINGS, {
    variables: { id: clubId },
    skip: !clubId,
    fetchPolicy: 'cache-and-network',
  });

  const [addRating, { loading: submitting }] = useMutation(ADD_CLUB_RATING, {
    refetchQueries: [{ query: CLUB_RATINGS, variables: { id: clubId } }],
  });

  const reviews: any[] = ratingsData?.clubRatings ?? [];

  const handleSubmit = async () => {
    if (!stars) return;
    try {
      await addRating({ variables: { clubId, stars, comment: comment.trim() || undefined } });
      notify('Thanks for your rating!', 'success');
      setDialogOpen(false);
      setStars(null);
      setComment('');
    } catch (e: any) {
      notify(e?.message ?? 'Could not submit rating', 'error');
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Ratings & Reviews
        </Typography>
        <Button
          size="small"
          variant="outlined"
          sx={{ borderRadius: 3, fontWeight: 800 }}
          onClick={() => setDialogOpen(true)}
        >
          Rate Club
        </Button>
      </Stack>

      {ratingsCount > 0 ? (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="h4" fontWeight={900}>{rating.toFixed(1)}</Typography>
          <Box>
            <Rating value={rating} precision={0.1} readOnly size="small" emptyIcon={<StarIcon fontSize="inherit" />} />
            <Typography variant="caption" color="text.secondary">{ratingsCount} ratings</Typography>
          </Box>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          No ratings yet. Be the first to review!
        </Typography>
      )}

      {reviews.length > 0 && (
        <List dense disablePadding>
          {reviews.slice(0, 3).map((r: any) => (
            <Box key={r.id}>
              <ListItem alignItems="flex-start" disablePadding sx={{ mb: 1 }}>
                <ListItemAvatar sx={{ minWidth: 44 }}>
                  <Avatar src={r.user_photo} sx={{ width: 36, height: 36 }}>
                    {r.user_name?.[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={700}>{r.user_name}</Typography>
                      <Rating value={r.stars} readOnly size="small" max={5} />
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(r.created_at), 'MMM d, yyyy')}
                      </Typography>
                    </Stack>
                  }
                  secondary={r.comment || null}
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </Box>
          ))}
        </List>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={800}>Rate this Club</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="body2" fontWeight={700} gutterBottom>
                Your rating
              </Typography>
              <Rating
                value={stars}
                onChange={(_, v) => setStars(v)}
                size="large"
                emptyIcon={<StarIcon fontSize="inherit" />}
              />
            </Box>
            <TextField
              label="Comment (optional)"
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={`${comment.length}/500`}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!stars || submitting}
            sx={{ borderRadius: 3, fontWeight: 900 }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
