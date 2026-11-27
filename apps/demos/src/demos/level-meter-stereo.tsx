import { LevelMeter } from '@soundor/components';
import { useEffect, useState } from 'react';

export default function Demo() {
  const [levels, setLevels] = useState<[number, number]>([-20, -24]);
  useEffect(() => {
    let t = 0;
    const timer = setInterval(() => {
      t += 0.14;
      const hit = Math.max(0, Math.sin(t * 2)) ** 4;
      setLevels([
        -30 + hit * 34 + (Math.random() - 0.5) * 4,
        -32 + hit * 32 + (Math.random() - 0.5) * 4,
      ]);
    }, 50);
    return () => clearInterval(timer);
  }, []);
  // One value per channel; the peaks hold, then fall.
  return (
    <LevelMeter
      label="Master"
      value={levels}
      channelLabels={['left', 'right']}
      min={-60}
      max={6}
      warningAt={-6}
      clipAt={0}
      ticks={[-48, -36, -24, -12, -6, 0]}
      peakHold={1.5}
      fallRate={18}
      length={190}
    />
  );
}
