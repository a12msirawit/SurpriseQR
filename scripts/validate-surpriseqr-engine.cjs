// Runtime validation for the Anniversary Surprise engine.
// Transpiles template-engine.ts → CJS, builds the standalone HTML (view + edit),
// then checks: required element ids, no leftover markers, config JSON parses,
// and the embedded engine <script> is syntactically valid JavaScript.
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
  fileName: srcPath,
});

const moduleWrap = { exports: {} };
// eslint-disable-next-line no-new-func
new Function("exports", "module", "require", out.outputText)(
  moduleWrap.exports,
  moduleWrap,
  require,
);
const engine = moduleWrap.exports;

const TEST_CONFIG = {
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
    bgMusic: { type: "url", src: "" },
    letter: {
      title: "สุขสันต์วันครบรอบนะคะที่รัก 💕",
      paragraphs: ["บรรทัดที่ 1", "บรรทัดที่ 2"],
      headerImages: [
        { type: "url", src: "/templates/galaxy-1.png" },
        { type: "url", src: "/templates/surprise-qr.svg" },
      ],
    },
    memories: {
      sectionTitle: "Memories Made With You",
      filmstripImages: [{ src: "a.jpg" }, { src: "" }, { src: "c.jpg" }],
      polaroidImages: [{ src: "d.jpg" }, { src: "" }, { src: "f.jpg" }, { src: "g.jpg" }, { src: "h.jpg" }],
      description: "ความทรงจำสุดรัก",
    },
    flowers: { message: "ดอกไม้เพื่อเธอ", highlightText: "รักและเติบโต" },
    songMedia: {
      mediaType: "auto",
      src: "https://example.com/v.mp4",
      audioSrc: "https://example.com/song.mp3",
      songTitle: "เพลงของเรา",
      songArtist: "นักร้องของเรา",
      sectionTitle: "Song for you",
      accentImages: [{ src: "acc1.jpg" }, { src: "acc2.jpg" }],
    },
    finale: {
      heroImage: { src: "/templates/galaxy-1.png" },
      mainText: "HAPPY ANNIVERSARY",
      subText: "รักที่สุดในหัวใจ 💕",
    },
  },
};

function check(name, cond, extra) {
  const mark = cond ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${cond ? "" : " <- " + (extra || "")}`);
  if (!cond) process.exitCode = 1;
}

// 1. Build both modes
const viewHtml = engine.buildSurpriseQRHTML(TEST_CONFIG, { edit: false });
const editHtml = engine.buildSurpriseQRHTML(TEST_CONFIG, { edit: true });
check("buildSurpriseQRHTML(mode=view) returns string >20k chars", typeof viewHtml === "string" && viewHtml.length > 20000, viewHtml.length);
check("buildSurpriseQRHTML(mode=edit) returns string", typeof editHtml === "string" && editHtml.length > 20000);

// 2. No leftover markers
for (const marker of ["__SQ_CONTENT__", "__SQ_EDIT__", "__SQ_BODY_MORE__", "__SQJS__", "__SQJS_MORE__"]) {
  check(`no marker ${marker} in view build`, !viewHtml.includes(marker));
}

// 3. Required element ids present
for (const id of ["sq-config", "sq-envelope", "dot-0", "dot-1", "dot-2", "dot-3",
  "sq-screen-1", "sq-screen-2", "sq-screen-3", "sq-screen-4", "sq-screen-5",
  "sq-screen-6", "sq-screen-7", "sq-pin-modal", "sq-warp", "sq-hearts",
  "sq-bg-audio", "sq-music-toggle",
  "sq-pay-modal", "sq-pay-qr", "sq-admin-panel", "sq-edit-fab",
  "mem-title", "mem-pol-4", "song-eyebrow", "song-artist", "song-accent-0", "song-accent-1"]) {
  check(`id "#${id}" present`, viewHtml.includes(`id="${id}"`));
}
check("autoplay fallback button removed", !viewHtml.includes("sq-autoplay-fallback"));

// 4. Config JSON embedded parses & round-trips (plain JSON.parse must suffice)
const cfgMatch = viewHtml.match(/<script type="application\/json" id="sq-config">([\s\S]*?)<\/script>/);
check("inline config script found", !!cfgMatch);
if (cfgMatch) {
  let parsed = null;
  try { parsed = JSON.parse(cfgMatch[1]); } catch (e) { parsed = null; }
  check("inline config JSON parses (plain JSON.parse)", !!parsed);
  if (parsed && parsed.content) {
    check("config keeps title", parsed.content.title === TEST_CONFIG.content.title);
    check("config keeps pin", parsed.settings.pinCode === "1234");
    check("config keeps paragraphs", Array.isArray(parsed.content.letter.paragraphs) && parsed.content.letter.paragraphs.length === 2);
    check("config keeps memories sectionTitle", parsed.content.memories.sectionTitle === "Memories Made With You");
    check("config keeps 5 polaroids", Array.isArray(parsed.content.memories.polaroidImages) && parsed.content.memories.polaroidImages.length === 5);
    check("config keeps 2 accentImages", Array.isArray(parsed.content.songMedia.accentImages) && parsed.content.songMedia.accentImages.length === 2);
  }
  check("config JSON block has no raw '<' (script-tag safe)", !cfgMatch[1].includes("<"));
}

// 5. parseSurpriseQRConfig round-trip (incl. hostile payloads)
const extracted = engine.parseSurpriseQRConfig(viewHtml);
check("parseSurpriseQRConfig(viewHtml) returns config", !!extracted && typeof extracted === "object");
check("parseSurpriseQRConfig rejects junk", engine.parseSurpriseQRConfig("<html>no sq-config</html>") === null);

const HOSTILE_CONFIG = {
  settings: {
    enablePin: true,
    pinCode: "12<34",
    warpDurationEnvelopeMs: 4500,
    warpDurationOptionMs: 3000,
    isPaid: false,
  },
  content: {
    title: "</script><img src=x onerror=alert(1)>",
    bgMusic: { type: "url", src: "https://example.com/a.mp3?x=1&y=2" },
    letter: {
      title: "literal \\u003c sequence & <b>bold</b> 💕",
      paragraphs: ["</script> injection attempt", "literal \\u003c must survive & remain"],
      headerImages: [],
    },
    memories: { filmstripImages: [], polaroidImages: [], description: "<>&\"'" },
    flowers: { message: "&amp; must stay &amp;", highlightText: ">" },
    songMedia: { mediaType: "video", src: "", audioSrc: "", songTitle: "<title>" },
    finale: { heroImage: { src: "" }, mainText: "HAPPY ANNIVERSARY", subText: "💕" },
  },
};
const hostileHtml = engine.buildSurpriseQRHTML(HOSTILE_CONFIG, { edit: false });
const hostileCfg = hostileHtml.match(/<script type="application\/json" id="sq-config">([\s\S]*?)<\/script>/);
check("hostile config script found", !!hostileCfg);
check("hostile JSON block has no raw '<' (no premature </script>)", !!hostileCfg && !hostileCfg[1].includes("<"));
const hostileParsed = engine.parseSurpriseQRConfig(hostileHtml);
check(
  "hostile round-trip is exact",
  !!hostileParsed && JSON.stringify(hostileParsed) === JSON.stringify(HOSTILE_CONFIG),
  JSON.stringify(hostileParsed),
);
check(
  "literal \\u003c text survives round-trip",
  !!hostileParsed &&
    hostileParsed.content &&
    hostileParsed.content.letter &&
    hostileParsed.content.letter.paragraphs[1] === "literal \\u003c must survive & remain",
);

// 6. Engine <script> (edit mode) is syntactically valid JS via new Function
const scripts = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(editHtml)) !== null) {
  const code = m[1];
  if (code.includes("Anniversary Surprise engine")) scripts.push(code);
}
check("engine inline script found", scripts.length >= 1);
if (scripts.length) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(scripts[0]);
    check("engine script parses (new Function)", true);
  } catch (e) {
    check("engine script parses (new Function)", false, e.message);
  }
}

// 7. serializeSafeJSON escape sanity
const safe = engine.serializeSafeJSON("<img src=x onerror=alert(1)>");
check("serializeSafeJSON escapes <", !safe.includes("<img"), safe);

console.log("\nDone. Engine views built OK.");