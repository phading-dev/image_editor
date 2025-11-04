export interface EnvVars {
  projectId?: string;
  vertexLocation?: string;
  geminiModel?: string;
  gcsSecretBucketName?: string;
  sslPrivateKeyFile?: string;
  sslCertificateFile?: string;
  externalOrigin?: string;
  externalDomain?: string;
  httpsPort?: number;
  httpPort?: number;
}

export const ENV_VARS: EnvVars = {};
