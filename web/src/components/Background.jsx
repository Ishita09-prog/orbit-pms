import { useEffect, useRef } from 'react';
import { BACKGROUND } from '../lib/constants.js';

/**
 * Full-screen living background: drifting colour fields, a slowly moving grid and a soft spotlight that
 * follows the pointer. To use your own artwork instead, set VITE_BG_IMAGE or VITE_BG_VIDEO (see web/.env.example).
 */
export default function Background() {
  const root = useRef(null);
  const hasMedia = Boolean(BACKGROUND.video || BACKGROUND.image);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return undefined;
    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`);
        el.style.setProperty('--my', `${e.clientY}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="bg-root" ref={root} aria-hidden="true">
      {BACKGROUND.video && <video className="bg-media" src={BACKGROUND.video} autoPlay muted loop playsInline />}
      {!BACKGROUND.video && BACKGROUND.image && <img className="bg-media" src={BACKGROUND.image} alt="" />}
      {hasMedia ? (
        <div className="bg-overlay" />
      ) : (
        <>
          <div className="bg-blob b1" />
          <div className="bg-blob b2" />
          <div className="bg-blob b3" />
          <div className="bg-blob b4" />
          <div className="bg-grid" />
        </>
      )}
      <div className="bg-spot" />
      <div className="bg-grain" />
    </div>
  );
}
