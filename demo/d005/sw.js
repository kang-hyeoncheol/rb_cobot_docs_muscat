// DEMO 서비스 워커(scope = 이 폴더). 정식 FE의 절대경로·서비스 주소 요청을 정적 호스팅 안으로 돌린다.
const SCOPE = new URL(self.registration.scope);
const ROOT_MAP = [
  [/^\/(assets|plugin-shared)\//, "app"],
];
const ROOT_FILES = { "/version.json": "version.json", "/hostinfo.json": "app/hostinfo.json" };
const seen = [];
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("message", (e) => {
  if (e.data?.type === "claim") self.clients.claim();
  if (e.data?.type === "log") e.source.postMessage({ type: "log", seen });
});
const cors = (origin) => ({ "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Credentials": "true", "Content-Type": "application/json" });

async function rest(event, url) {
  const all = await self.clients.matchAll({ type: "window" });
  const client = (event.clientId && (await self.clients.get(event.clientId))) || all[0];
  const win = all.find((c) => c.id === client?.id && c.type === "window") || all[0];
  if (!win) return new Response("{}", { status: 503, headers: cors() });
  let body;
  const text = ["GET", "HEAD"].includes(event.request.method) ? "" : await event.request.text();
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
  const origin = event.request.headers.get("origin") || "*";
  const ch = new MessageChannel();
  const reply = new Promise((res) => (ch.port1.onmessage = (m) => res(m.data)));
  win.postMessage({ type: "rest", method: event.request.method, path: url.pathname, query: url.search, body }, [ch.port2]);
  const r = await Promise.race([reply, new Promise((res) => setTimeout(() => res({ status: 504, body: "{}" }), 10000))]);
  return new Response(r.body, { status: r.status, headers: cors(origin) });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    const restPrefix = SCOPE.pathname + "__rest/"; // 로더가 http://<host>:3000 요청을 이 경로로 돌려 보낸다(HTTPS mixed content 회피)
    if (url.pathname.startsWith(restPrefix)) {
      if (event.request.method === "OPTIONS") return event.respondWith(new Response(null, { status: 204, headers: { ...cors(event.request.headers.get("origin")), "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } }));
      const restUrl = new URL(url.href); restUrl.pathname = "/" + url.pathname.slice(restPrefix.length);
      return event.respondWith(rest(event, restUrl));
    }
    if (url.pathname.startsWith(SCOPE.pathname)) return; // 이미 하위 경로
    // 게시 리비전의 시나리오(로더의 ?scenarios=): 이 DEMO 폴더 밖이지만 같은 출처의 정적 JSON 이라 그대로 통과시킨다.
    if (event.request.method === "GET" && /^\/[\w\-./]*\/demo\/scenarios\/[\w-]+\.json$/.test(url.pathname) && !url.pathname.includes("..")) return;
    const file = ROOT_FILES[url.pathname];
    if (file) return event.respondWith(fetch(new URL(file, SCOPE)));
    for (const [re, dir] of ROOT_MAP) if (re.test(url.pathname)) return event.respondWith(fetch(new URL(dir + url.pathname, SCOPE).href, { headers: event.request.headers }));
    seen.push("same-origin-unmapped " + url.pathname);
    return event.respondWith(new Response("not found", { status: 404 }));
  }
  if (url.port === "3000") {
    if (event.request.method === "OPTIONS") return event.respondWith(new Response(null, { status: 204, headers: { ...cors(event.request.headers.get("origin")), "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" } }));
    return event.respondWith(rest(event, url));
  }
  if (url.hostname === "api.ipify.org") return event.respondWith(new Response(JSON.stringify({ ip: "127.0.0.1" }), { headers: cors(event.request.headers.get("origin")) }));
  seen.push("external-blocked " + event.request.url);
  event.respondWith(new Response("blocked", { status: 503, headers: cors(event.request.headers.get("origin")) }));
});
