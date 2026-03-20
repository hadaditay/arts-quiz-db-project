import { useEffect, useState } from 'react';
import styles from './ArtworkImage.module.css';

interface Props {
  smallSrc: string | null;
  fullSrc: string | null;
  title: string;
  required?: boolean;
}

export function ArtworkImage({ smallSrc, fullSrc, title, required = false }: Props) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(smallSrc || fullSrc);
  const [fullReady, setFullReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setDisplaySrc(smallSrc || fullSrc);
    setFullReady(false);
    if (fullSrc && fullSrc !== smallSrc) {
      const img = new Image();
      img.src = fullSrc;
      img.onload = () => {
        setFullReady(true);
        setDisplaySrc(fullSrc);
      };
    }
  }, [smallSrc, fullSrc]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((prev) => {
      const next = prev - event.deltaY * 0.0015;
      return Math.min(4, Math.max(0.6, next));
    });
  };

  if (!displaySrc) {
    if (!required) return null;
    return <div className={styles.placeholder}>No image available for this piece.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.imageWrap}>
        <img src={displaySrc} alt={title} className={styles.image} />
      </div>
      <div className={styles.imageFooter}>
        <span>{title}</span>
        <div className={styles.actions}>
          {!fullReady && fullSrc ? <span className={styles.subtle}>Loading HD…</span> : null}
          {fullSrc ? (
            <button className={styles.button} onClick={() => setOpen(true)}>
              View full screen
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className={styles.modal} onWheel={handleWheel}>
          <div className={styles.modalControls}>
            <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}>-</button>
            <span>{zoom.toFixed(1)}x</span>
            <button onClick={() => setZoom((z) => Math.min(4, z + 0.2))}>+</button>
            <button onClick={() => setZoom(1)}>Reset</button>
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className={styles.modalBody}>
            <img
              src={fullSrc || displaySrc}
              alt={title}
              className={styles.modalImage}
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
