import "./env_const";
import { ENV_VARS } from "./env_vars";

ENV_VARS.geminiModel = "gemini-2.5-pro";
ENV_VARS.projectId = "phading-prod-image-editor";
ENV_VARS.gcsSecretBucketName = "phading-prod-image-editor";
ENV_VARS.externalDomain = "www.phading.com";
ENV_VARS.externalOrigin = `https://${ENV_VARS.externalDomain}`;
