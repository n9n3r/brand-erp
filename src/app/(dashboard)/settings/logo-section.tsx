'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/client';
import { Button, Card } from '@/components/ui';

const MAX_DIMENSION = 512;

/** Downscale the chosen image client-side and return a PNG data URL. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load the image'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Brand logo upload — shown on invoices. */
export function LogoSection({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSaved(false);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      setError('Please choose a PNG, JPG, WEBP or GIF image.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
      await api('/api/brand/logo', { method: 'POST', body: JSON.stringify({ dataUrl }) });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeLogo() {
    if (!window.confirm('Remove the logo? Invoices will use the default MyBrand mark.')) return;
    setBusy(true);
    setError(null);
    try {
      await api('/api/brand/logo', { method: 'DELETE' });
      setPreview(null);
      setSaved(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-slate-900">Brand logo</h2>
      <p className="mt-1 text-xs text-slate-500">
        Shown at the top of every invoice. Square images look best; we resize to 512px automatically.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Brand logo" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-8 w-8 text-slate-300" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onPick} />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" /> {busy ? 'Uploading…' : preview ? 'Replace logo' : 'Upload logo'}
          </Button>
          {preview ? (
            <Button variant="secondary" onClick={removeLogo} disabled={busy}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {saved ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Logo saved — it now appears on your invoices.
        </div>
      ) : null}
    </Card>
  );
}
