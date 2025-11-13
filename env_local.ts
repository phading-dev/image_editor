import "./env_const";
import { ENV_VARS } from "./env_vars";

ENV_VARS.projectId = "image-editor-477100";
ENV_VARS.enableHttps = false;
ENV_VARS.externalDomain = "localhost";
ENV_VARS.httpPort = 8080;
ENV_VARS.externalOrigin = `http://${ENV_VARS.externalDomain}:${ENV_VARS.httpPort}`;
