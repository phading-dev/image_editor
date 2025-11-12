import { GenerateContentHandlerInterface } from "../service_interface/handler";
import {
  GenerateContentRequestBody,
  GenerateContentResponse,
} from "../service_interface/interface";
import { VERTEX_AI_CLIENT } from "./vertex_ai_client";
import {
  GenerateContentRequest,
  ModelParams,
  VertexAI,
} from "@google-cloud/vertexai";
import { newBadRequestError } from "@selfage/http_error";

export class GenerateContentHandler extends GenerateContentHandlerInterface {
  public static create(): GenerateContentHandler {
    return new GenerateContentHandler(VERTEX_AI_CLIENT);
  }

  public constructor(private vertexAiClient: VertexAI) {
    super();
  }

  public async handle(
    loggingPrefix: string,
    body: GenerateContentRequestBody,
  ): Promise<GenerateContentResponse> {
    console.log(`${loggingPrefix} Handling generate content request.`);
    if (!body.model) {
      throw newBadRequestError("Model is required.");
    }
    let contents = this.parseJson(body.contentsJson, "contentsJson");
    let systemInstruction = this.parseJson(
      body.systemInstructionJson,
      "systemInstructionJson",
    );
    let generationConfig = this.parseJson(
      body.generationConfigJson,
      "generationConfigJson",
    );
    let safetySettings = this.parseJson(
      body.safetySettingsJson,
      "safetySettingsJson",
    );
    let tools = this.parseJson(body.toolsJson, "toolsJson");
    let modelOptions: ModelParams = {
      model: body.model,
    };
    if (systemInstruction) {
      modelOptions.systemInstruction = systemInstruction as any;
    }
    if (generationConfig) {
      modelOptions.generationConfig = generationConfig;
    }
    if (safetySettings) {
      modelOptions.safetySettings = safetySettings as any;
    }
    let generativeModel = this.vertexAiClient.getGenerativeModel(modelOptions);
    let requestPayload: GenerateContentRequest = {
      contents: contents as any,
    };
    if (body.cachedContentName) {
      requestPayload.cachedContent = body.cachedContentName;
    }
    if (tools) {
      requestPayload.tools = tools as any;
    }
    let responsePayload = await generativeModel.generateContent(requestPayload);
    return {
      responseJson: JSON.stringify(responsePayload.response),
    };
  }

  private parseJson(
    value: string | undefined,
    fieldName: string,
  ): unknown | undefined {
    if (value == null || value === "") {
      return undefined;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      throw newBadRequestError(
        `Failed to parse ${fieldName}: ${(error as Error).message}`,
      );
    }
  }
}
