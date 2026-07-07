import ProductsField from '../components/ProductsField';
import { usePodFormData } from '../context';

export default function ProductsSection() {
  const { products } = usePodFormData();
  return <ProductsField products={products} />;
}
