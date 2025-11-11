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

export interface Layer {
  id?: string,
  name?: string,
  visible?: boolean,
  opacity?: number,
  locked?: boolean,
  transform?: Transform,
  width?: number,
  height?: number,
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
  }],
};

export interface PaintToolSettings {
  brushSize?: number,
  brushColor?: string,
  strokeWidth?: number,
}

export let PAINT_TOOL_SETTINGS: MessageDescriptor<PaintToolSettings> = {
  name: 'PaintToolSettings',
  fields: [{
    name: 'brushSize',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'brushColor',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'strokeWidth',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export interface ProjectSettings {
  foregroundColor?: string,
  backgroundColor?: string,
  paintToolSettings?: PaintToolSettings,
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
