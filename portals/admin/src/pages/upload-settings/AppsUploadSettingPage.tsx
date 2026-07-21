import UploadSettingPage from './UploadSettingPage';

/** Admin > Upload Settings > Mobile App + mWeb Upload Setting. */
export default function AppsUploadSettingPage() {
  return (
    <UploadSettingPage
      surface="MOBILE_MWEB"
      title="Mobile App + mWeb Upload Setting"
      subtitle="Upload rules applied to the native app and the mWeb PWA (pods, reels, statuses, avatars)."
    />
  );
}
