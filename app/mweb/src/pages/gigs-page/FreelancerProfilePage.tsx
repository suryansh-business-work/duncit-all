import { FreelancerProfileEditor } from '@duncit/gig-jobs';
import GigsShell from './GigsShell';

/** /earn/freelancer — Earn with Duncit's self-serve freelancer step. */
export default function FreelancerProfilePage() {
  return (
    <GigsShell testId="freelancer-profile-page">
      <FreelancerProfileEditor />
    </GigsShell>
  );
}
