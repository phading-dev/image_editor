import { ServiceDescriptor, RemoteCallDescriptor } from '@selfage/service_descriptor';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export let VERTEX_GEMINI_SERVICE: ServiceDescriptor = {
  name: "VertexGeminiService",
  path: "/vertexGemini",
}

export interface GenerateContentRequestBody {
  model?: string,
  contentsJson?: string,
  systemInstructionJson?: string,
  generationConfigJson?: string,
  safetySettingsJson?: string,
  cachedContentName?: string,
  toolsJson?: string,
}

export let GENERATE_CONTENT_REQUEST_BODY: MessageDescriptor<GenerateContentRequestBody> = {
  name: 'GenerateContentRequestBody',
  fields: [{
    name: 'model',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'contentsJson',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'systemInstructionJson',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'generationConfigJson',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'safetySettingsJson',
    index: 5,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'cachedContentName',
    index: 6,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'toolsJson',
    index: 7,
    primitiveType: PrimitiveType.STRING,
  }],
};

export interface GenerateContentResponse {
  responseJson?: string,
}

export let GENERATE_CONTENT_RESPONSE: MessageDescriptor<GenerateContentResponse> = {
  name: 'GenerateContentResponse',
  fields: [{
    name: 'responseJson',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export let GENERATE_CONTENT: RemoteCallDescriptor = {
  name: "GenerateContent",
  service: VERTEX_GEMINI_SERVICE,
  path: "/GenerateContent",
  body: {
    messageType: GENERATE_CONTENT_REQUEST_BODY,
  },
  response: {
    messageType: GENERATE_CONTENT_RESPONSE,
  },
}
