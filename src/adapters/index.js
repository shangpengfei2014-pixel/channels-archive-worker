import { parseWithCustomApi } from "./custom-api.js";
import { parseWithPrototype } from "./prototype.js";

export function parseVideoProfile(shareUrl, env) {
  if (env.PROFILE_API_URL) {
    return parseWithCustomApi(shareUrl, env);
  }
  return parseWithPrototype(shareUrl, env);
}
