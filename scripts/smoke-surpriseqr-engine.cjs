// Boot smoke-test for the Anniversary Surprise engine.
// Runs the built engine <script> against a minimal DOM stub (no jsdom) and
// asserts boot()+sync()+showScreen(1) complete without throwing.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const vm = require("vm");

const srcPath = path.join(process.cwd(), "src/lib/surpriseqr/template-engine.ts");
const src = fs.readFileSync(srcPath, "utf8");
const out = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
    skipLibCheck: true,
  },
});
const moduleWrap = { exports: {} };
// eslint-disable-next-line no-new-func
new Function("exports", "module", "require", out.outputText)(
  moduleWrap.exports,
  moduleWrap,
  require,
);
const engine = moduleWrap.exports;

const CONFIG = {
  settings: { enablePin: true, pinCode: "1234", warpDurationEnvelopeMs: 4500, warpDurationOptionMs: 3000, isPaid: false },
  content: {
    title: "BootTest",
    bgMusic: { type: "url", src: "" },
    letter: { title: "L", paragraphs: ["P1", "P2"], headerImages: [{ src: "" }, { src: "" }] },
    memories: { filmstripImages: [{ src: "" }, { src: "" }, { src: "" }], polaroidImages: [{ src: "" }, { src: "" }, { src: "" }], description: "" },
    flowers: { message: "", highlightText: "" },
    songMedia: { mediaType: "video", src: "", audioSrc: "", songTitle: "S" },
    finale: { heroImage: { src: "" }, mainText: "MAIN", subText: "SUB" },
  },
};

function makeEl(id) {
  const el = {
    id: id || "",
    tagName: "DIV",
    className: "",
    textContent: "",
    innerHTML: "",
    style: {
      setProperty() {}, removeProperty() {}, cssText: "",
    },
    src: "",
    alt: "",
    value: "",
    files: [],
    type: "",
    parentNode: null,
    children: [],
    childNodes: [],
    classList: {
      add() {}, remove() {}, toggle() {}, contains() { return false; },
    },
    dataset: {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild(c) { this.childNodes.push(c); return c; },
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); return c; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    focus() {}, click() {}, pause() {}, play() { return { catch() {} }; },
    scrollTop: 0, offsetWidth: 0,
  };
  return el;
}

const ids = {};
for (let i = 1; i <= 7; i++) ids[`sq-screen-${i}`] = makeEl(`sq-screen-${i}`);
for (const id of ["sq-config","sq-envelope","sq-pin-modal","sq-pin-modal-card","sq-pin-status","sq-warp",
  "sq-hearts","sq-bg-audio","sq-music-toggle","sq-pay-modal",
  "sq-pay-qr","sq-pay-target","sq-pay-hint","sq-admin-panel","sq-admin-body","sq-admin-screens",
  "sq-edit-fab","sq-export-btn","sq-pay-note","msg-paras","song-media-box","msg-img-0","msg-img-1",
  "mem-film-0","mem-film-1","mem-film-2","mem-pol-0","mem-pol-1","mem-pol-2","mem-pol-3","mem-pol-4",
  "mem-title","msg-title","song-eyebrow","song-artist","song-accent-0","song-accent-1","song-title",
  "finale-hero","finale-main","finale-sub","vinyl-title","flw-msg","flw-hl","mem-desc","sq-greeting"]) {
  if (!ids[id]) ids[id] = makeEl(id);
}
ids["sq-config"].textContent = JSON.stringify(CONFIG);

// Minimal FileReader stub (Node has no global FileReader).
class StubFileReader {
  onload = null;
  readAsDataURL() { if (this.onload) this.onload({ result: "data:image/png;base64,xx" }); }
}
const FileReaderStub = StubFileReader;
class DocumentFragmentStub {
  constructor(){ Object.assign(this, makeEl("")); }
}
const documentStub = {
  title: "",
  documentElement: makeEl("html"),
  body: makeEl("body"),
  getElementById: (id) => ids[id] || (ids[id] = makeEl(id)),
  querySelectorAll: (sel) => {
    if (typeof sel === "string" && sel.startsWith("#")) {
      const id = sel.slice(1);
      return ids[id] ? [ids[id]] : [];
    }
    return [];
  },
  querySelector: (sel) => {
    if (typeof sel === "string" && sel.startsWith("#")) return ids[sel.slice(1)] || null;
    return null;
  },
  createElement: () => makeEl(""),
  createDocumentFragment: () => new DocumentFragmentStub(),
  createTextNode: () => ({}),
  addEventListener() {}, removeEventListener() {},
};

const windowStub = {
  parent: { postMessage() {} },
  location: { href: "https://example.test/card" },
  addEventListener() {}, removeEventListener() {},
  setTimeout: (fn) => 0, clearTimeout() {},
  setInterval: () => 0, clearInterval() {},
  navigator: {},
  prompt() {}, confirm() {},
  URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
  Blob, FileReaderStub,
};

// Rebuild the edit-mode HTML and pull out the engine <script> body.
const html = engine.buildSurpriseQRHTML(CONFIG, { edit: true });
const m = html.match(/<script>\s*\/\* Anniversary Surprise engine[\s\S]*?<\/script>/);
if (!m) { console.log("[FAIL] engine script not found"); process.exit(1); }
const code = m[0].replace(/^<script>/, "").replace(/<\/script>$/, "");

try {
  const sandbox = { document: documentStub, window: windowStub, console, setTimeout: windowStub.setTimeout, clearTimeout() {}, setInterval: windowStub.setInterval, clearInterval() {}, navigator: {}, Blob, FileReaderStub, URL: windowStub.URL, prompt() {}, DocumentFragment: DocumentFragmentStub };
  
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "engine-smoke.js" });
  console.log("[PASS] engine boot() executed without throwing (edit mode)");
} catch (e) {
  console.log("[FAIL] engine boot() threw:", e.message);
  console.log(e.stack || "");
  process.exit(1);
}

// Also boot the view (non-edit) build.
const htmlView = engine.buildSurpriseQRHTML(CONFIG, { edit: false });
const m2 = htmlView.match(/<script>\s*\/\* Anniversary Surprise engine[\s\S]*?<\/script>/);
const code2 = m2[0].replace(/^<script>/, "").replace(/<\/script>$/, "");
try {
  const ids2 = {};
  for (const id of Object.keys(ids)) ids2[id] = makeEl(id);
  ids2["sq-config"].textContent = JSON.stringify(CONFIG);
  const doc2 = Object.assign({}, documentStub, {
    getElementById: (id) => ids2[id] || (ids2[id] = makeEl(id)),
    querySelector: () => null,
    querySelectorAll: () => [],
  });
  const win2 = Object.assign({}, windowStub, {});
  const sand2 = { document: doc2, window: win2, console, setTimeout() {}, setInterval() {}, navigator: {}, Blob, FileReaderStub, prompt() {}, DocumentFragment: DocumentFragmentStub };
  
  vm.createContext(sand2);
  vm.runInContext(code2, sand2, { filename: "engine-smoke-view.js" });
  console.log("[PASS] engine boot() executed without throwing (view mode)");
} catch (e) {
  console.log("[FAIL] view engine boot() threw:", e.message);
  process.exit(1);
}

console.log("Boot smoke tests passed.");
