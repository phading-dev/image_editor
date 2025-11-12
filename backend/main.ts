import express = require("express");
import expressStaticGzip = require("express-static-gzip");
import getStream = require("get-stream");
import http = require("http");
import https = require("https");
import { ENV_VARS } from "../env_vars";
import { VERTEX_GEMINI_SERVICE } from "../service_interface/interface";
import { GenerateContentHandler } from "./generate_content_handler";
import { STORAGE_CLIENT } from "./storage_client";
import { ServiceHandler } from "@selfage/service_handler/service_handler";

async function main(): Promise<void> {
  if (ENV_VARS.enableHttps) {
    let [sslPrivateKey, sslCertificate] = await Promise.all([
      getStream(
        STORAGE_CLIENT.bucket(ENV_VARS.gcsSecretBucketName)
          .file(ENV_VARS.sslPrivateKeyFile)
          .createReadStream(),
      ),
      getStream(
        STORAGE_CLIENT.bucket(ENV_VARS.gcsSecretBucketName)
          .file(ENV_VARS.sslCertificateFile)
          .createReadStream(),
      ),
    ]);
    let app = express();
    let service = ServiceHandler.create(
      https.createServer({
        key: sslPrivateKey,
        cert: sslCertificate,
      }),
      ENV_VARS.externalOrigin,
      app,
    );
    service
      .addCorsAllowedPreflightHandler()
      .addHandlerRegister(VERTEX_GEMINI_SERVICE)
      .add(GenerateContentHandler.create());

    // Web UI
    app.get("/*", (req, res, next) => {
      console.log(`Received GET request at ${req.originalUrl}.`);
      if (req.hostname !== ENV_VARS.externalDomain) {
        res.redirect(`${ENV_VARS.externalOrigin}${req.path}`);
      } else {
        next();
      }
    });
    app.use(
      "/",
      expressStaticGzip(process.argv[2], {
        serveStatic: {
          extensions: ["html"],
          fallthrough: false,
        },
      }),
    );
    service.start(ENV_VARS.httpsPort);

    // HTTP server that redirects to HTTPS
    let redirectApp = express();
    redirectApp.get("/*", (req, res) => {
      res.redirect(`${ENV_VARS.externalOrigin}${req.path}`);
    });
    let httpServer = http.createServer(redirectApp);
    httpServer.listen(ENV_VARS.httpPort, () => {
      console.log(`Server is listening on port ${ENV_VARS.httpPort}.`);
    });
  } else {
    let app = express();
    let service = ServiceHandler.create(http.createServer(), "*", app);
    service
      .addCorsAllowedPreflightHandler()
      .addHandlerRegister(VERTEX_GEMINI_SERVICE)
      .add(GenerateContentHandler.create());

    // Web UI
    app.use(
      "/",
      expressStaticGzip(process.argv[2], {
        serveStatic: {
          extensions: ["html"],
          fallthrough: false,
        },
      }),
    );
    service.start(ENV_VARS.httpPort);
  }
}

main();
