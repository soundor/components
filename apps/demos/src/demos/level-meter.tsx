import { LevelMeter } from '@soundor/components';
import { useEffect, useState } from 'react';

export default function Demo() {
  const [levels, setLevels] = useState<[number, number]>([-18, -22]);
  useEffect(() => {
    let t = 0;
    const timer = setInterval(() => {
      t += 0.12;
      setLevels([
        -14 + Math.sin(t) * 12 + (Math.random() - 0.5) * 6,
        -18 + Math.sin(t * 1.3 + 1) * 12 + (Math.random() - 0.5) * 6,
      ]);
    }, 50);
    return () => clearInterval(timer);
  }, []);
  return (
    <LevelMeter
      label="Output"
      value={levels}
      min={-60}
      max={6}
      clipAt={0}
      orientation="horizontal"
      length={220}
    />
  );
}
