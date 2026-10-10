import { useEffect, useRef, useState } from 'react';

/** Animates a number up to `target` (ease-out). */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = Date.now();
    const origin = from.current;
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const current = Math.round(origin + (target - origin) * (1 - (1 - t) ** 3));
      from.current = current;
      setValue(current);
      if (t >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [target, duration]);
  return value;
}
