import { Box } from '@mui/material';
import DeviceUploadTab from '../DeviceUploadTab';
import PexelsPhotosTab from '../PexelsPhotosTab';
import PexelsVideosTab from '../PexelsVideosTab';
import type { useDeviceUpload } from '../useDeviceUpload';
import type { Orientation, UploadSurface } from '../types';
import type { PickerTab } from './pickerTabs';

/** Comfortable on a laptop, and free to be shorter on a phone. */
const PANEL_MIN_HEIGHT = { xs: 220, sm: 380 };

interface PickerPanelsProps {
  tab: PickerTab;
  device: ReturnType<typeof useDeviceUpload>;
  accept: string;
  allowImage: boolean;
  allowVideo: boolean;
  open: boolean;
  folder: string;
  surface: UploadSurface;
  seedQuery?: string;
  orientation?: Orientation;
  multi: boolean;
  atLimit: boolean;
  onPicked: (url: string) => void;
  onClose: () => void;
  setError: (message: string | null) => void;
}

/** The three tab panels — all mounted, only the open one shown. */
export default function PickerPanels({
  tab,
  device,
  accept,
  allowImage,
  allowVideo,
  open,
  folder,
  surface,
  seedQuery,
  orientation,
  multi,
  atLimit,
  onPicked,
  onClose,
  setError,
}: Readonly<PickerPanelsProps>) {
  return (
    <>
      <Box sx={{ display: tab === 'device' ? 'block' : 'none', minHeight: PANEL_MIN_HEIGHT }}>
        <DeviceUploadTab
          accept={accept}
          fileInputRef={device.fileInputRef}
          picked={device.picked}
          previewUrl={device.previewUrl}
          uploadPct={device.uploadPct}
          uploading={device.uploading}
          stage={device.stage}
          settings={device.settings}
          cropKey={device.cropKey}
          onSelectCropKey={device.setCropKey}
          onCropComplete={device.setCropRect}
          onPickFile={device.onPickFile}
        />
      </Box>

      <Box sx={{ display: tab === 'photos' ? 'block' : 'none', minHeight: PANEL_MIN_HEIGHT }}>
        <PexelsPhotosTab
          active={tab === 'photos' && allowImage}
          open={open}
          folder={folder}
          surface={surface}
          seedQuery={seedQuery}
          defaultOrientation={orientation}
          multi={multi}
          atLimit={atLimit}
          onPicked={onPicked}
          onClose={onClose}
          setError={setError}
        />
      </Box>

      <Box sx={{ display: tab === 'videos' ? 'block' : 'none', minHeight: PANEL_MIN_HEIGHT }}>
        <PexelsVideosTab
          active={tab === 'videos' && allowVideo}
          open={open}
          folder={folder}
          surface={surface}
          seedQuery={seedQuery}
          onPicked={onPicked}
          onClose={onClose}
          setError={setError}
        />
      </Box>
    </>
  );
}
