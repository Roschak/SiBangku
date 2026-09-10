// Probe /control-admin login flow in the running app.
// Fills dummy credentials and watches console/network/behavior.
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

  const events = [];
  ws.onEvent((msg) => {
    if (msg.method === "Runtime.consoleAPICalled") {
      const args = (msg.params.args || []).map(a => a.value !== undefined ? a.value : a.description).join(" ");
      events.push(`CONSOLE[${msg.params.type}]: ${args.slice(0, 300)}`);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      events.push(`EXCEPTION: ${d.text} ${d.exception ? d.exception.description : ""}`.slice(0, 400));
    }
    if (msg.method === "Network.responseReceived") {
      const r = msg.params.response;
      if (r.status >= 400) events.push(`HTTP ${r.status} ${r.url.slice(0, 120)}`);
    }
  });

  await ws.send("Network.enable");
  await ws.send("Page.enable");
  await ws.send("Runtime.enable");
  await ws.send("Page.navigate", { url: "http://localhost:3000/admin" });
  await sleep(8000);

  const state = await ws.send("Runtime.evaluate", {
    expression: `JSON.stringify({
      hasForm: !!document.querySelector('form'),
      hasBtn: !!document.querySelector('button[type=submit]'),
      tenantCode: !!document.getElementById('tenantCode'),
      loginEmail: !!document.getElementById('loginEmail'),
      loginPassword: !!document.getElementById('loginPassword'),
      btnText: document.querySelector('button[type=submit]')?.innerText,
      blazor: typeof window.Blazor !== 'undefined' ? 'yes' : 'no',
      bodyHead: document.body?.innerText.slice(0, 120)
    })`,
    returnByValue: true
  });
  console.log("STATE:", state.result.value);

  // Fill the form and submit
  const r2 = await ws.send("Runtime.evaluate", {
    expression: `(async () => {
      const tc = document.getElementById('tenantCode');
      const u = document.getElementById('loginEmail');
      const p = document.getElementById('loginPassword');
      if (!tc || !u || !p) return 'inputs missing';
      const setVal = (el, v) => {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal(tc, 'KOMIKCAFFE');
      setVal(u, 'roschakhck@gmail.com');
      setVal(p, '12345');
      await new Promise(r => setTimeout(r, 1200));
      const btn = document.querySelector('button[type=submit]');
      btn.click();
      return 'clicked';
    })()`,
    returnByValue: true, awaitPromise: true
  });
  console.log("CLICK:", r2.result.value);

  await sleep(7000);

  const after = await ws.send("Runtime.evaluate", {
    expression: `JSON.stringify({
      url: location.href,
      bodyText: document.body.innerText.slice(0, 600),
      errorAlert: document.querySelector('.ms-alert-danger')?.innerText || null
    })`,
    returnByValue: true
  });
  console.log("AFTER:", after.result.value);
  console.log("EVENTS:\n" + events.slice(0, 40).join("\n"));

  await fetch(`${CDP}/json/close/${tab.id}`);
}

main().catch(e => { console.error(e); process.exit(1); });
