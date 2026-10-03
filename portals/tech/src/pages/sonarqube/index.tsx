// The Analytics console's own SonarQube dashboard, mounted here as it is — one
// implementation, two doors. Its numbers are read live from the SonarQube
// server named in Environment Variables → SonarQube. The Dockerfile copies that
// console's src for the build, and the deploy filter rebuilds this console when it changes.
import EntityAnalyticsPage from '../../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage';
import { SONARQUBE_PAGE } from '../../../../analytics/src/pages/entity-analytics/pages';

/** Security → SonarQube: quality gate, issues, ratings and coverage for the repository. */
export default function SonarqubePage() {
  return <EntityAnalyticsPage page={SONARQUBE_PAGE} />;
}
