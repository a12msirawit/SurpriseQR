// Generate a standalone demo HTML for manual browser testing.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

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

const DEMO_CONFIG = {
  settings: {
    enablePin: true,
    pinCode: "1234",
    warpDurationEnvelopeMs: 4500,
    warpDurationOptionMs: 3000,
    isPaid: false,
    promptpayTarget: "0812345678",
    promptpayAmount: 49,
  },
  content: {
    title: "Happy Anniversary, Love !",
    bgMusic: {
      type: "url",
      src: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    },
    letter: {
      title: "สุขสันต์วันครบรอบนะคะที่รัก 💕",
      paragraphs: [
        "ผ่านมาอีกหนึ่งปีที่เราได้อยู่ด้วยกัน...",
        "ขอบคุณที่รับฟัง ขอบคุณที่เข้าใจ ขอบคุณที่เป็นเธอคนเดิมเสมอมา",
        "รักเธอมากกว่าที่คำไหนจะบรรยายได้ 💖",
      ],
      headerImages: [
        { type: "url", src: "templates/rose.png" },
        { type: "url", src: "templates/galaxy.png" },
      ],
    },
    memories: {
      sectionTitle: "Memories Made With You",
      filmstripImages: [
        { src: "templates/galaxy-1.png" },
        { src: "templates/galaxy-2.png" },
        { src: "templates/galaxy.png" },
      ],
      polaroidImages: [
        { src: "templates/rose.png" },
        { src: "templates/galaxy.png" },
        { src: "templates/simple.png" },
        { src: "templates/rose.png" },
        { src: "templates/galaxy.png" },
      ],
      description: "ทุกภาพคือช่วงเวลาที่ฉันไม่เคยลืม และจะเก็บไว้ในใจตลอดไป",
    },
    flowers: {
      message: "ช่อดอกไม้นี้บานแทนคำว่ารักที่ฉันส่งมาถึงเธอในวันพิเศษ",
      highlightText: "ความรักของเราดอกเดียวก็เพียงพอ ให้เบ่งบานไปพร้อมกันทุกฤดูกาล",
    },
    songMedia: {
      mediaType: "auto",
      src: "",
      audioSrc: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
      songTitle: "เพลงพิเศษแทนใจจากฉันถึงเธอ",
      songArtist: "",
      sectionTitle: "Song for you",
      accentImages: [
        { src: "templates/rose.png" },
        { src: "templates/galaxy.png" },
      ],
    },
    finale: {
      heroImage: { src: "templates/galaxy.png" },
      mainText: "HAPPY ANNIVERSARY",
      subText: "รักที่สุดในหัวใจ 💕",
    },
  },
};

const html = engine.buildSurpriseQRHTML(DEMO_CONFIG, { edit: false });
const outDir = path.join(process.cwd(), "docs");
fs.mkdirSync(outDir, { recursive: true });
const target = path.join(outDir, "anniversary-surprise-demo.html");
fs.writeFileSync(target, html, "utf8");
console.log("Wrote", target, "bytes:", html.length);

// Sanity greps
const checks = {
  "edit marker replaced to false": html.includes("var EngineEditMode = false;"),
  "config script valid json preset": html.includes('"settings"') && html.includes('"pinCode"'),
  "no double-escaped DOCTYPE newline": !html.includes("<!DOCTYPE html>\\\\n"),
  "doExport escapes < correctly": html.includes(".replace(/</g, '" + String.fromCharCode(92, 92) + "u003c')"),
  "single config block": (html.match(/id="sq-config"/g) || []).length === 1,
  "single engine block": (html.match(/Anniversary Surprise engine/g) || []).length === 1,
  "pin modal dots": html.includes('id="dot-3"'),
  "warp overlay": html.includes('id="sq-warp"'),
  "gingham screen": html.includes('class="sq-screen gingham"'),
  "vinyl spin": html.includes("sq-vinyl sq-spin"),
  "anim floatEnvelope": html.includes("@keyframes floatEnvelope"),
  "anim slowGlow": html.includes("@keyframes slowGlow"),
  "anim heart-particle": html.includes("@keyframes floatUp"),
  "anatomy 7 screens": (html.match(/id="sq-screen-\d"/g) || []).length === 7,
  "memories section bound": html.includes('data-f="content.memories.sectionTitle"'),
  "song accents": html.includes('id="song-accent-1"'),
  "5 polaroids": (html.match(/id="mem-pol-\d"/g) || []).length === 5,
};
let fail = 0;
for (const [name, ok] of Object.entries(checks)) {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`);
  if (!ok) fail += 1;
}
process.exit(fail ? 1 : 0);
