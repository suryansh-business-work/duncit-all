import PodScopedPage from './PodScopedPage';
import SosContent from './SosContent';

export default function SosPage() {
  return (
    <PodScopedPage title="SOS">
      {(selected) => <SosContent selected={selected} />}
    </PodScopedPage>
  );
}
