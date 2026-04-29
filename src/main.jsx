import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Check,
  Copy,
  Download,
  FileImage,
  ImagePlus,
  Images,
  Move,
  RotateCcw,
  Sparkles,
  Upload,
  ZoomIn
} from 'lucide-react';
import './styles.css';

const FAVICON_SIZES = [16, 32, 48, 64, 128, 180, 192, 512];
const ICO_SIZES = [16, 32, 48];
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const FONT_OPTIONS = [
  { label: 'Inter', family: 'Inter' },
  { label: 'Montserrat', family: 'Montserrat' },
  { label: 'Roboto Slab', family: 'Roboto Slab' },
  { label: 'Playfair Display', family: 'Playfair Display' },
  { label: 'Space Grotesk', family: 'Space Grotesk' },
  { label: 'Lora', family: 'Lora' }
];

function App() {
  const [activeTab, setActiveTab] = useState('favicon');

  return (
    <main className="app-shell">
      <div className="app-topbar">
        <div className="brand-line">
          <div className="brand-mark">
            <Sparkles size={22} />
          </div>
          <div>
            <h1>Website Asset Generator</h1>
            <p>Create polished favicon files and Open Graph preview images from local artwork.</p>
          </div>
        </div>

        <div className="tab-list" role="tablist" aria-label="Generator type">
          <button className={activeTab === 'favicon' ? 'tab-button is-active' : 'tab-button'} onClick={() => setActiveTab('favicon')} role="tab" type="button">
            <FileImage size={18} />
            Favicon Generator
          </button>
          <button className={activeTab === 'og' ? 'tab-button is-active' : 'tab-button'} onClick={() => setActiveTab('og')} role="tab" type="button">
            <Images size={18} />
            OG:image Generator
          </button>
        </div>
      </div>

      {activeTab === 'favicon' ? <FaviconGenerator /> : <OgImageGenerator />}
    </main>
  );
}

function FaviconGenerator() {
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

  const implementation = useMemo(() => getFaviconImplementationSteps(), []);

  const copySteps = async () => {
    await navigator.clipboard.writeText(implementation);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="workspace">
      <div className="tool-panel">
        <SectionHeader title="Favicon Generator" description="Upload, crop, preview, and export production-ready website icons." icon={<FileImage size={22} />} />

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
            <input type="range" min="0.5" max="4" step="0.01" value={scale} onChange={(event) => setScale(Number(event.target.value))} disabled={!image} />
          </label>

          <ColorSwatches label="Background" value={background} onChange={setBackground} colors={['transparent', '#ffffff', '#111827', '#0f766e', '#eab308']} />

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
                <small>
                  {size} x {size} px
                </small>
                <Download size={17} />
              </button>
            );
          })}
        </div>

        <StepsPanel title="Implementation Steps" copied={copied} onCopy={copySteps} content={implementation} />
      </div>
    </section>
  );
}

function OgImageGenerator() {
  const [mode, setMode] = useState('designed');
  const [source, setSource] = useState(null);
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState('');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [accent, setAccent] = useState('#0f766e');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [overlayOpacity, setOverlayOpacity] = useState(72);
  const [title, setTitle] = useState('Launch-ready website assets');
  const [subtitle, setSubtitle] = useState('Generate favicons and social preview images from one local tool.');
  const [siteName, setSiteName] = useState('example.com');
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!source) {
      setImage(null);
      setGenerated(null);
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

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderOgCanvas(canvas, { mode, image, scale, offset, accent, fontFamily, overlayOpacity, title, subtitle, siteName, preview: true });
  }, [accent, fontFamily, image, mode, offset, overlayOpacity, scale, siteName, subtitle, title]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  useEffect(() => {
    document.fonts?.ready.then(drawPreview);
  }, [drawPreview, fontFamily]);

  const onUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => setSource(reader.result);
    reader.readAsDataURL(file);
  };

  const startDrag = (event) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startPointer: { x: event.clientX, y: event.clientY },
      startOffset: offset
    };
  };

  const updateOffsetFromPointer = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.startOffset.x + event.clientX - drag.startPointer.x,
      y: drag.startOffset.y + event.clientY - drag.startPointer.y
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const resetArtwork = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const generateOgImage = async () => {
    await document.fonts?.ready;
    const canvas = document.createElement('canvas');
    canvas.width = OG_WIDTH;
    canvas.height = OG_HEIGHT;
    renderOgCanvas(canvas, { mode, image, scale, offset, accent, fontFamily, overlayOpacity, title, subtitle, siteName, preview: false });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    setGenerated({ blob });
  };

  const implementation = useMemo(() => getOgImplementationSteps(siteName), [siteName]);

  const copySteps = async () => {
    await navigator.clipboard.writeText(implementation);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="workspace">
      <div className="tool-panel">
        <SectionHeader title="OG:image Generator" description="Compose a 1200 x 630 social preview image for link sharing." icon={<Images size={22} />} />

        <label className="upload-zone">
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onUpload} />
          <ImagePlus size={34} />
          <span>{source ? fileName || 'Image loaded' : 'Choose background artwork'}</span>
          <small>Use product shots, screenshots, logos, or brand artwork as the visual layer.</small>
        </label>

        <div className="og-canvas-card">
          <canvas
            aria-label="Open Graph image preview"
            className={image ? 'og-canvas is-ready' : 'og-canvas'}
            height={630}
            onPointerDown={startDrag}
            onPointerMove={updateOffsetFromPointer}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            ref={canvasRef}
            width={1200}
          />
        </div>

        <div className="controls">
          <div className="segmented-control" role="group" aria-label="Open Graph output mode">
            <button className={mode === 'designed' ? 'segment-button is-active' : 'segment-button'} onClick={() => setMode('designed')} type="button">
              Designed card
            </button>
            <button className={mode === 'image' ? 'segment-button is-active' : 'segment-button'} onClick={() => setMode('image')} type="button">
              Just image
            </button>
          </div>

          {mode === 'designed' && (
            <>
              <label className="field-row">
                <span>Title</span>
                <input value={title} maxLength={74} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="field-row">
                <span>Subtitle</span>
                <textarea value={subtitle} maxLength={130} onChange={(event) => setSubtitle(event.target.value)} rows="3" />
              </label>
              <label className="field-row">
                <span>Site</span>
                <input value={siteName} maxLength={42} onChange={(event) => setSiteName(event.target.value)} />
              </label>
              <label className="field-row">
                <span>Font</span>
                <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.family} value={font.family}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="control-row">
            <span>
              <ZoomIn size={18} />
              Artwork
            </span>
            <input type="range" min="0.65" max="2.7" step="0.01" value={scale} onChange={(event) => setScale(Number(event.target.value))} disabled={!image} />
          </label>

          {mode === 'designed' && (
            <>
              <ColorSwatches label="Accent" value={accent} onChange={setAccent} colors={['#0f766e', '#2563eb', '#be123c', '#7c3aed', '#ea580c']} custom />
              <label className="control-row">
                <span>Overlay</span>
                <input type="range" min="0" max="95" step="1" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} />
                <small className="range-value">{overlayOpacity}%</small>
              </label>
            </>
          )}

          <div className="button-row">
            <button className="secondary-button" onClick={resetArtwork} type="button">
              <RotateCcw size={18} />
              Reset
            </button>
            <button className="primary-button" disabled={mode === 'image' && !image} onClick={generateOgImage} type="button">
              <Images size={18} />
              Generate
            </button>
          </div>
        </div>
      </div>

      <div className="output-panel">
        <div className="panel-header">
          <div>
            <h2>Preview & Export</h2>
            <p>{generated ? 'Open Graph image is ready.' : 'Generate a 1200 x 630 PNG after composing the preview.'}</p>
          </div>
          <button className="icon-button" disabled={!generated} onClick={() => generated && downloadBlob(generated.blob, 'og-image.png')} title="Download OG image" type="button">
            <Download size={20} />
          </button>
        </div>

        <OgOutputPreview generated={generated} />

        <div className="download-list">
          <h3>Generated File</h3>
          <button className="file-row" disabled={!generated} onClick={() => generated && downloadBlob(generated.blob, 'og-image.png')} type="button">
            <span>og-image.png</span>
            <small>1200 x 630 px</small>
            <Download size={17} />
          </button>
        </div>

        <StepsPanel title="Implementation Steps" copied={copied} onCopy={copySteps} content={implementation} />
      </div>
    </section>
  );
}

function SectionHeader({ title, description, icon }) {
  return (
    <div className="section-header">
      <div className="brand-mark">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function ColorSwatches({ label, value, onChange, colors, custom = false }) {
  return (
    <div className="control-row">
      <span>
        <FileImage size={18} />
        {label}
      </span>
      <div className="swatches" role="group" aria-label={`${label} color`}>
        {colors.map((color) => (
          <button
            aria-label={color === 'transparent' ? 'Transparent' : color}
            className={value === color ? 'swatch is-active' : 'swatch'}
            key={color}
            onClick={() => onChange(color)}
            style={color === 'transparent' ? undefined : { backgroundColor: color }}
            type="button"
          />
        ))}
        {custom && (
          <label className="custom-color" title="Custom color">
            <input aria-label="Custom accent color" type="color" value={value} onChange={(event) => onChange(event.target.value)} />
          </label>
        )}
      </div>
    </div>
  );
}

function StepsPanel({ title, copied, onCopy, content }) {
  return (
    <div className="steps-panel">
      <div className="steps-title">
        <h3>{title}</h3>
        <button className="copy-button" onClick={onCopy} type="button">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>{content}</pre>
    </div>
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

function OgOutputPreview({ generated }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!generated) {
      setUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(generated.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [generated]);

  return (
    <div className="og-output-preview">
      {url ? <img alt="Generated Open Graph preview" src={url} /> : <span>1200 x 630 social preview</span>}
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

function renderOgCanvas(canvas, settings) {
  const { mode, image, scale, offset, accent, fontFamily, overlayOpacity, title, subtitle, siteName, preview } = settings;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const ratio = width / OG_WIDTH;
  const safeOffset = preview ? offset : { x: offset.x / ratio, y: offset.y / ratio };

  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#111827');
  gradient.addColorStop(0.62, '#253447');
  gradient.addColorStop(1, accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (image) {
    const fit = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * fit * scale;
    const drawHeight = image.height * fit * scale;
    const drawX = width / 2 - drawWidth / 2 + safeOffset.x;
    const drawY = height / 2 - drawHeight / 2 + safeOffset.y;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  }

  if (mode === 'image') {
    if (!image) {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = `700 ${34 * ratio}px Inter, Segoe UI, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Upload artwork to generate a just-image OG preview', width / 2, height / 2);
      ctx.textAlign = 'left';
    } else {
      ctx.clearRect(0, 0, width, height);
      const fit = Math.max(width / image.width, height / image.height);
      const drawWidth = image.width * fit * scale;
      const drawHeight = image.height * fit * scale;
      const drawX = width / 2 - drawWidth / 2 + safeOffset.x;
      const drawY = height / 2 - drawHeight / 2 + safeOffset.y;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }
    return;
  }

  const overlay = ctx.createLinearGradient(0, 0, width, 0);
  const alpha = overlayOpacity / 100;
  overlay.addColorStop(0, `rgba(17, 24, 39, ${Math.min(alpha + 0.21, 0.98)})`);
  overlay.addColorStop(0.54, `rgba(17, 24, 39, ${alpha})`);
  overlay.addColorStop(1, `rgba(17, 24, 39, ${Math.max(alpha - 0.54, 0)})`);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  const pad = 76 * ratio;
  const accentHeight = 10 * ratio;
  ctx.fillStyle = accent;
  roundRect(ctx, pad, pad, 150 * ratio, accentHeight, accentHeight / 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${70 * ratio}px "${fontFamily}", Inter, Segoe UI, sans-serif`;
  ctx.textBaseline = 'top';
  wrapText(ctx, title || 'Untitled preview', pad, 142 * ratio, 650 * ratio, 82 * ratio, 3);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `500 ${31 * ratio}px "${fontFamily}", Inter, Segoe UI, sans-serif`;
  wrapText(ctx, subtitle || 'Add a concise description for link previews.', pad, 405 * ratio, 610 * ratio, 43 * ratio, 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = `750 ${24 * ratio}px "${fontFamily}", Inter, Segoe UI, sans-serif`;
  ctx.fillText(siteName || 'example.com', pad, 552 * ratio);

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2 * ratio;
  ctx.strokeRect(1 * ratio, 1 * ratio, width - 2 * ratio, height - 2 * ratio);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((lineText, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : '';
    ctx.fillText(`${lineText}${suffix}`, x, y + index * lineHeight);
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
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

function getFaviconImplementationSteps() {
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

function getOgImplementationSteps(siteName) {
  const safeSite = siteName || 'example.com';
  return `1. Download og-image.png.
2. Copy it into your public assets folder, usually /public or /static.
3. Add these tags inside the <head> of the page:

<meta property="og:type" content="website">
<meta property="og:site_name" content="${safeSite}">
<meta property="og:image" content="https://${safeSite}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://${safeSite}/og-image.png">

4. Replace the URL with your real production domain.
5. Test the page with a social card validator after deployment.`;
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
