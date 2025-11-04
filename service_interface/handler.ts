import { GenerateContentRequestBody, GENERATE_CONTENT, GenerateContentResponse } from './interface';
import { RemoteCallHandlerInterface } from '@selfage/service_descriptor/remote_call_handler_interface';

export abstract class GenerateContentHandlerInterface implements RemoteCallHandlerInterface {
  public descriptor = GENERATE_CONTENT;
  public abstract handle(
    loggingPrefix: string,
    body: GenerateContentRequestBody,
  ): Promise<GenerateContentResponse>;
}
