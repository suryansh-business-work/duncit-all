import UploadSettingPage from './UploadSettingPage';

/** Admin > Upload Settings > mWeb Upload Setting. */
export default function MwebUploadSettingPage() {
  return (
    <UploadSettingPage
      surface="MWEB"
      title="mWeb Upload Setting"
      subtitle="Upload rules applied to the mWeb PWA (pods, reels, statuses, avatars)."
    />
  );
}
