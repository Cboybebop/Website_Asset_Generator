import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Check,
  Copy,
  Download,
  FileImage,
  ImagePlus,
  Move,
  RotateCcw,
  Sparkles,
  Upload,
  ZoomIn
} from 'lucide-react';
import './styles.css';

const FAVICON_SIZES = [16, 32, 48, 64, 128, 180, 192, 512];
const ICO_SIZES = [16, 32, 48];

function App() {
  const [source, setSource] = useState(null);
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState('');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [background, setBackground] = useState('transparent');
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!source) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImage(img);
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setGenerated(null);
    };
    img.src = source;
  }, [source]);

  const drawCropper = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cropSize = size * 0.76;
    const cropX = (size - cropSize) / 2;
    const cropY = (size - cropSize) / 2;
    const fit = cropSize / Math.min(image.width, image.height);
    const drawWidth = image.width * fit * scale;
    const drawHeight = image.height * fit * scale;
    const drawX = size / 2 - drawWidth / 2 + offset.x;
    const drawY = size / 2 - drawHeight / 2 + offset.y;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f5f7fb';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropSize, cropSize);
    ctx.clip();

    if (background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(cropX, cropY, cropSize, cropSize);
    } else {
      drawCheckerboard(ctx, cropX, cropY, cropSize);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

    ctx.fillStyle = 'rgba(13, 18, 32, 0.48)';
    ctx.fillRect(0, 0, size, cropY);
    ctx.fillRect(0, cropY + cropSize, size, cropY);
    ctx.fillRect(0, cropY, cropX, cropSize);
    ctx.fillRect(cropX + cropSize, cropY, cropX, cropSize);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropSize, cropSize);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([7, 7]);
    ctx.strokeRect(cropX + cropSize / 3, cropY, cropSize / 3, cropSize);
    ctx.strokeRect(cropX, cropY + cropSize / 3, cropSize, cropSize / 3);
    ctx.setLineDash([]);
  }, [background, image, offset, scale]);

  useEffect(() => {
    drawCropper();
  }, [drawCropper]);

  const onUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => setSource(reader.result);
    reader.readAsDataURL(file);
  };

  const updateOffsetFromPointer = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.startOffset.x + event.clientX - drag.startPointer.x,
      y: drag.startOffset.y + event.clientY - drag.startPointer.y
    });
  };

  const startDrag = (event) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startPointer: { x: event.clientX, y: event.clientY },
      startOffset: offset
    };
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const resetCrop = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const generateFavicons = async () => {
    if (!image) return;

    const pngs = await Promise.all(
      FAVICON_SIZES.map(async (size) => ({
        size,
        name: size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`,
        blob: await renderIconBlob(image, size, scale, offset, background)
      }))
    );

    const icoEntries = await Promise.all(
      ICO_SIZES.map(async (size) => ({
        size,
        bytes: new Uint8Array(await (await renderIconBlob(image, size, scale, offset, background)).arrayBuffer())
      }))
    );

    const manifest = new Blob([getManifestJson()], { type: 'application/manifest+json' });
    const ico = new Blob([encodeIco(icoEntries)], { type: 'image/x-icon' });
    setGenerated({ pngs, ico, manifest });
  };

  const downloadAll = () => {
    if (!generated) return;
    downloadBlob(generated.ico, 'favicon.ico');
    downloadBlob(generated.manifest, 'site.webmanifest');
    generated.pngs.forEach((file, index) => {
      window.setTimeout(() => downloadBlob(file.blob, file.name), (index + 1) * 90);
    });
  };

  const implementation = useMemo(() => getImplementationSteps(), []);

  const copySteps = async () => {
    await navigator.clipboard.writeText(implementation);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="tool-panel">
          <div className="brand-line">
            <div className="brand-mark">
              <Sparkles size={22} />
            </div>
            <div>
              <h1>FavIcon Generator</h1>
              <p>Upload, crop, preview, and export production-ready website icons.</p>
            </div>
          </div>

          <label className="upload-zone">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onUpload} />
            <ImagePlus size={34} />
            <span>{source ? fileName || 'Image loaded' : 'Choose source image'}</span>
            <small>PNG, JPG, WebP, or SVG work best when the subject is centered.</small>
          </label>

          <div className="cropper-card">
            <canvas
              aria-label="Favicon crop preview"
              className={image ? 'cropper-canvas is-ready' : 'cropper-canvas'}
              height="640"
              onPointerDown={startDrag}
              onPointerMove={updateOffsetFromPointer}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              ref={canvasRef}
              width="640"
            />
            {!image && (
              <div className="empty-cropper">
                <Upload size={30} />
                <span>Upload an image to start cropping</span>
              </div>
            )}
          </div>

          <div className="controls">
            <label className="control-row">
              <span>
                <ZoomIn size={18} />
                Zoom
              </span>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.01"
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
                disabled={!image}
              />
            </label>

            <div className="control-row">
              <span>
                <FileImage size={18} />
                Background
              </span>
              <div className="swatches" role="group" aria-label="Background color">
                {['transparent', '#ffffff', '#111827', '#0f766e', '#eab308'].map((color) => (
                  <button
                    aria-label={color === 'transparent' ? 'Transparent' : color}
                    className={background === color ? 'swatch is-active' : 'swatch'}
                    key={color}
                    onClick={() => setBackground(color)}
                    style={color === 'transparent' ? undefined : { backgroundColor: color }}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <div className="button-row">
              <button className="secondary-button" disabled={!image} onClick={resetCrop} type="button">
                <RotateCcw size={18} />
                Reset
              </button>
              <button className="primary-button" disabled={!image} onClick={generateFavicons} type="button">
                <Move size={18} />
                Generate
              </button>
            </div>
          </div>
        </div>

        <div className="output-panel">
          <div className="panel-header">
            <div>
              <h2>Preview & Export</h2>
              <p>{generated ? 'Files are ready to download.' : 'Generate favicons after positioning your image.'}</p>
            </div>
            <button className="icon-button" disabled={!generated} onClick={downloadAll} title="Download generated files" type="button">
              <Download size={20} />
            </button>
          </div>

          <div className="preview-grid">
            {FAVICON_SIZES.map((size) => (
              <IconPreview generated={generated} key={size} size={size} />
            ))}
          </div>

          <div className="download-list">
            <h3>Generated Files</h3>
            <button className="file-row" disabled={!generated} onClick={() => generated && downloadBlob(generated.ico, 'favicon.ico')} type="button">
              <span>favicon.ico</span>
              <small>16, 32, and 48 px</small>
              <Download size={17} />
            </button>
            <button className="file-row" disabled={!generated} onClick={() => generated && downloadBlob(generated.manifest, 'site.webmanifest')} type="button">
              <span>site.webmanifest</span>
              <small>192 and 512 px icons</small>
              <Download size={17} />
            </button>
            {FAVICON_SIZES.map((size) => {
              const file = generated?.pngs.find((item) => item.size === size);
              const name = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
              return (
                <button className="file-row" disabled={!file} key={size} onClick={() => file && downloadBlob(file.blob, name)} type="button">
                  <span>{name}</span>
                  <small>{size} x {size} px</small>
                  <Download size={17} />
                </button>
              );
            })}
          </div>

          <div className="steps-panel">
            <div className="steps-title">
              <h3>Implementation Steps</h3>
              <button className="copy-button" onClick={copySteps} type="button">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre>{implementation}</pre>
          </div>
        </div>
      </section>
    </main>
  );
}

function IconPreview({ generated, size }) {
  const [url, setUrl] = useState('');
  const file = generated?.pngs.find((item) => item.size === size);

  useEffect(() => {
    if (!file) {
      setUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="preview-tile">
      <div className="preview-frame">
        {url ? <img alt={`${size} by ${size} favicon preview`} src={url} style={{ width: Math.min(size, 56), height: Math.min(size, 56) }} /> : <span />}
      </div>
      <strong>{size}px</strong>
    </div>
  );
}

function drawCheckerboard(ctx, x, y, size) {
  const tile = 16;
  for (let row = 0; row < size / tile; row += 1) {
    for (let col = 0; col < size / tile; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#e7ecf3';
      ctx.fillRect(x + col * tile, y + row * tile, tile, tile);
    }
  }
}

async function renderIconBlob(image, size, scale, offset, background) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const previewSize = 640;
  const previewCrop = previewSize * 0.76;
  const sourceFit = previewCrop / Math.min(image.width, image.height);
  const exportFit = size / Math.min(image.width, image.height);
  const offsetScale = size / previewCrop;
  const drawWidth = image.width * exportFit * scale;
  const drawHeight = image.height * exportFit * scale;
  const drawX = size / 2 - drawWidth / 2 + offset.x * offsetScale;
  const drawY = size / 2 - drawHeight / 2 + offset.y * offsetScale;

  if (background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = size <= 32 ? 'medium' : 'high';
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function encodeIco(entries) {
  const headerSize = 6;
  const directorySize = entries.length * 16;
  const totalSize = headerSize + directorySize + entries.reduce((sum, entry) => sum + entry.bytes.length, 0);
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = headerSize + directorySize;

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, entries.length, true);

  entries.forEach((entry, index) => {
    const directoryOffset = headerSize + index * 16;
    view.setUint8(directoryOffset, entry.size === 256 ? 0 : entry.size);
    view.setUint8(directoryOffset + 1, entry.size === 256 ? 0 : entry.size);
    view.setUint8(directoryOffset + 2, 0);
    view.setUint8(directoryOffset + 3, 0);
    view.setUint16(directoryOffset + 4, 1, true);
    view.setUint16(directoryOffset + 6, 32, true);
    view.setUint32(directoryOffset + 8, entry.bytes.length, true);
    view.setUint32(directoryOffset + 12, offset, true);
    bytes.set(entry.bytes, offset);
    offset += entry.bytes.length;
  });

  return buffer;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function getImplementationSteps() {
  return `1. Download favicon.ico and the PNG files.
2. Copy the files into your site's public root, usually /public or /static.
3. Add these tags inside the <head> of every page:

<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">

4. Optional site.webmanifest:

{
  "icons": [
    { "src": "/favicon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}

5. Clear browser cache or test in a private window to confirm the new icon appears.`;
}

function getManifestJson() {
  return `${JSON.stringify(
    {
      icons: [
        { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    null,
    2
  )}
`;
}

createRoot(document.getElementById('root')).render(<App />);
