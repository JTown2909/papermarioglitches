/* v152 (console 11-25 16:55: "fbShroomLeft is not defined" in the share worker: v149's Life Shroom helpers were left out of the worker's
 * source, so every share job that reached a hit died and T2 / T3 planned on broken shares): every fb* / FB14_* name the worker's
 * source uses is defined in it, and the helpers run there. usage: node test_v152.js [page] */
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const PAGE = process.argv[2] || '/tmp/claude-0/-home-user/4de37507-9387-5f1e-bab5-10167305f887/scratchpad/timeout_timer/timeout_timer_standalone.html';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE); const E = src => p.evaluate(s => window.__tot.v111.ev(s), src);
  ok(await E('VERSION') === 'v152', 'page version v152');
  const r = JSON.parse(await E(`(() => { const src = fbsSrc(); const used = new Set(src.match(/\\b(?:fb[A-Z]\\w*|FB14_[A-Z0-9_]+|FB_[A-Z0-9_]+)\\b/g));
    const defd = new Set([...src.matchAll(/(?:function\\s+|const\\s+|let\\s+|var\\s+|,\\s*)(fb[A-Z]\\w*|FB14_[A-Z0-9_]+|FB_[A-Z0-9_]+)\\s*(?:=|\\()/g)].map(m => m[1]));
    const missing = [...used].filter(x => !defd.has(x));
    let run = null; try { run = new Function(src.replace('onmessage = ', 'const __om = ') + '; const S = { shroom: null }; const a = fbShroomLeft(S); fbShroomUse(S); return [a, S.shroom, FB14_SHROOMS];')(); } catch (e) { run = String(e); }
    return JSON.stringify({ missing, run }); })()`));
  console.log('     ' + JSON.stringify(r));
  ok(r.missing.length === 0, 'every fb* / FB14_* name the worker uses is defined in its source' + (r.missing.length ? ' (missing: ' + r.missing.join(', ') + ')' : ''));
  ok(Array.isArray(r.run) && r.run[0] === true && r.run[1] === 2 && r.run[2] === 3, "the Life Shroom helpers run in the worker's source (" + JSON.stringify(r.run) + ')');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAIL ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
