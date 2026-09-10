// CDP page inspector: opens each page, collects console/page errors,
// and runs layout heuristics to surface untidy UI details.
const CDP = "http://localhost:9222";

async function getWs(url) {
  const res = await fetch(url);
  return res.json();
}

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

async function newTab(url) {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  return res.json();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function inspectPage(url, name, { waitFor } = {}) {
  const tab = await newTab("about:blank");
  const ws = await connect(tab.webSocketDebuggerUrl);
  const consoleMsgs = [];
  const errors = [];
  ws.onEvent((msg) => {
    if (msg.method === "Runtime.consoleAPICalled") {
      const text = msg.params.args.map(a => a.value ?? a.description ?? "").join(" ");
      consoleMsgs.push(`[${msg.params.type}] ${text}`);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description ?? ""));
    }
    if (msg.method === "Log.entryAdded" && ["error", "warning"].includes(msg.params.entry.level)) {
      errors.push(`[${msg.params.entry.level}] ${msg.params.entry.text}`);
    }
  });

  await ws.send("Runtime.enable");
  await ws.send("Log.enable");
  await ws.send("Page.enable");
  await ws.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 2400, deviceScaleFactor: 1, mobile: false });
  await ws.send("Page.navigate", { url });
  // wait for load
  await sleep(waitFor ?? 9000);

  const evalJs = async (expr) => {
    const r = await ws.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __err: r.exceptionDetails.text };
    return r.result.value;
  };

  const checks = await evalJs(`(() => {
    const out = {};
    const de = document.documentElement;
    out.title = document.title;
    out.hOverflow = de.scrollWidth - de.clientWidth;
    out.hOverflowEls = [];
    if (out.hOverflow > 0) {
      // find widest offending elements
      const all = document.querySelectorAll('body *');
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.right > de.clientWidth + 2 && r.width > 40) {
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed' && cs.position !== 'sticky') {
            out.hOverflowEls.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,90), right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width) });
          }
          if (out.hOverflowEls.length > 8) break;
        }
      }
    }
    // broken images
    out.brokenImgs = [];
    document.querySelectorAll('img').forEach(im => {
      if (im.complete && im.naturalWidth === 0 && im.src) {
        out.brokenImgs.push(im.src.slice(-70));
      }
    });
    // zero-size visible-ish imgs
    out.zeroImgs = [];
    document.querySelectorAll('img').forEach(im => {
      if (im.complete && im.naturalWidth > 0) {
        const r = im.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) out.zeroImgs.push({ src: im.src.slice(-50), w: Math.round(r.width), h: Math.round(r.height) });
      }
    });
    // any text that overflows its button/pill horizontally
    out.clipped = [];
    document.querySelectorAll('.btn, button, .ms-btn').forEach(b => {
      const cs = getComputedStyle(b);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (b.scrollWidth > b.clientWidth + 2) out.clipped.push({ tag: b.tagName, cls: (b.className||'').toString().slice(0,70), sw: b.scrollWidth, cw: b.clientWidth, text: (b.textContent||'').trim().slice(0,40) });
    });
    // stacked horizontal scroll traps
    out.hScrollEls = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'auto') {
        const r = el.getBoundingClientRect();
        if (r.width > 100) out.hScrollEls.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,70), sw: el.scrollWidth, cw: el.clientWidth });
      }
    });
    // counts
    out.bodyTextLen = document.body ? document.body.innerText.length : 0;
    return out;
  })()`);

  const layout = await evalJs(`(() => {
    const out = [];
    // viewport-height coverage: elements overlapping the fold repeatedly etc are hard; instead report main landmark sizes
    const main = document.querySelector('main');
    if (main) { const r = main.getBoundingClientRect(); out.push('main top=' + Math.round(r.top) + ' height=' + Math.round(r.height)); }
    const header = document.querySelector('header');
    if (header) { const r = header.getBoundingClientRect(); out.push('header height=' + Math.round(r.height) + ' top=' + Math.round(r.top)); }
    // detect giant empty whitespace gaps in main flow: sample stacked section bounding boxes sorted by top
    const secs = [...document.querySelectorAll('main section, main div')].map(el => { const r = el.getBoundingClientRect(); return { el, top: r.top, h: r.height, tag: el.tagName, cls: (el.className||'').toString().slice(0,50) }; })
      .filter(s => s.top >= 0 && s.h > 40 && s.h < 4000 && getComputedStyle(s.el).display !== 'none');
    secs.sort((a,b) => a.top - b.top);
    const gaps = [];
    for (let i = 1; i < secs.length; i++) {
      const prev = secs[i-1];
      if (secs[i].top - (prev.top + prev.h) > 500 && secs[i].top > 300) {
        gaps.push('gap~' + Math.round(secs[i].top - (prev.top + prev.h)) + 'px between ' + prev.cls.slice(0,40) + ' and ' + secs[i].cls.slice(0,40));
      }
    }
    out.push('big gaps: ' + (gaps.slice(0,4).join(' | ') || 'none'));
    return out;
  })()`);

  console.log(`\n===== ${name} :: ${url} =====`);
  console.log('TITLE:', checks.title);
  console.log('horizontal overflow px:', checks.hOverflow, checks.hOverflow > 0 ? JSON.stringify(checks.hOverflowEls.slice(0,5), null, 1) : '');
  console.log('broken imgs:', checks.brokenImgs.length ? JSON.stringify(checks.brokenImgs) : 'none');
  console.log('tiny imgs:', checks.zeroImgs.length ? JSON.stringify(checks.zeroImgs) : 'none');
  console.log('text-clipped buttons:', checks.clipped.length ? JSON.stringify(checks.clipped) : 'none');
  console.log('inner h-scroll containers:', checks.hScrollEls.length ? JSON.stringify(checks.hScrollEls) : 'none');
  console.log('layout:', layout.join(' ; '));
  console.log('console msgs:', consoleMsgs.length ? consoleMsgs.slice(0, 12).join(' || ') : 'none');
  console.log('errors:', errors.length ? errors.slice(0, 12).join(' || ') : 'none');

  // screenshot for record
  await ws.send("Page.captureScreenshot", { format: "png" }).then(async (r) => {
    const fs = await import("node:fs");
    fs.writeFileSync(`/tmp/shots/cdp-${name}.png`, Buffer.from(r.data, "base64"));
    console.log('screenshot saved');
  }).catch(e => console.log('shot fail', e.message));

  await ws.send("Page.close").catch(() => {});
  ws.close();
  return { checks, consoleMsgs, errors };
}

const pages = [
  { url: "http://localhost:3000/", name: "home", waitFor: 10000 },
  { url: "http://localhost:3000/booking", name: "booking", waitFor: 10000 },
  { url: "http://localhost:3000/admin", name: "admin", waitFor: 10000 },
  { url: "http://localhost:3000/control-admin", name: "control", waitFor: 10000 },
];

for (const p of pages) {
  try {
    await inspectPage(p.url, p.name, p);
  } catch (e) {
    console.log(`===== ${p.name} FAILED =====`, e.message);
  }
}
console.log("\nDONE");
process.exit(0);
