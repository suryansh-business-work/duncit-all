import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { SignatureMethod } from '../graphql/documents';

/** The brief's ceiling, enforced here as well as on the server. */
const MAX_BYTES = 5 * 1024 * 1024;
const CANVAS_W = 520;
const CANVAS_H = 160;

const METHOD_LABEL: Record<SignatureMethod, string> = {
  DRAW: 'Draw',
  TYPE: 'Type',
  UPLOAD: 'Upload',
};

interface Props {
  /** Only the methods this platform allows, in the order they should appear. */
  methods: SignatureMethod[];
  value: string;
  method: SignatureMethod | null;
  onChange: (image: string, method: SignatureMethod) => void;
  /** Typed signatures render the signer's name, so it comes from the form. */
  typedName: string;
}

/**
 * Capture a signature by drawing it, typing it, or uploading a picture of one.
 *
 * Whichever method is used, the output is one thing: a PNG data URL. The server
 * stores that and the PDF renderer draws it, so adding a method later never
 * touches either of them.
 *
 * Only the enabled methods are offered — an admin can switch any of them off,
 * and a tab that leads to a rejected save is worse than no tab.
 */
export default function SignaturePad({
  methods,
  value,
  method,
  onChange,
  typedName,
}: Readonly<Props>) {
  const [tab, setTab] = useState<SignatureMethod>(method ?? methods[0] ?? 'DRAW');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  // Keep the tab on something the platform actually allows, even if the
  // configuration changes while the dialog is open.
  useEffect(() => {
    if (methods.length > 0 && !methods.includes(tab)) setTab(methods[0]);
  }, [methods, tab]);

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    // Pointer events cover mouse, touch and stylus with one handler — a
    // separate touch path is how one of the three ends up subtly different.
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = canvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = canvasPoint(event);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'), 'DRAW');
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('', 'DRAW');
  };

  /** Render the typed name as an image, so every method produces the same thing. */
  const commitTyped = (text: string) => {
    setTyped(text);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx || !text.trim()) {
      onChange('', 'TYPE');
      return;
    }
    ctx.fillStyle = '#111827';
    ctx.font = 'italic 54px Georgia, "Times New Roman", serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 16, CANVAS_H / 2);
    onChange(canvas.toDataURL('image/png'), 'TYPE');
  };

  const upload = (file?: File | null) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Upload an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is over 5 MB. Choose a smaller one.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result ?? ''), 'UPLOAD');
    reader.onerror = () => setError('That image could not be read.');
    reader.readAsDataURL(file);
  };

  if (methods.length === 0) {
    return (
      <Alert severity="warning">
        Every signing method is switched off for this platform. Enable one in Admin › Feature Flags.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Tabs value={tab} onChange={(_e, v) => setTab(v as SignatureMethod)} variant="scrollable">
        {methods.map((m) => (
          <Tab key={m} value={m} label={METHOD_LABEL[m]} />
        ))}
      </Tabs>

      {error && <Alert severity="error">{error}</Alert>}

      {tab === 'DRAW' && (
        <Stack spacing={1}>
          <Box
            component="canvas"
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            sx={{
              width: '100%',
              height: 160,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
              touchAction: 'none',
              cursor: 'crosshair',
            }}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" onClick={clearCanvas}>
              Clear
            </Button>
            <Typography variant="caption" color="text.secondary">
              Sign with a mouse, finger or stylus.
            </Typography>
          </Stack>
        </Stack>
      )}

      {tab === 'TYPE' && (
        <Stack spacing={1}>
          <TextField
            label="Type your signature"
            value={typed}
            onChange={(e) => commitTyped(e.target.value)}
            placeholder={typedName || 'Your name'}
            fullWidth
          />
          {value && method === 'TYPE' && (
            <Box
              component="img"
              src={value}
              alt="Typed signature preview"
              sx={{ height: 80, objectFit: 'contain', alignSelf: 'flex-start' }}
            />
          )}
        </Stack>
      )}

      {tab === 'UPLOAD' && (
        <Stack spacing={1} alignItems="flex-start">
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            Choose image
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </Button>
          <Typography variant="caption" color="text.secondary">
            PNG or JPG, under 5 MB.
          </Typography>
          {value && method === 'UPLOAD' && (
            <Box
              component="img"
              src={value}
              alt="Uploaded signature preview"
              sx={{ height: 80, objectFit: 'contain' }}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
