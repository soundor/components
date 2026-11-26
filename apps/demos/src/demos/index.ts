// Every demo, by the name a docs page gives `<Demo name>`: its file's.
import type { ComponentType } from 'react';

import Button from './button';
import ButtonDisabled from './button-disabled';
import ButtonLoading from './button-loading';
import ContextMenu from './context-menu';
import ControlGroup from './control-group';
import Divider from './divider';
import DropdownMenu from './dropdown-menu';
import EnvelopeEditor from './envelope-editor';
import EnvelopeEditorControlled from './envelope-editor-controlled';
import EqualizerReference from './equalizer-reference';
import Fader from './fader';
import FrequencyKeyboard from './frequency-keyboard';
import Gallery from './gallery';
import Knob from './knob';
import LevelMeter from './level-meter';
import LevelMeterStereo from './level-meter-stereo';
import MixedValues from './mixed-values';
import Panel from './panel';
import Plot from './plot';
import PlotAutomation from './plot-automation';
import PlotBars from './plot-bars';
import PlotCompressor from './plot-compressor';
import PlotEdit from './plot-edit';
import PlotEnvelope from './plot-envelope';
import PlotEq from './plot-eq';
import PlotSpectrum from './plot-spectrum';
import PlotWaveform from './plot-waveform';
import Popover from './popover';
import PopoverArrows from './popover-arrows';
import SegmentedControl from './segmented-control';
import Select from './select';
import SelectStates from './select-states';
import SelectableList from './selectable-list';
import Showcase from './showcase';
import Slider from './slider';
import Spectrogram from './spectrogram';
import SynthVoice from './synth-voice';
import TextField from './text-field';
import TextFieldStates from './text-field-states';
import TextFieldValidation from './text-field-validation';
import Toggle from './toggle';
import Tooltip from './tooltip';
import ValueField from './value-field';
import ValueFieldBoth from './value-field-both';
import ValueFieldOverflow from './value-field-overflow';
import ValueFieldPlain from './value-field-plain';
import ValueFieldPrefix from './value-field-prefix';
import XyPad from './xy-pad';
import XyPadFilter from './xy-pad-filter';

export const demos: Readonly<Record<string, ComponentType>> = {
  gallery: Gallery,
  'mixed-values': MixedValues,
  button: Button,
  'button-loading': ButtonLoading,
  'button-disabled': ButtonDisabled,
  toggle: Toggle,
  'segmented-control': SegmentedControl,
  select: Select,
  'selectable-list': SelectableList,
  'select-states': SelectStates,
  'dropdown-menu': DropdownMenu,
  'context-menu': ContextMenu,
  popover: Popover,
  'popover-arrows': PopoverArrows,
  tooltip: Tooltip,
  knob: Knob,
  showcase: Showcase,
  slider: Slider,
  fader: Fader,
  'text-field': TextField,
  'text-field-validation': TextFieldValidation,
  'text-field-states': TextFieldStates,
  'value-field': ValueField,
  'value-field-overflow': ValueFieldOverflow,
  'value-field-plain': ValueFieldPlain,
  'value-field-prefix': ValueFieldPrefix,
  'value-field-both': ValueFieldBoth,
  'level-meter': LevelMeter,
  plot: Plot,
  'xy-pad': XyPad,
  panel: Panel,
  'control-group': ControlGroup,
  divider: Divider,
  'plot-eq': PlotEq,
  'equalizer-reference': EqualizerReference,
  'plot-edit': PlotEdit,
  'plot-spectrum': PlotSpectrum,
  spectrogram: Spectrogram,
  'frequency-keyboard': FrequencyKeyboard,
  'plot-bars': PlotBars,
  'plot-compressor': PlotCompressor,
  'plot-envelope': PlotEnvelope,
  'plot-waveform': PlotWaveform,
  'plot-automation': PlotAutomation,
  'xy-pad-filter': XyPadFilter,
  'envelope-editor': EnvelopeEditor,
  'envelope-editor-controlled': EnvelopeEditorControlled,
  'synth-voice': SynthVoice,
  'level-meter-stereo': LevelMeterStereo,
};
