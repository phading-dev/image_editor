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

export interface Project {
  name?: string,
  layers?: Array<Layer>,
}

export let PROJECT: MessageDescriptor<Project> = {
  name: 'Project',
  fields: [{
    name: 'name',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'layers',
    index: 2,
    messageType: LAYER,
    isArray: true,
  }],
};
