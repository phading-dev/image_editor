import "./env_const";
import { ENV_VARS } from "./env_vars";

ENV_VARS.projectId = "image-editor-477100";
ENV_VARS.enableHttps = true;
ENV_VARS.gcsSecretBucketName = "phading-image-editor-prod-secrets";
ENV_VARS.externalDomain = "layra.app";
ENV_VARS.externalOrigin = `https://${ENV_VARS.externalDomain}`;
ENV_VARS.httpPort = 80;
ENV_VARS.httpsPort = 443;
