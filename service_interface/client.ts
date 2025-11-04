import { GenerateContentRequestBody, GenerateContentResponse, GENERATE_CONTENT } from './interface';
import { ClientRequestInterface } from '@selfage/service_descriptor/client_request_interface';

export function newGenerateContentRequest(
  body: GenerateContentRequestBody,
): ClientRequestInterface<GenerateContentResponse> {
  return {
    descriptor: GENERATE_CONTENT,
    body,
  };
}
