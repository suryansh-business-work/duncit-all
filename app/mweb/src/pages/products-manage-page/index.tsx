import Inventory2Icon from '@mui/icons-material/Inventory2';
import StudioStub from '../studio-stub/StudioStub';

/** "Your Products" — placeholder until the seller/listing flow ships. */
export default function ProductsManagePage() {
  return (
    <StudioStub
      icon={<Inventory2Icon />}
      title="Your Products"
      subtitle="Product listing is coming soon. You'll manage your Duncit product catalogue here."
    />
  );
}
