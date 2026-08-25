import indexHtml from "./index.html";
import { parseVideoProfile } from "./adapters/index.js";
import { normalizeShareUrl } from "./lib.js";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

async function handleProfileRequest(request, env) {
  try {
    const body = await request.json();
    const shareUrl = normalizeShareUrl(body.url);
    const profile = await parseVideoProfile(shareUrl, env);
    return json(profile);
  } catch (error) {
    console.error(error);
    return json({ error: error.message || "解析失败" }, 400);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(indexHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    if (
      url.pathname === "/api/fetch_video_profile" &&
      request.method === "POST"
    ) {
      return handleProfileRequest(request, env);
    }
    return new Response("not found", { status: 404 });
  },
};
