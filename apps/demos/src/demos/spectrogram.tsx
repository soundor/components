import {
  Button,
  Spectrogram,
  type PlotSource,
  type SpectrumFrame,
} from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { View } from '@soundor/react';
import { useEffect, useState } from 'react';

function simulate() {
  const values = new Float32Array(512).fill(-90);
  const listeners = new Set<() => void>();
  const frame: SpectrumFrame = { values, frequencyRange: [0, 24000] };
  const source: PlotSource<SpectrumFrame> = {
    get: () => frame,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    source,
    step(t: number) {
      const pitch = 45 * 18 ** ((Math.sin(t) + 1) / 2);
      for (let i = 1; i < values.length; i++) {
        const hz = (24000 * i) / (values.length - 1);
        const harmonic = hz / pitch;
        values[i] =
          -83 +
          (66 * Math.exp(-((harmonic - Math.round(harmonic)) ** 2) * 64)) /
            Math.max(1, harmonic ** 0.55);
      }
      listeners.forEach((listener) => listener());
    },
  };
}

export default function Demo() {
  const theme = useTheme();
  const [simulation] = useState(simulate);
  const [resetKey, reset] = useState(0);
  const [vertical, setVertical] = useState(false);
  useEffect(() => {
    let t = 0;
    const timer = setInterval(() => simulation.step((t += 0.03)), 33);
    return () => clearInterval(timer);
  }, [simulation]);
  return (
    <View style={{ gap: theme.spacing.spaceSm }}>
      <Spectrogram
        accessibilityLabel="Simulated spectrogram"
        width={400}
        height={185}
        source={simulation.source}
        resetKey={resetKey}
        orientation={vertical ? 'vertical' : 'horizontal'}
      />
      <View style={{ flexDirection: 'row', gap: theme.spacing.spaceSm }}>
        <Button onPress={() => reset(resetKey + 1)}>Clear history</Button>
        <Button onPress={() => setVertical(!vertical)}>
          Change orientation
        </Button>
      </View>
    </View>
  );
}
