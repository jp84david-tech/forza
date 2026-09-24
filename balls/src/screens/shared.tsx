import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef } from 'react';

/** Small pieces shared by several screens. */

function resize(file: File, max = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoPicker({ photos, onChange, max = 4, icon }: { photos: string[]; onChange: (p: string[]) => void; max?: number; icon: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="photopick">
      {photos.map((p, i) => (
        <span key={i} className="photopick__item">
          <img src={p} alt={`Upload ${i + 1}`} />
          <button type="button" aria-label="Remove photo" onClick={() => onChange(photos.filter((_, k) => k !== i))}>
            <X size={14} />
          </button>
        </span>
      ))}
      {photos.length < max && (
        <button type="button" className="photopick__add" onClick={() => input.current?.click()} aria-label="Add photos">
          {icon}
          <span>Add</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])].slice(0, max - photos.length);
          const out = await Promise.all(files.map((f) => resize(f).catch(() => null)));
          onChange([...photos, ...(out.filter(Boolean) as string[])]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
