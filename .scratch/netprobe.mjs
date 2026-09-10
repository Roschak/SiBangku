// Focused network probe for a single page
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
    ws.onerror = (e) => reject(e);
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
  const bad = [];
  ws.onEvent((msg) => {
    if (msg.method === "Network.responseReceived") {
      const r = msg.params.response;
      const u = r.url;
      if (r.status >= 400 || (u.includes("brand") || u.includes("favicon"))) {
        bad.push(`HTTP ${r.status} ${r.mimeType} ${u.slice(0, 110)}`);
      }
    }
    if (msg.method === "Network.loadingFailed") {
      bad.push(`LOADFAIL ${msg.params.errorText} ${msg.params.type} cancelled=${msg.params.canceled}`);
    }
    if (msg.method === "Network.requestWillBeSent") {
      const u = msg.params.request.url;
      if (u.includes("brand") || u.includes("favicon")) {
        bad.push(`REQ ${u.slice(0, 110)}`);
      }
    }
  });
  await ws.send("Network.enable");
  await ws.send("Page.enable");
  await ws.send("Runtime.enable");
  await ws.send("Page.navigate", { url: "http://localhost:3000/" });
  await sleep(9000);

  const r = await ws.send("Runtime.evaluate", {
    expression: `JSON.stringify([...document.querySelectorAll('img')].map(i => ({ src: i.src, complete: i.complete, nw: i.naturalWidth, nh: i.naturalHeight })))`,
    returnByValue: true
  });
  console.log("IMG states:", r.result.value);

  // try loading logo via JS Image
  const r2 = await ws.send("Runtime.evaluate", {
    expression: `new Promise(res => { const im = new Image(); im.onload = () => res('load ok nw=' + im.naturalWidth); im.onerror = (e) => res('load ERROR'); im.src = '/brand/Navbar-Header-Logo.svg?t=' + Date.now(); })`,
    returnByValue: true, awaitPromise: true
  });
  console.log("Fresh img load:", r2.result.value);

  console.log("Network events:");
  console.log(bad.slice(0, 25).join("\n"));
  process.exit(0);
}
main();
