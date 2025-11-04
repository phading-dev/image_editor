import { WebServiceClient } from "@selfage/web_service_client";
import { LocalSessionStorage } from "@selfage/web_service_client/local_session_storage";

export let SERVICE_CLIENT = WebServiceClient.create(
  new LocalSessionStorage(),
  window.location.origin,
);
