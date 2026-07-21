import UploadSettingPage from './UploadSettingPage';

/** Admin > Upload Settings > Portals Upload Setting. */
export default function PortalsUploadSettingPage() {
  return (
    <UploadSettingPage
      surface="PORTALS"
      title="Portals Upload Setting"
      subtitle="Upload rules applied to every MUI portal (Admin, Partners, CRM, Support, …)."
    />
  );
}
