/** The MCP UI resource: a measurement card, as one self-contained document.
 *
 * HOW IT REACHES A READER. The tool declares this resource's URI in its
 * `_meta`; the host fetches the resource once and renders it beside the tool
 * result, handing the structured output to the document at runtime. The URI is
 * therefore a cache key: a breaking change to the card publishes a NEW uri
 * rather than editing this one in place.
 *
 * SELF-CONTAINED BY REQUIREMENT. No stylesheet, font, script or image is
 * fetched: the host applies a strict content policy, and this connector has no
 * runtime dependencies to begin with. Everything is inlined here, and the
 * declared CSP allow-lists are empty because nothing is loaded.
 *
 * NO VALUE IS WRITTEN AS MARKUP. Every server-supplied string reaches the
 * document through `textContent`, never `innerHTML`. A measurement can contain
 * an arbitrary prompt and an arbitrary model response — that is the point of
 * the tool — so the card treats all of it as hostile text.
 *
 * NO TRAFFIC LIGHT. The brand foundation forbids one, and so does the
 * metrology: a green badge on an `ALLOW` that was never evaluated would be the
 * exact lie this card exists to prevent. Conditions are stated in words, with
 * typographic weight only.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** Versioned, and treated as a cache key. Bump the version on any breaking
 * change to the card's contract with the host — never silently reuse it.
 */
export const CARD_RESOURCE_URI = 'ui://neomundi-measurement/card-v1.html';

/** The MCP Apps mime type. The host recognises a UI resource by this, not by
 * the file extension in the URI.
 */
export const CARD_MIME_TYPE = 'text/html;profile=mcp-app';

export const CARD_RESOURCE_NAME = 'Carte de mesure NeoMundi';
export const CARD_RESOURCE_DESCRIPTION = 'Rendu lisible d’une mesure NeoMundi : '
  + 'décision et son fondement, état de la mesure, signaux mesurés et non mesurés '
  + 'avec leur cause, provenance et limites déclarées. Aucune valeur n’est calculée '
  + 'ni interprétée.';

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

const STYLE = `
:root{
  --nm-bg:#ffffff; --nm-fg:#14161a; --nm-muted:#5b6370; --nm-rule:#d8dce3;
  --nm-accent:#1b4965; --nm-flag-bg:#f4f6f8; --nm-absent:#8b929d;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --nm-bg:#05070d; --nm-fg:#e8ecf2; --nm-muted:#9aa3b2; --nm-rule:#242a36;
    --nm-accent:#7fb2cc; --nm-flag-bg:#101520; --nm-absent:#6b7480;
  }
}
:root[data-theme="dark"]{
  --nm-bg:#05070d; --nm-fg:#e8ecf2; --nm-muted:#9aa3b2; --nm-rule:#242a36;
  --nm-accent:#7fb2cc; --nm-flag-bg:#101520; --nm-absent:#6b7480;
}
*{box-sizing:border-box}
body{margin:0;background:var(--nm-bg);color:var(--nm-fg);
  font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  padding:16px}
h1{font-size:15px;letter-spacing:.02em;margin:0 0 2px;font-weight:650}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--nm-muted);
  margin:18px 0 6px;font-weight:600}
.sub{color:var(--nm-muted);font-size:12px;margin:0 0 4px}
.banner{border-left:3px solid var(--nm-accent);background:var(--nm-flag-bg);
  padding:8px 10px;margin:8px 0;font-weight:600}
dl{display:grid;grid-template-columns:minmax(9rem,auto) 1fr;gap:2px 14px;margin:0}
dt{color:var(--nm-muted)}
dd{margin:0;overflow-wrap:anywhere}
.absent{color:var(--nm-absent);font-style:italic}
ul{margin:4px 0;padding-left:18px}
li{overflow-wrap:anywhere}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:4px 8px 4px 0;border-bottom:1px solid var(--nm-rule);
  vertical-align:top;overflow-wrap:anywhere}
th{color:var(--nm-muted);font-weight:600}
.scroll{overflow-x:auto}
footer{margin-top:20px;padding-top:10px;border-top:1px solid var(--nm-rule);
  color:var(--nm-muted);font-size:12px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
`;

/** The renderer. Builds nodes and assigns text; it never concatenates markup.
 *
 * Kept as a string so the whole card is one resource with no build step: this
 * connector ships no bundler and adds no dependency to render a card.
 */
const RENDERER = String.raw`
var $ = function (tag, text, cls) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
};
// A value is rendered, or its absence is rendered. Never a stand-in.
function valueNode(r) {
  if (!r || r.published !== true) return $('span', NOT_PUBLISHED, 'absent');
  var v = r.value;
  if (typeof v === 'boolean') return $('span', v ? 'oui' : 'non');
  if (v !== null && typeof v === 'object') return $('code', JSON.stringify(v));
  return $('span', String(v));
}
function rows(parent, list) {
  if (!list || !list.length) return;
  var dl = $('dl');
  list.forEach(function (r) {
    dl.appendChild($('dt', r.label));
    var dd = $('dd');
    dd.appendChild(valueNode(r));
    dl.appendChild(dd);
  });
  parent.appendChild(dl);
}
function section(parent, title) {
  parent.appendChild($('h2', title));
}
function bullets(parent, title, items) {
  if (!items || !items.length) return;
  section(parent, title);
  var ul = $('ul');
  items.forEach(function (i) {
    ul.appendChild($('li', typeof i === 'object' ? JSON.stringify(i) : i));
  });
  parent.appendChild(ul);
}

function render(output) {
  var m = buildCardModel(output);
  var root = document.getElementById('root');
  root.textContent = '';

  root.appendChild($('h1', 'Mesure NeoMundi'));

  if (m.state !== 'measurement') {
    root.appendChild($('p', m.empty, 'banner'));
    if (m.state === 'error' && m.error) {
      section(root, 'Erreur');
      var er = [m.error.code, m.error.message].filter(Boolean);
      if (m.error.upstream) er = er.concat(m.error.upstream);
      rows(root, er);
    }
    root.appendChild($('footer', m.disclaimer));
    return;
  }

  // Conditions first: each one changes how every figure below must be read.
  m.banners.forEach(function (b) { root.appendChild($('p', b.text, 'banner')); });

  section(root, 'Décision');
  rows(root, [m.decision.value, m.decision.basis, m.decision.is_measured]);
  bullets(root, 'Motifs déclarés', m.decision.reasons);

  section(root, 'État de la mesure');
  rows(root, m.measurement);
  bullets(root, 'Signaux requis manquants', m.lists.missing_required_signals);
  bullets(root, 'Entrées dégradées du G', m.lists.degraded_g_inputs);
  bullets(root, 'Contrôles en échec', m.lists.failed_checks);

  if (m.signals.measured.length) {
    section(root, 'Signaux mesurés');
    rows(root, m.signals.measured);
  }
  // Names only: the server listed which signals were measured without
  // attaching values here. Shown as a list, never as empty value rows.
  bullets(root, 'Signaux mesurés', m.signals.measured_names);
  // Never merged with the measured list, and never shown as a value: an
  // unmeasured signal is a named absence with a named cause.
  if (m.signals.unmeasured.length) {
    section(root, 'Signaux non mesurés');
    var wrap = $('div', null, 'scroll');
    var t = $('table');
    var hr = document.createElement('tr');
    hr.appendChild($('th', 'Signaux non mesurés'));
    hr.appendChild($('th', 'cause'));
    t.appendChild(hr);
    m.signals.unmeasured.forEach(function (u) {
      var tr = document.createElement('tr');
      tr.appendChild($('td', u.name === null ? NOT_PUBLISHED : u.name));
      var td = $('td');
      td.appendChild(valueNode({ published: u.cause !== null && u.cause !== undefined, value: u.cause }));
      tr.appendChild(td);
      t.appendChild(tr);
    });
    wrap.appendChild(t);
    root.appendChild(wrap);
  }

  section(root, 'Provenance');
  rows(root, m.provenance);
  if (m.evaluators.length) {
    section(root, 'Évaluateurs');
    var ew = $('div', null, 'scroll');
    var et = $('table');
    var ehr = document.createElement('tr');
    ['Signaux mesurés', 'Évaluateurs', 'Modèle', 'État de la mesure', 'cause'].forEach(function (h) {
      ehr.appendChild($('th', h));
    });
    et.appendChild(ehr);
    m.evaluators.forEach(function (e) {
      var tr = document.createElement('tr');
      tr.appendChild($('td', e.signal));
      [e.evaluator, e.model_used, e.status, e.reason].forEach(function (r) {
        var td = $('td'); td.appendChild(valueNode(r)); tr.appendChild(td);
      });
      et.appendChild(tr);
    });
    ew.appendChild(et);
    root.appendChild(ew);
  }

  if (m.published_values.length) {
    section(root, 'Valeurs publiées');
    rows(root, m.published_values);
  }
  bullets(root, 'Limites connues', m.caveats);
  bullets(root, 'Champs non modélisés', m.unmodelled_root_fields);

  root.appendChild($('footer', m.disclaimer));
}

// Two delivery paths, because hosts differ: the shared MCP Apps bridge
// notification, and ChatGPT's window.openai.toolOutput. Whichever arrives is
// used; neither is assumed.
function boot() {
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
    '<html lang="fr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Mesure NeoMundi</title>',
    `<style>${STYLE}</style>`,
    '</head><body><div id="root"></div>',
    `<script>${viewModelSource()}\n${RENDERER}</script>`,
    '</body></html>',
  ].join('\n');
}

export const cardSha256 = () => createHash('sha256').update(cardHtml()).digest('hex');

/** The resource as MCP serves it.
 *
 * The CSP allow-lists are present and EMPTY on purpose: the card loads
 * nothing, so declaring a domain would widen the policy beyond what the card
 * actually needs. `prefersBorder` is a presentation hint, not a capability.
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
    },
  };
}
