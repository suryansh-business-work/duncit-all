import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import StudioStub from '../studio-stub/StudioStub';

/** Seller verification — placeholder until the ecomm KYC flow ships. */
export default function ProductsVerificationPage() {
  return (
    <StudioStub
      icon={<VerifiedUserIcon />}
      title="Seller verification"
      subtitle="Seller verification is coming soon. Complete it here to start listing products."
    />
  );
}
