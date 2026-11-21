import {
  EnvelopeEditor,
  SegmentedControl,
  Toggle,
  type ADSREnvelope,
} from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { Text, View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const theme = useTheme();
  const [envelope, setEnvelope] = useState<ADSREnvelope>({
    attack: 0.02,
    decay: 0.3,
    sustain: 0.65,
    release: 0.8,
  });
  const [scale, setScale] = useState<'log' | 'linear'>('log');
  const [grid, setGrid] = useState(true);
  return (
    <View style={{ gap: 12 }}>
      <EnvelopeEditor
        title="Filter envelope"
        color="lime"
        value={envelope}
        onChange={setEnvelope}
        timeRange={[0.001, 4]}
        timeScale={scale}
        grid={grid}
        width={420}
        height={180}
      />
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <SegmentedControl
          label="Time scale"
          size="sm"
          value={scale}
          onChange={setScale}
          options={[
            { value: 'log', label: 'Log' },
            { value: 'linear', label: 'Linear' },
          ]}
        />
        <Toggle label="Grid" size="sm" value={grid} onChange={setGrid} />
        <Text
          style={{
            fontFamily: theme.font.mono,
            fontSize: 10,
            color: theme.color.textMuted,
          }}
        >
          {`{ a: ${envelope.attack.toFixed(3)}, d: ${envelope.decay.toFixed(3)}, s: ${envelope.sustain.toFixed(2)}, r: ${envelope.release.toFixed(3)} }`}
        </Text>
      </View>
    </View>
  );
}
