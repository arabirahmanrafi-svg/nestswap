import { useRef, useState } from 'react';

const MAX = 10;
const MAX_MB = 8;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Photo manager for the post/edit form.
 * items: [{ key, kind: 'existing'|'new', id?, file?, url, alt }]
 * The first photo is the cover. Users can reorder with buttons (keyboard friendly),
 * remove photos, and describe each one for screen-reader users.
 */
export default function PhotoPicker({ items, onChange, error }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [problem, setProblem] = useState('');

  function addFiles(fileList) {
    setProblem('');
    const incoming = Array.from(fileList);
    const accepted = [];
    for (const f of incoming) {
      if (!OK_TYPES.includes(f.type)) { setProblem(`“${f.name}” isn’t a JPG, PNG, WEBP or GIF. iPhone photos: choose “Most Compatible” in Camera settings or export as JPG.`); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { setProblem(`“${f.name}” is over ${MAX_MB} MB.`); continue; }
      accepted.push({ key: `n-${crypto.randomUUID()}`, kind: 'new', file: f, url: URL.createObjectURL(f), alt: '' });
    }
    const room = MAX - items.length;
    if (accepted.length > room) setProblem(`You can have up to ${MAX} photos. Only the first ${room} were added.`);
    onChange([...items, ...accepted.slice(0, Math.max(0, room))]);
  }

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i) => {
    const it = items[i];
    if (it.kind === 'new') URL.revokeObjectURL(it.url);
    onChange(items.filter((_, n) => n !== i));
  };
  const setAlt = (i, alt) => onChange(items.map((it, n) => (n === i ? { ...it, alt } : it)));

  return (
    <div className={`photo-picker ${error ? 'has-error' : ''}`}>
      <div
        className={`dropzone ${dragOver ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      >
        <p><strong>Drag photos here</strong> or</p>
        <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()} disabled={items.length >= MAX}>
          Choose photos
        </button>
        <input ref={inputRef} type="file" accept={OK_TYPES.join(',')} multiple hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <p className="hint">Up to {MAX} photos, {MAX_MB} MB each. Bright, wide shots of every room work best.</p>
      </div>

      {(problem || error) && <p className="field-error" role="alert">{problem || error}</p>}

      {items.length > 0 && (
        <ol className="photo-list" aria-label="Your photos, in display order">
          {items.map((it, i) => (
            <li key={it.key} className="photo-item">
              <div className="photo-thumb">
                <img src={it.url} alt="" />
                {i === 0 && <span className="cover-pill">Cover</span>}
              </div>
              <div className="photo-controls">
                <label htmlFor={`alt-${it.key}`}>Describe photo {i + 1} <span className="muted">(optional, helps blind users)</span></label>
                <input id={`alt-${it.key}`} type="text" maxLength={200} placeholder="e.g. Sunny living room with large windows"
                  value={it.alt} onChange={(e) => setAlt(i, e.target.value)} />
                <div className="photo-buttons">
                  <button type="button" className="btn btn-ghost small" onClick={() => move(i, -1)} disabled={i === 0}
                    aria-label={`Move photo ${i + 1} earlier`}>↑ Earlier</button>
                  <button type="button" className="btn btn-ghost small" onClick={() => move(i, 1)} disabled={i === items.length - 1}
                    aria-label={`Move photo ${i + 1} later`}>↓ Later</button>
                  {i !== 0 && (
                    <button type="button" className="btn btn-ghost small" onClick={() => onChange([it, ...items.filter((_, n) => n !== i)])}>
                      Make cover
                    </button>
                  )}
                  <button type="button" className="btn btn-danger-ghost small" onClick={() => remove(i)}
                    aria-label={`Remove photo ${i + 1}`}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
