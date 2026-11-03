/** The MCP UI resource: a measurement card, as one self-contained document.
 *
 * HOW IT REACHES A READER. The tool declares this resource's URI in its
 * `_meta`; the host fetches the resource once and renders it beside the tool
 * result, handing the structured output to the document at runtime. The URI is
 * therefore a cache key: a breaking change to the card publishes a NEW uri
 * rather than editing this one in place — which is why this is `card-v2`.
 *
 * SELF-CONTAINED BY REQUIREMENT. No stylesheet, font, script or image is
 * fetched: the host applies a strict content policy, and this connector has no
 * runtime dependencies to begin with. Everything is inlined here, the icon is
 * drawn from primitives, and the declared CSP allow-lists are empty because
 * nothing is loaded.
 *
 * NO VALUE IS WRITTEN AS MARKUP. Every server-supplied string reaches the
 * document through `textContent`, never `innerHTML`. A measurement can contain
 * an arbitrary prompt and an arbitrary model response — that is the point of
 * the tool — so the card treats all of it as hostile text.
 *
 * NO TRAFFIC LIGHT, AND THE WEATHER IS NOT ONE. The brand foundation forbids a
 * risk colour, because a green badge on an `ALLOW` that was never evaluated
 * would be the exact lie this card exists to prevent. The V2 weather does not
 * break that rule, it enforces it: the sky depicts HOW MUCH WAS MEASURED and
 * never the decision, so that same unevaluated `ALLOW` draws the emptiest sky
 * on the card. `view-model.mjs` holds the rules; two tests hold the invariant.
 *
 * TWO TIERS, AND WHAT THE SECOND ONE IS NOT. Evaluator identifiers, request
 * identifiers and raw published values live behind a disclosure. That is a
 * READING decision. Everything there is in the tool's structured output, which
 * the host and the model receive in full; collapsing a section in HTML is not
 * a confidentiality control and the card says so in as many words.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** Versioned, and treated as a cache key. Bumped to v2 because the card's
 * contract with the host changed shape: a new model schema, a weather block
 * and a disclosure tier.
 */
export const CARD_RESOURCE_URI = 'ui://neomundi-measurement/card-v2.html';

/** The MCP Apps mime type. The host recognises a UI resource by this, not by
 * the file extension in the URI.
 */
export const CARD_MIME_TYPE = 'text/html;profile=mcp-app';

export const CARD_RESOURCE_NAME = 'NeoMundi measurement card';
export const CARD_RESOURCE_DESCRIPTION = 'A readable rendering of one NeoMundi '
  + 'measurement: how much was measured, the decision and the basis it rests on, '
  + 'each signal with its value or the cause of its absence, the version in '
  + 'effect, and the declared limitations. No value is computed or interpreted.';

/** The view model's source, inlined as a plain script.
 *
 * Read from disk rather than duplicated, so the logic a reader sees in the
 * card is byte-for-byte the logic the Node test suite exercises. The `export`
 * keywords are stripped because the document runs this as a classic script;
 * nothing else is altered, and a test asserts the stripping changed only that.
 */
function viewModelSource() {
  const source = readFileSync(new URL('./view-model.mjs', import.meta.url), 'utf8');
  return source.replace(/^export (const|function) /gm, '$1 ');
}

/** Restrained, and deliberately not a scale from green to red.
 *
 * One ink, one accent, one muted tone. The accent marks what WAS measured;
 * the muted tone marks what was not. Neither says good or bad, and no palette
 * entry is keyed to a decision.
 */
const STYLE = `
:root{
  --nm-bg:#ffffff; --nm-fg:#14161a; --nm-muted:#5b6370; --nm-rule:#e2e6ec;
  --nm-accent:#1b4965; --nm-panel:#f6f8fa; --nm-absent:#9aa3b2;
  --nm-radius:12px;
}
@media (prefers-color-scheme: dark){
  :root{
    --nm-bg:#0b0e14; --nm-fg:#e8ecf2; --nm-muted:#9aa3b2; --nm-rule:#222834;
    --nm-accent:#7fb2cc; --nm-panel:#121823; --nm-absent:#6b7480;
  }
}
*{box-sizing:border-box}
body{margin:0;background:var(--nm-bg);color:var(--nm-fg);
  font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-text-size-adjust:100%}
#root{max-width:44rem;margin:0 auto;padding:1rem}
header{display:flex;align-items:baseline;justify-content:space-between;gap:.75rem;margin:0 0 .9rem}
h1{font-size:.82rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  color:var(--nm-muted);margin:0}
button.lang{font:inherit;font-size:.78rem;color:var(--nm-muted);background:none;
  border:1px solid var(--nm-rule);border-radius:999px;padding:.15rem .6rem;cursor:pointer}
button.lang:hover{color:var(--nm-fg)}

.weather{display:flex;gap:1rem;align-items:flex-start;background:var(--nm-panel);
  border:1px solid var(--nm-rule);border-radius:var(--nm-radius);padding:1rem;margin:0 0 .9rem}
.weather .sky{flex:0 0 auto}

/* The aperture: a ring whose filled sweep is what the instrument saw. No
   green, no red, no second hue — one accent for measured, one rule tone for
   the rest. A dashed, unfilled ring is the honest picture of nothing seen. */
.aperture{position:relative;width:52px;height:52px;border-radius:50%;
  background:var(--nm-rule);display:grid;place-items:center}
.aperture.not_measured,.aperture.error,.aperture.undeclared{
  background:none;border:5px dashed var(--nm-rule)}
.aperture .hole{width:32px;height:32px;border-radius:50%;background:var(--nm-panel)}
.aperture .core{position:absolute;width:13px;height:13px;border-radius:50%;
  background:var(--nm-accent)}
.weather h2{margin:0 0 .25rem;font-size:1.15rem;line-height:1.25}
.weather p{margin:0 0 .35rem}
.weather .rule{font-size:.8rem;color:var(--nm-muted);margin:0}

.gauges{display:flex;flex-wrap:wrap;gap:.6rem;margin:0 0 .9rem}
.gauge{flex:1 1 11rem;border:1px solid var(--nm-rule);border-radius:var(--nm-radius);padding:.6rem .75rem}
.gauge .k{font-size:.74rem;letter-spacing:.04em;text-transform:uppercase;color:var(--nm-muted)}
.gauge .v{font-size:1.05rem;font-variant-numeric:tabular-nums}
.gauge .track{height:4px;border-radius:999px;background:var(--nm-rule);margin:.4rem 0 0;overflow:hidden}
.gauge .fill{height:100%;background:var(--nm-accent)}

p.banner{border-left:3px solid var(--nm-fg);background:var(--nm-panel);
  padding:.55rem .8rem;margin:0 0 .5rem;font-size:.9rem;font-weight:500;border-radius:0 6px 6px 0}

h3{font-size:.76rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  color:var(--nm-muted);margin:1.1rem 0 .4rem}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-weight:400;color:var(--nm-muted);padding:.22rem .8rem .22rem 0;
  vertical-align:top}
/* Only the label/value tables get a fixed label column. The evaluator table
   has five columns and was being squeezed by the same rule. */
table.kv th{width:45%}
table.grid{font-size:.88rem}
table.grid th,table.grid td{padding-right:.6rem;overflow-wrap:anywhere}
td{padding:.22rem 0;vertical-align:top;overflow-wrap:anywhere}
.absent{color:var(--nm-absent);font-style:italic}
ul{margin:.1rem 0 0;padding-left:1.1rem}
li{margin:.1rem 0;overflow-wrap:anywhere}

.chips{display:flex;flex-wrap:wrap;gap:.45rem;margin:.2rem 0 0}
.chip{flex:1 1 11rem;min-width:0;border:1px solid var(--nm-rule);border-radius:10px;padding:.5rem .65rem}
.chip .n{font-size:.76rem;color:var(--nm-muted);word-break:break-word;line-height:1.3}
.chip .v{font-size:1rem;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.chip.off{border-style:dashed}
.chip.off .v{font-size:.84rem;font-style:italic;color:var(--nm-absent)}
.chip .c{font-size:.74rem;color:var(--nm-muted);overflow-wrap:anywhere}

.reads{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));
  gap:.5rem;margin:.2rem 0 0}
.read{min-width:0;border:1px solid var(--nm-rule);border-radius:10px;
  padding:.6rem .7rem;display:flex;flex-direction:column;gap:.3rem}
.read .q{font-size:.82rem;line-height:1.35;font-weight:500}
.read .rv{font-size:1.5rem;line-height:1.1;font-variant-numeric:tabular-nums;
  overflow-wrap:anywhere}
.read .rv2{display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem;
  font-size:1.15rem;font-variant-numeric:tabular-nums}
.read .sc{font-size:.74rem;line-height:1.35;color:var(--nm-muted);
  overflow-wrap:anywhere;font-variant-numeric:normal}
.read .lim{font-size:.74rem;line-height:1.35;color:var(--nm-muted);
  border-top:1px solid var(--nm-rule);padding-top:.3rem;overflow-wrap:anywhere}
.read.off{border-style:dashed}
.read.off .rv{font-size:.9rem;font-style:italic;color:var(--nm-absent)}
.read.derived{margin:.2rem 0 0;background:var(--nm-panel)}
@media (max-width:30rem){ .reads{grid-template-columns:1fr} }

details{margin:1.2rem 0 0;border-top:1px solid var(--nm-rule);padding-top:.6rem}
summary{cursor:pointer;font-size:.82rem;color:var(--nm-muted);font-weight:500}
summary::marker{color:var(--nm-absent)}
.note{font-size:.78rem;color:var(--nm-muted);margin:.45rem 0 0}
footer{margin:1.2rem 0 0;padding-top:.7rem;border-top:1px solid var(--nm-rule);
  font-size:.78rem;color:var(--nm-muted)}
@media (max-width:30rem){
  .weather{flex-direction:column;gap:.7rem}
  th{width:auto;display:block;padding-bottom:0}
  td{display:block;padding-top:0}
}
`;

/** The renderer, as a classic script.
 *
 * Everything a server published goes through `text()`, which sets
 * `textContent`. The only markup this file builds is structural.
 */
const RENDERER = `
var LANG = 'en';
var LAST = null;

function $(tag, text, cls) {
  var n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function t(key) { return label(key, LANG); }

/** A published value, or the marker. Never an empty cell: a blank reads as
 * "nothing to report", which is a claim; the marker reads as "no value",
 * which is the fact.
 */
function valueNode(r) {
  if (!r || !r.published) return $('span', t('not_published'), 'absent');
  // A boolean is rendered in the reader's language. Every other value is the
  // server's own token, printed as it arrived.
  if (r.value === true) return $('span', t('value_true'));
  if (r.value === false) return $('span', t('value_false'));
  return $('span', String(r.value));
}
function rows(parent, list) {
  if (!list || !list.length) return;
  var table = document.createElement('table');
  table.className = 'kv';
  list.forEach(function (r) {
    var tr = document.createElement('tr');
    var th = $('th', r.name !== undefined ? r.name : t(r.key));
    th.setAttribute('scope', 'row');
    var td = document.createElement('td');
    td.appendChild(valueNode(r));
    tr.appendChild(th); tr.appendChild(td); table.appendChild(tr);
  });
  parent.appendChild(table);
}
function heading(parent, key) { parent.appendChild($('h3', t(key))); }
function bullets(parent, key, items) {
  if (!items || !items.length) return;
  heading(parent, key);
  var ul = document.createElement('ul');
  items.forEach(function (i) { ul.appendChild($('li', typeof i === 'string' ? i : JSON.stringify(i))); });
  parent.appendChild(ul);
}

/** The sky. An aperture: the ring is what the instrument could have seen, the
 * filled sweep is what it did see.
 *
 * Drawn in CSS from a conic gradient rather than in SVG, for a reason worth
 * keeping: the SVG namespace is itself a URL, and the card's own test refuses
 * any \`http\` in this document so that "nothing is loaded" stays checkable by
 * reading it. Building that string from pieces to slip past the guard would
 * have been obfuscation, not a fix.
 *
 * It carries no server string and is keyed to the weather state only — never
 * to the decision.
 */
function sky(state, fraction) {
  var box = $('div', null, 'aperture ' + state);
  var shown = state === 'complete' ? 1 : (state === 'incomplete' ? (typeof fraction === 'number' ? fraction : 0.5) : 0);
  if (shown > 0) {
    var pct = Math.round(shown * 100);
    box.style.background = 'conic-gradient(var(--nm-accent) 0 ' + pct + '%, var(--nm-rule) ' + pct + '% 100%)';
  }
  box.appendChild($('div', null, 'hole'));
  if (state === 'complete') box.appendChild($('div', null, 'core'));
  return box;
}

function gauge(parent, key, g) {
  if (!g) return;
  var box = $('div', null, 'gauge');
  box.appendChild($('div', t(key), 'k'));
  box.appendChild($('div', g.numerator + ' / ' + g.denominator, 'v'));
  var track = $('div', null, 'track');
  var fill = $('div', null, 'fill');
  fill.style.width = (g.fraction * 100) + '%';
  track.appendChild(fill); box.appendChild(track);
  parent.appendChild(box);
}

function signals(parent, s) {
  var any = (s.measured && s.measured.length) || (s.measured_names && s.measured_names.length) || (s.unmeasured && s.unmeasured.length);
  if (!any) return;
  heading(parent, 'section_signals');
  var wrap = $('div', null, 'chips');
  (s.measured || []).forEach(function (m) {
    var c = $('div', null, m.published ? 'chip' : 'chip off');
    c.appendChild($('div', m.name, 'n'));
    var v = $('div', null, 'v');
    v.appendChild(valueNode(m));
    c.appendChild(v);
    wrap.appendChild(c);
  });
  (s.measured_names || []).forEach(function (n) {
    var c = $('div', null, 'chip');
    c.appendChild($('div', n, 'n'));
    c.appendChild($('div', t('signals_measured'), 'c'));
    wrap.appendChild(c);
  });
  (s.unmeasured || []).forEach(function (u) {
    var c = $('div', null, 'chip off');
    c.appendChild($('div', u.name === null ? t('not_published') : String(u.name), 'n'));
    c.appendChild($('div', t('signals_unmeasured'), 'v'));
    c.appendChild($('div', t('signal_cause') + ': ' + (u.cause === null || u.cause === undefined ? t('not_published') : String(u.cause)), 'c'));
    wrap.appendChild(c);
  });
  parent.appendChild(wrap);
}

/** The four readings. One question, one value with its scale, one limit.
 *
 * The value and the scale are rendered in the same block, always, and an
 * unmeasured reading renders the sentence that says an absence is not a
 * favourable result — never a blank and never a zero. The limit sits with its
 * own reading rather than in a footnote, because a limit a reader has to go
 * looking for has already failed.
 */
function readings(parent, list) {
  if (!list || !list.length) return;
  heading(parent, 'read_section');
  var wrap = $('div', null, 'reads');
  list.forEach(function (r) {
    var b = $('div', null, r.published ? 'read' : 'read off');
    b.appendChild($('div', t(r.question_key), 'q'));
    var v = $('div', null, 'rv');
    v.appendChild(valueNode(r));
    b.appendChild(v);
    if (r.published) {
      b.appendChild($('div', t('read_scale') + ' · ' + t(r.scale_key), 'sc'));
    } else {
      b.appendChild($('div', t('read_not_measured'), 'sc'));
      if (r.cause !== null && r.cause !== undefined) {
        b.appendChild($('div', t('signal_cause') + ': ' + String(r.cause), 'sc'));
      }
    }
    b.appendChild($('div', t('read_limit') + ' · ' + t(r.limit_key), 'lim'));
    wrap.appendChild(b);
  });
  parent.appendChild(wrap);
}

/** The global indicator, apart from the four and marked as derived.
 *
 * BOTH published readings are shown, each with its own scale. They run in
 * opposite directions under one name, so showing one alone is how a reader
 * reaches the opposite conclusion from the one the number supports.
 */
function globalIndicator(parent, s) {
  if (!s || !s.readings || !s.readings.length) return;
  heading(parent, 'read_global_section');
  var b = $('div', null, 'read derived');
  b.appendChild($('div', t(s.question_key), 'q'));
  s.readings.forEach(function (r) {
    var line = $('div', null, 'rv2');
    line.appendChild(valueNode(r));
    line.appendChild($('span', t(r.scale_key), 'sc'));
    b.appendChild(line);
  });
  b.appendChild($('div', t('read_limit') + ' · ' + t(s.limit_key), 'lim'));
  parent.appendChild(b);
}

function details(root, m) {
  var d = document.createElement('details');
  d.appendChild($('summary', t('details_summary')));
  var body = $('div');
  body.appendChild($('p', t('details_note'), 'note'));
  var sec = m.secondary;
  if (sec.evaluators && sec.evaluators.length) {
    heading(body, 'section_evaluators');
    var table = document.createElement('table');
    table.className = 'grid';
    var head = document.createElement('tr');
    [t('evaluator_signal'), t('evaluator_name'), t('evaluator_model'), t('evaluator_status'), t('evaluator_reason')]
      .forEach(function (h) { var th = $('th', h); th.setAttribute('scope', 'col'); head.appendChild(th); });
    table.appendChild(head);
    sec.evaluators.forEach(function (e) {
      var tr = document.createElement('tr');
      var first = document.createElement('td'); first.appendChild($('span', e.signal)); tr.appendChild(first);
      [e.evaluator, e.model_used, e.status, e.reason].forEach(function (r) {
        var td = document.createElement('td'); td.appendChild(valueNode(r)); tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    body.appendChild(table);
  }
  heading(body, 'section_identity'); rows(body, sec.identity);
  heading(body, 'section_provenance'); rows(body, sec.provenance);
  if (m.primary.version.scope) {
    rows(body, [m.primary.version.scope.statement, m.primary.version.scope.unchanged]);
  }
  if (sec.published_values && sec.published_values.length) {
    heading(body, 'section_published'); rows(body, sec.published_values);
  }
  bullets(body, 'section_unmodelled', sec.unmodelled_root_fields);
  d.appendChild(body);
  root.appendChild(d);
}

function render(output) {
  LAST = output;
  var m = buildCardModel(output);
  var root = document.getElementById('root');
  root.textContent = '';
  document.documentElement.lang = LANG;

  var head = document.createElement('header');
  head.appendChild($('h1', t('card_title')));
  var toggle = $('button', t('language_toggle'), 'lang');
  toggle.type = 'button';
  toggle.addEventListener('click', function () { LANG = LANG === 'en' ? 'fr' : 'en'; render(LAST); });
  head.appendChild(toggle);
  root.appendChild(head);

  // The weather, in every state including the ones that are not measurements.
  var w = $('div', null, 'weather');
  var skyBox = $('div', null, 'sky');
  skyBox.appendChild(sky(m.weather.state, m.weather.gauges && m.weather.gauges.signals ? m.weather.gauges.signals.fraction : null));
  w.appendChild(skyBox);
  var wText = $('div');
  wText.appendChild($('h2', t(m.weather.title_key)));
  wText.appendChild($('p', t(m.weather.note_key)));
  wText.appendChild($('p', t('weather_rule'), 'rule'));
  w.appendChild(wText);
  root.appendChild(w);

  if (m.state === 'empty') {
    root.appendChild($('p', t('empty_key' in m ? m.empty_key : 'empty'), 'banner'));
    root.appendChild($('footer', t(m.disclaimer_key)));
    return;
  }
  if (m.state === 'error') {
    heading(root, 'section_error');
    var er = [m.error.code, m.error.message];
    if (m.error.upstream) er = er.concat(m.error.upstream);
    rows(root, er);
    root.appendChild($('footer', t(m.disclaimer_key)));
    return;
  }

  var g = m.weather.gauges;
  if (g && (g.checks || g.signals)) {
    var gb = $('div', null, 'gauges');
    gauge(gb, 'checks_ratio', g.checks);
    gauge(gb, 'signals_ratio', g.signals);
    root.appendChild(gb);
  }

  m.banners.forEach(function (b) { root.appendChild($('p', t(b.key), 'banner')); });

  var p = m.primary;

  // The reader arrived with questions. They are answered before the decision,
  // because the decision is what the instrument concluded and these are what
  // it measured — and the global indicator is kept apart from the four so it
  // cannot read as a fifth instrument.
  readings(root, p.readings);
  globalIndicator(root, p.stability);

  heading(root, 'section_decision');
  rows(root, [p.decision.value, p.decision.basis, p.decision.is_measured]);
  bullets(root, 'decision_reasons', p.decision.reasons);

  signals(root, p.signals);

  heading(root, 'section_measurement');
  rows(root, p.measurement);
  bullets(root, 'missing_required_signals', p.lists.missing_required_signals);
  bullets(root, 'degraded_g_inputs', p.lists.degraded_g_inputs);
  bullets(root, 'failed_checks', p.lists.failed_checks);
  if (p.withheld && p.withheld.length) {
    heading(root, 'section_withheld');
    var names = p.withheld.map(function (k) { return t(k); });
    root.appendChild($('p', names.join(' · ')));
    root.appendChild($('p', t('withheld_note'), 'note'));
  }

  heading(root, 'section_version');
  var vrows = [p.version.declared, p.version.expected, p.version.agreement];
  if (p.version.scope) vrows = vrows.concat([p.version.scope.rest, p.version.scope.sse]);
  rows(root, vrows);

  bullets(root, 'section_caveats', m.caveats);

  details(root, m);
  root.appendChild($('footer', t(m.disclaimer_key)));
}

// Two delivery paths, because hosts differ: the shared MCP Apps bridge
// notification, and ChatGPT's window.openai.toolOutput. Whichever arrives is
// used; neither is assumed.
function boot() {
  // English by default, always. The browser's locale is deliberately NOT
  // sniffed: the listing's base text is English, and a card that silently
  // came up in another language would not match what a reviewer was shown.
  // French is one button away.
  try {
    if (window.openai && window.openai.toolOutput) { render(window.openai.toolOutput); return; }
  } catch (e) { /* no host bridge: fall through to the empty state */ }
  render(null);
}
window.addEventListener('message', function (event) {
  var d = event && event.data;
  if (!d) return;
  if (d.method === 'ui/notifications/tool-result' && d.params) { render(d.params.structuredContent); }
  else if (d.type === 'openai:set_globals' && d.globals && d.globals.toolOutput) { render(d.globals.toolOutput); }
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
`;

/** The complete document. Deterministic: same inputs, same bytes, so its
 * SHA-256 is a usable identity for the resource.
 */
export function cardHtml() {
  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>NeoMundi measurement</title>',
    `<style>${STYLE}</style>`,
    '</head><body><div id="root"></div>',
    `<script>${viewModelSource()}\n${RENDERER}</script>`,
    '</body></html>',
  ].join('\n');
}

export const cardSha256 = () => createHash('sha256').update(cardHtml()).digest('hex');

/** What the host is told about this component before it loads it.
 *
 * `inline` and nothing else. The card is a short reading surface meant to sit
 * beside the answer; it has no fullscreen view and no picture-in-picture
 * view, so declaring either would advertise a mode that does not exist.
 * Declaring the one real mode lets the host size the component without first
 * showing a loading state.
 */
export const CARD_DISPLAY_MODES = Object.freeze(['inline']);

/** Handed to the model when the component loads, so it does not narrate the
 * card back in its own words -- which is exactly where a measured and an
 * unmeasured signal get flattened into the same sentence.
 */
export const CARD_WIDGET_DESCRIPTION =
  'A measurement card. Its sky shows HOW MUCH was measured and never what the '
  + 'answer is worth: the same decision with and without checks draws a different '
  + 'sky. It states the decision and the basis it rests on, each signal with its '
  + 'value or the cause of its absence, and the version in effect. Read it as '
  + 'shown: nothing on it is computed or interpreted, an absent value is displayed '
  + 'as not published rather than as a favourable one, and a measurement grants no '
  + 'execution permission.';

/** The resource as MCP serves it.
 *
 * The CSP allow-lists are present and EMPTY on purpose: the card loads
 * nothing, so declaring a domain would widen the policy beyond what the card
 * actually needs. `prefersBorder` is a presentation hint, not a capability.
 *
 * NO `ui.domain` HERE, AND THAT IS A KNOWN GAP. The platform requires a
 * dedicated origin, unique per plugin, when a plugin with UI is SUBMITTED;
 * absent that field the component is served from the host's default sandbox
 * origin. A dedicated origin is a hostname decision, not a code decision, so
 * inventing one here would declare an origin nobody controls. It is tracked
 * as a submission prerequisite in PLUGIN_SUBMISSION_CHECKLIST.md.
 */
export function cardResource() {
  return {
    uri: CARD_RESOURCE_URI,
    name: CARD_RESOURCE_NAME,
    description: CARD_RESOURCE_DESCRIPTION,
    mimeType: CARD_MIME_TYPE,
    text: cardHtml(),
    _meta: {
      ui: {
        prefersBorder: true,
        csp: { connectDomains: [], resourceDomains: [] },
      },
      'openai/ui': { availableDisplayModes: [...CARD_DISPLAY_MODES] },
      'openai/widgetDescription': CARD_WIDGET_DESCRIPTION,
    },
  };
}
