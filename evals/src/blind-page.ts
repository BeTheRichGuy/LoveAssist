// 블라인드 평가 화면. 브라우저로 열어 항목마다 가장 나은 답을 고르고, 결과 파일을 저장한다.
// 모델 이름은 들어 있지 않다 (정답지는 results/<runId>/key.json).

export interface BlindItem {
  key: string;
  feature: string;
  request: unknown;
  options: Record<string, { ok: boolean; output: unknown; error: string | null }>;
}

export function blindHtml(runId: string, items: BlindItem[]): string {
  const data = JSON.stringify({ runId, items }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>블라인드 모델 비교</title>
<style>
  :root { --bg:#fff; --fg:#1a1a1a; --muted:#666; --line:#ddd; --card:#f7f7f8; --pick:#2f6fed; }
  @media (prefers-color-scheme: dark) { :root { --bg:#16161a; --fg:#eee; --muted:#999; --line:#333; --card:#1f1f25; --pick:#6b9bff; } }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.6 system-ui, sans-serif; }
  main { max-width:1100px; margin:0 auto; padding:16px; }
  header { position:sticky; top:0; background:var(--bg); padding:8px 0; border-bottom:1px solid var(--line); display:flex; gap:8px; flex-wrap:wrap; align-items:center; z-index:1; }
  section { border-bottom:1px solid var(--line); padding:20px 0; }
  .ctx { background:var(--card); border-radius:8px; padding:10px 12px; white-space:pre-wrap; color:var(--muted); font-size:14px; }
  .opts { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px; margin-top:10px; }
  .opt { border:2px solid var(--line); border-radius:8px; padding:10px 12px; cursor:pointer; white-space:pre-wrap; }
  .opt.picked { border-color:var(--pick); }
  .opt b { color:var(--pick); }
  .err { color:#d33; }
  button, input { font:inherit; padding:6px 10px; }
  .same { margin-top:8px; color:var(--muted); }
</style>
</head>
<body>
<main>
<header>
  <strong>블라인드 모델 비교</strong>
  <input id="who" placeholder="평가자 이름">
  <span id="progress"></span>
  <button id="save">결과 파일 저장</button>
</header>
<p>항목마다 <b>실제로 쓰고 싶은 쪽</b>을 고르세요. 거의 같으면 "차이 없음". 고른 내용은 이 브라우저에 자동 저장되고, 다 끝나면 "결과 파일 저장"을 눌러 받은 파일을 Claude에게 전달하세요.</p>
<div id="list"></div>
</main>
<script>
const DATA = ${data};
const STORE = 'blind-' + DATA.runId;
let state = { evaluator: '', picks: {} };
try { state = JSON.parse(localStorage.getItem(STORE)) || state; } catch {}
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {} render(); };

const STAGE = { some:'썸', dating:'연애 중', slump:'권태기', breakup:'이별 후' };
const FEATURE = { analyze:'답장 감정소', simulate:'시뮬레이션 상대', score:'답장 채점' };
function chat(lines, label) { return lines.map(l => (l.speaker === 'me' ? '나' : label) + ': ' + l.text).join('\\n'); }
function context(item) {
  const r = item.request, p = r.partner;
  let s = '상대: ' + p.label + ' · ' + STAGE[p.stage];
  if (p.traits.length) s += '\\n성향: ' + p.traits.join(' / ');
  if (p.memos.length) s += '\\n메모: ' + p.memos.join(' / ');
  if (r.mode === 'conflict') s += '\\n(갈등 해결 모드)';
  s += '\\n\\n' + chat(r.lines || r.history, p.label);
  if (r.draft) s += '\\n\\n▶ 채점할 답장 — 나: ' + r.draft;
  return s;
}
function show(item, o) {
  if (!o.ok) return '<span class="err">실패: ' + esc(o.error) + '</span>';
  const v = o.output;
  if (item.feature === 'analyze') {
    return '<b>기분</b> ' + esc(v.signals.map(x => x.label + ' ' + Math.round(x.value * 100)).join(' · ')) +
      '\\n<b>해석</b> ' + esc(v.interpretation) +
      '\\n<b>추천 답장</b>\\n' + v.replies.map(x => '· ' + esc(x.text) + ' (' + x.expectedScore + ')').join('\\n') +
      '\\n<b>성향 제안</b> ' + esc(v.traitSuggestions.join(' / ') || '없음');
  }
  if (item.feature === 'simulate') return esc(item.request.partner.label + ': ' + v.message) + '\\n<b>표정</b> ' + v.mood;
  return '<b>총점 ' + v.total + '</b>  공감 ' + v.axes.empathy + ' · 성향 ' + v.axes.fit + ' · 톤 ' + v.axes.tone + ' · 템포 ' + v.axes.tempo +
    '\\n<b>팁</b> ' + esc(v.tip) + (v.suggestion ? '\\n<b>대안</b> ' + esc(v.suggestion.text) + ' (' + v.suggestion.expectedScore + ')' : '');
}
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[c]); }

function render() {
  document.getElementById('who').value = state.evaluator;
  document.getElementById('progress').textContent = Object.keys(state.picks).length + ' / ' + DATA.items.length + ' 완료';
  document.getElementById('list').innerHTML = DATA.items.map((item, i) =>
    '<section><h3>' + (i + 1) + '. ' + FEATURE[item.feature] + ' <small>' + esc(item.key) + '</small></h3>' +
    '<div class="ctx">' + esc(context(item)) + '</div><div class="opts">' +
    Object.entries(item.options).map(([label, o]) =>
      '<div class="opt' + (state.picks[item.key] === label ? ' picked' : '') + '" data-key="' + esc(item.key) + '" data-label="' + label + '">' +
      '<b>' + label + '</b>\\n' + show(item, o) + '</div>').join('') +
    '</div><label class="same"><input type="radio" data-key="' + esc(item.key) + '" data-label="same"' +
    (state.picks[item.key] === 'same' ? ' checked' : '') + '> 차이 없음</label></section>').join('');
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-label]');
  if (!el) return;
  state.picks[el.dataset.key] = el.dataset.label;
  save();
});
document.getElementById('who').addEventListener('change', e => { state.evaluator = e.target.value.trim(); save(); });
document.getElementById('save').addEventListener('click', () => {
  if (!state.evaluator) { alert('평가자 이름을 먼저 적어 주세요'); return; }
  const blob = new Blob([JSON.stringify({ evaluator: state.evaluator, runId: DATA.runId, picks: state.picks }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'votes-' + state.evaluator + '.json';
  a.click();
});
render();
</script>
</body>
</html>
`;
}
