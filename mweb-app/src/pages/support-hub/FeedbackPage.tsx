import RateReviewIcon from '@mui/icons-material/RateReview';
import PodScopedPage from './PodScopedPage';
import FeedbackContent from './FeedbackContent';

export default function FeedbackPage() {
  return (
    <PodScopedPage
      title="Live Feedback"
      subtitle="Rate the pod while it is on"
      icon={<RateReviewIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)"
    >
      {(selected) => <FeedbackContent selected={selected} />}
    </PodScopedPage>
  );
}
