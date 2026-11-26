import {
  Button,
  FrequencyKeyboard,
  Plot,
  formatters,
} from '@soundor/components';
import { useTheme } from '@soundor/components/theme';
import { View } from '@soundor/react';
import { useState } from 'react';

export default function Demo() {
  const theme = useTheme();
  const [close, zoom] = useState(false);
  const range = close ? ([200, 900] as const) : ([55, 3520] as const);
  return (
    <View style={{ gap: theme.spacing.spaceSm }}>
      <Plot
        width={430}
        height={155}
        title="Pitch reference"
        accessibilityLabel="Pitch scale with a guide at 440 Hz"
      >
        <Plot.XAxis id="frequency" domain={range} scale="log" hidden />
        <Plot.Grid xAxis="frequency" />
        <Plot.VerticalLine
          xAxis="frequency"
          value={440}
          label={formatters.frequency(440)}
        />
        <Plot.FrequencyKeyboard
          xAxis="frequency"
          highlightedNotes={[69]}
          showNotes={close}
        />
      </Plot>
      <FrequencyKeyboard
        width={430}
        frequencyRange={range}
        highlightedRange={[220, 440]}
      />
      <Button onPress={() => zoom(!close)}>
        {close ? 'Zoom out' : 'Zoom in'}
      </Button>
    </View>
  );
}
