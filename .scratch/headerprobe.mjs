const CDP = "http://localhost:9222";
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const listeners = [];
    ws.onopen = () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const mid = ++id;
          pending.set(mid, { res, rej });
          ws.send(JSON.stringify({ id: mid, method, params }));
        });
      },
      onEvent(fn) { listeners.push(fn); },
      close() { ws.close(); }
    });
    ws.onerror = reject;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) {
        listeners.forEach(fn => fn(msg));
      }
    };
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  const tab = await res.json();
  const ws = await connect(tab.webSocketDebuggerUrl);
  ws.onEvent((msg) => {
    if (msg.method === "Network.responseReceived") {
      const r = msg.params.response;
      if (r.url.includes("Navbar-Header-Logo.svg")) {
        console.log("URL:", r.url);
        console.log("mimeType:", r.mimeType);
        console.log("content-type header:", r.headers["content-type"]);
        console.log("status:", r.status);
      }
    }
  });
  await ws.send("Network.enable");
  await ws.send("Page.enable");
  await ws.send("Runtime.enable");
  await ws.send("Page.navigate", { url: "http://localhost:3000/" });
  await sleep(7000);
  // force reload to guarantee we see the fetch
  await ws.send("Page.reload", { ignoreCache: true });
  await sleep(6000);
  process.exit(0);
}
main();
