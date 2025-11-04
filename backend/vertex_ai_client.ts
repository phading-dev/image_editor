import { VertexAI } from "@google-cloud/vertexai";
import { ENV_VARS } from "../env_vars";

export let VERTEX_AI_CLIENT = new VertexAI({
  project: ENV_VARS.projectId,
  location: ENV_VARS.vertexLocation,
});
