import { Button } from '@soundor/components';
import { View } from '@soundor/react';
import { useEffect, useState } from 'react';

export default function Demo() {
  const [saving, setSaving] = useState<'accent' | 'surface' | null>(null);
  // Stands in for work that takes a while: a save, a preset load, a render.
  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => setSaving(null), 2000);
    return () => clearTimeout(timer);
  }, [saving]);
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Button
        variant="accent"
        loading={saving === 'accent'}
        onPress={() => setSaving('accent')}
      >
        Save preset
      </Button>
      <Button
        loading={saving === 'surface'}
        onPress={() => setSaving('surface')}
      >
        Render
      </Button>
      <Button loading>Always busy</Button>
    </View>
  );
}
