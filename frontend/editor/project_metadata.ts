import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface Transform {
  translateX?: number,
  translateY?: number,
  scaleX?: number,
  scaleY?: number,
  rotation?: number,
}

export let TRANSFORM: MessageDescriptor<Transform> = {
  name: 'Transform',
  fields: [{
    name: 'translateX',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'translateY',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'scaleX',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'scaleY',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'rotation',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface Shadow {
  color?: string,
  blur?: number,
  offsetX?: number,
  offsetY?: number,
}

export let SHADOW: MessageDescriptor<Shadow> = {
  name: 'Shadow',
  fields: [{
    name: 'color',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'blur',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'offsetX',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'offsetY',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface BasicText {
  content?: string,
  fontFamily?: string,
  fontSize?: number,
  fontWeight?: string,
  fontStyle?: string,
  color?: string,
  textAlign?: string,
  lineHeight?: number,
  letterSpacing?: number,
}

export let BASIC_TEXT: MessageDescriptor<BasicText> = {
  name: 'BasicText',
  fields: [{
    name: 'content',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'fontFamily',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'fontSize',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'fontWeight',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'fontStyle',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'color',
    index: 6,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'textAlign',
    index: 7,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'lineHeight',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'letterSpacing',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface Layer {
  id?: string,
  name?: string,
  visible?: boolean,
  opacity?: number,
  locked?: boolean,
  transform?: Transform,
  width?: number,
  height?: number,
  shadow?: Shadow,
  basicText?: BasicText,
}

export let LAYER: MessageDescriptor<Layer> = {
  name: 'Layer',
  fields: [{
    name: 'id',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'name',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'visible',
    index: 3,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'opacity',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'locked',
    index: 5,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'transform',
    index: 6,
    messageType: TRANSFORM,
  }, {
    name: 'width',
    index: 7,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'height',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'shadow',
    index: 9,
    messageType: SHADOW,
  }, {
    name: 'basicText',
    index: 10,
    messageType: BASIC_TEXT,
  }],
};

export interface PaintToolSettings {
  brushSize?: number,
}

export let PAINT_TOOL_SETTINGS: MessageDescriptor<PaintToolSettings> = {
  name: 'PaintToolSettings',
  fields: [{
    name: 'brushSize',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface EraseToolSettings {
  brushSize?: number,
}

export let ERASE_TOOL_SETTINGS: MessageDescriptor<EraseToolSettings> = {
  name: 'EraseToolSettings',
  fields: [{
    name: 'brushSize',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface FuzzyMaskSelectionToolSettings {
  tolerance?: number,
  contiguous?: boolean,
  sampleAllLayers?: boolean,
}

export let FUZZY_MASK_SELECTION_TOOL_SETTINGS: MessageDescriptor<FuzzyMaskSelectionToolSettings> = {
  name: 'FuzzyMaskSelectionToolSettings',
  fields: [{
    name: 'tolerance',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'contiguous',
    index: 2,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'sampleAllLayers',
    index: 3,
    primitiveType: PrimitiveType.BOOLEAN,
  }],
};

export interface ProjectSettings {
  foregroundColor?: string,
  backgroundColor?: string,
  paintToolSettings?: PaintToolSettings,
  fuzzyMaskSelectionToolSettings?: FuzzyMaskSelectionToolSettings,
  eraseToolSettings?: EraseToolSettings,
}

export let PROJECT_SETTINGS: MessageDescriptor<ProjectSettings> = {
  name: 'ProjectSettings',
  fields: [{
    name: 'foregroundColor',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'backgroundColor',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'paintToolSettings',
    index: 3,
    messageType: PAINT_TOOL_SETTINGS,
  }, {
    name: 'fuzzyMaskSelectionToolSettings',
    index: 4,
    messageType: FUZZY_MASK_SELECTION_TOOL_SETTINGS,
  }, {
    name: 'eraseToolSettings',
    index: 5,
    messageType: ERASE_TOOL_SETTINGS,
  }],
};

export interface ProjectMetadata {
  name?: string,
  width?: number,
  height?: number,
  layers?: Array<Layer>,
  settings?: ProjectSettings,
}

export let PROJECT_METADATA: MessageDescriptor<ProjectMetadata> = {
  name: 'ProjectMetadata',
  fields: [{
    name: 'name',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'width',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'height',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'layers',
    index: 4,
    messageType: LAYER,
    isArray: true,
  }, {
    name: 'settings',
    index: 5,
    messageType: PROJECT_SETTINGS,
  }],
};
