export async function parseWithCustomApi(shareUrl, env) {
  const headers = { "Content-Type": "application/json" };
  if (env.PROFILE_API_TOKEN) {
    headers.Authorization = `Bearer ${env.PROFILE_API_TOKEN}`;
  }
  const response = await fetch(env.PROFILE_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ url: shareUrl }),
  });
  if (!response.ok) {
    throw new Error(`自研解析接口暂时不可用 (${response.status})`);
  }
  return response.json();
}
