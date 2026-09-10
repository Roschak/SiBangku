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
  const ids = new Map();
  ws.onEvent((msg) => {
    if (msg.method === "Network.requestWillBeSent") {
      if (msg.params.request.url.includes("Navbar") || msg.params.request.url.includes("styles.css")) {
        ids.set(msg.params.requestId, msg.params.request.url.split("/").pop());
      }
    }
    if (msg.method === "Network.responseReceivedExtraInfo") {
      const label = ids.get(msg.params.requestId);
      if (label) {
        const hd = msg.params.headers;
        console.log(`\n[${label}] status=${msg.params.statusCode}`);
        for (const [k, v] of Object.entries(hd)) {
          if (/content-type|content-encoding|:status/i.test(k)) console.log(`  ${k}: ${v}`);
        }
      }
    }
    if (msg.method === "Network.responseReceived") {
      const label = ids.get(msg.params.requestId);
      if (label) console.log(`responseReceived ${label} status=${msg.params.response.status} mime=${msg.params.response.mimeType}`);
    }
  });
  await ws.send("Network.enable");
  await ws.send("Page.enable");
  await ws.send("Page.navigate", { url: "http://localhost:3000/" });
  await sleep(8000);
  process.exit(0);
}
main();
