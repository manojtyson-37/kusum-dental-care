import { useEffect } from 'react';

const MAX_DEG = 8;

// Event-delegated 3D mouse-tilt: any element with class "tilt-3d" gets a
// perspective rotation following the cursor, reset smoothly on pointer
// leave. Delegated on document so it works regardless of when a card
// mounts (carousels, lazy sections) without per-component wiring.
export default function useTilt3D() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(hover: none)').matches) return undefined; // skip touch devices

    let current = null;

    function onMove(e) {
      const el = e.target.closest?.('.tilt-3d');
      if (el !== current) {
        if (current) resetEl(current);
        current = el;
      }
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-ny * MAX_DEG).toFixed(2)}deg) rotateY(${(nx * MAX_DEG).toFixed(2)}deg) translateZ(6px)`;
    }

    function resetEl(el) {
      el.style.transform = '';
    }

    function onLeave(e) {
      const el = e.target.closest?.('.tilt-3d');
      if (el) resetEl(el);
      if (el === current) current = null;
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave, true);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave, true);
      if (current) resetEl(current);
    };
  }, []);
}
