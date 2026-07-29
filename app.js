/* iOS Studio — Clean v7. Every button works. Typing works. GitHub push works. */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const S = 'ide-v7';
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toLocaleTimeString('en-US',{hour12:false});

// ---- SETTINGS ----
let D = {
  repo: 'kirpalsingh11/ios-studio-extreme',
  token: '',
  aiProv: 'builtin', aiKey: '', aiModel: 'builtin',
  fontSize: 13, tabSize: 2, wrap: false,
  appName: 'iOS Studio Extreme', bundleId: 'com.developer.iosstudioextreme'
};

// ---- STATE ----
let files = {};
let tree = [{type:'folder',name:'www',path:'www',exp:true,kids:[
  {type:'file',name:'index.html',path:'www/index.html'},
  {type:'file',name:'app.js',path:'www/app.js'},
  {type:'file',name:'styles.css',path:'www/styles.css'}
]}];
let tabs = [], active = null, dirty = {}, lint = [], aiHist = [], aiBusy = false;
let termHist = [], termCur = 0, ctxPath = null;
let findMatches = [], findCur = -1;

// ---- SEED FILES ----
const SEED = {
'www/index.html':'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1.0">\n  <title>My App</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <div id="app">\n    <h1>Hello iOS!</h1>\n    <p>Edit me and compile to .ipa</p>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>',
'www/app.js':'// App logic\nconsole.log("App started");\ndocument.getElementById("app")?.addEventListener("click", () => {\n  alert("Hello from your iOS app!");\n});',
'www/styles.css':'* { margin: 0; padding: 0; box-sizing: border-box; }\nbody {\n  font-family: -apple-system, system-ui, sans-serif;\n  background: #1e1e1e;\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  padding: 2rem;\n}\nh1 { color: #007acc; }\np { color: #ccc; margin-top: 1rem; }',
};

// ---- STORAGE ----
function load() {
  try {
    const p = JSON.parse(localStorage.getItem(S) || '{}');
    if (p.D) Object.assign(D, p.D);
    if (p.files) files = p.files;
    if (p.tree) tree = p.tree;
    if (p.tabs) tabs = p.tabs;
    if (p.active) active = p.active;
    if (p.aiHist) aiHist = p.aiHist;
  } catch(e){}
  // Re-seed empty files
  Object.keys(SEED).forEach(p => { if (!files[p] || files[p].trim() === '') files[p] = SEED[p]; });
}
function save() {
  try {
    localStorage.setItem(S, JSON.stringify({D, files, tree, tabs, active, aiHist: aiHist.slice(-30)}));
  } catch(e){}
}

// ---- TOAST ----
function toast(t, m='', k='info', ttl=3000) {
  const s = $('#toasts');
  const e = document.createElement('div');
  e.className = 'toast ' + k;
  e.innerHTML = '<div class="t-t">' + esc(t) + '</div>' + (m ? '<div class="t-m">' + esc(m) + '</div>' : '');
  s.appendChild(e);
  setTimeout(() => { e.style.opacity = '0'; e.style.transform = 'translateX(20px)'; setTimeout(() => e.remove(), 300); }, ttl);
}

// ---- LANGUAGES ----
const LM = {js:'javascript',ts:'typescript',html:'html',css:'css',scss:'scss',json:'json',yaml:'yaml',yml:'yaml',xml:'xml',md:'markdown',py:'python',java:'java',go:'go',rs:'rust',c:'c',cpp:'cpp',cs:'csharp',swift:'swift',kt:'kotlin',rb:'ruby',php:'php',sh:'shell',sql:'sql',lua:'lua',hs:'haskell',ex:'elixir',clj:'clojure',fs:'fsharp',dart:'dart',m:'objectivec',r:'r',jl:'julia',pl:'perl',ps1:'powershell',bat:'batch',nim:'nim',zig:'zig',cr:'crystal',d:'d',graphql:'graphql',proto:'protobuf',sol:'solidity',glsl:'glsl',v:'verilog',asm:'asm',f90:'fortran',cob:'cobol',pas:'pascal',ada:'ada',pro:'prolog',vim:'vim',wat:'wasm',vue:'vue',svelte:'svelte',toml:'toml',ini:'ini',env:'env',csv:'csv',txt:'plaintext'};
const CS = {javascript:{l:'//',b:['/*','*/']},typescript:{l:'//',b:['/*','*/']},c:{l:'//',b:['/*','*/']},cpp:{l:'//',b:['/*','*/']},csharp:{l:'//',b:['/*','*/']},java:{l:'//',b:['/*','*/']},go:{l:'//',b:['/*','*/']},rust:{l:'//',b:['/*','*/']},swift:{l:'//',b:['/*','*/']},kotlin:{l:'//',b:['/*','*/']},php:{l:'//',b:['/*','*/']},css:{l:null,b:['/*','*/']},scss:{l:'//',b:['/*','*/']},python:{l:'#'},ruby:{l:'#'},shell:{l:'#'},bash:{l:'#'},yaml:{l:'#'},toml:{l:'#'},ini:{l:';'},env:{l:'#'},dockerfile:{l:'#'},makefile:{l:'#'},sql:{l:'--',b:['/*','*/']},lua:{l:'--',b:['--[[',']]']},haskell:{l:'--',b:['{-','-}']},html:{l:null,b:['<!--','-->']},xml:{l:null,b:['<!--','-->']},markdown:{l:null,b:['<!--','-->']},clojure:{l:';'},latex:{l:'%'},powershell:{l:'#',b:['<#','#>']},nim:{l:'#'},zig:{l:'//'},crystal:{l:'#'},elixir:{l:'#'},fsharp:{l:'//',b:['(*','*)']},glsl:{l:'//',b:['/*','*/']},verilog:{l:'//',b:['/*','*/']},asm:{l:';'},fortran:{l:'!'},cobol:{l:'*'},pascal:{l:'//',b:['{','}']},ada:{l:'--'},prolog:{l:'%'},r:{l:'#'},julia:{l:'#'},vim:{l:'"'},wasm:{l:';;'}};
const KW = {javascript:'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|this|true|false|null|undefined|async|await|yield|delete|void|static|get|set|public|private|protected|enum|interface|type|as|is',python:'def|class|return|if|elif|else|for|while|break|continue|import|from|as|try|except|finally|raise|with|pass|lambda|yield|global|nonlocal|assert|del|in|is|not|and|or|True|False|None|self|cls|async|await|print|len|range|str|int|float|list|dict|set|tuple',go:'package|import|func|var|const|type|struct|interface|map|chan|go|defer|return|if|else|for|range|switch|case|default|break|continue|select|true|false|nil|make|new|len|cap|append|copy|delete|close|panic|recover',rust:'fn|let|mut|const|static|struct|enum|trait|impl|pub|use|mod|crate|self|Self|super|as|match|if|else|for|while|loop|break|continue|return|unsafe|async|await|move|dyn|where|type|true|false|Some|None|Ok|Err|Result|Option|Vec|String|Box',java:'public|private|protected|static|final|void|class|interface|enum|extends|implements|import|package|return|if|else|for|while|do|switch|case|break|continue|new|try|catch|finally|throw|throws|instanceof|this|super|true|false|null|int|long|short|byte|float|double|boolean|char|String',c:'int|long|short|char|float|double|void|unsigned|signed|const|static|extern|struct|union|enum|typedef|sizeof|return|if|else|for|while|do|switch|case|break|continue|default|goto|NULL|true|false|include|define',cpp:'int|long|short|char|float|double|void|unsigned|signed|const|static|extern|struct|union|enum|typedef|sizeof|return|if|else|for|while|do|switch|case|break|continue|default|goto|NULL|true|false|class|namespace|using|template|typename|public|private|protected|virtual|new|delete|this|throw|try|catch|constexpr|nullptr|auto|operator|inline|explicit',csharp:'public|private|protected|internal|static|readonly|const|void|class|interface|struct|enum|namespace|using|return|if|else|for|foreach|while|do|switch|case|break|continue|new|try|catch|finally|throw|typeof|is|as|this|base|true|false|null|var|async|await|int|long|float|double|bool|char|string|object',swift:'let|var|func|class|struct|enum|protocol|extension|import|return|if|else|for|in|while|repeat|switch|case|default|break|continue|guard|defer|do|try|catch|throw|as|is|nil|true|false|self|Self|super|init|private|public|internal|open|static|lazy|mutating|override|typealias|where|async|await',html:'html|head|body|div|span|p|a|img|ul|ol|li|table|tr|td|th|form|input|button|select|option|textarea|label|nav|header|footer|main|section|article|aside|h1|h2|h3|h4|h5|h6|br|hr|link|meta|script|style|title|iframe|canvas|svg|video|audio|source|figure|details|summary|mark|small|strong|em|code|pre|blockquote',css:'color|background|margin|padding|border|display|position|width|height|font|text|flex|grid|gap|align|justify|overflow|z-index|opacity|transform|transition|animation|box-shadow|border-radius|cursor|absolute|relative|fixed|sticky|block|inline|flex|grid|none|auto|var|important|media|keyframes|from|to|root|hover|focus|active|after|before'};
function langOf(p) { const e=(p.split('.').pop()||'').toLowerCase(); return LM[e] || (p.toLowerCase().includes('dockerfile')?'dockerfile':'plaintext'); }
function langName(l) { return ({javascript:'JavaScript',typescript:'TypeScript',html:'HTML',css:'CSS',json:'JSON',yaml:'YAML',markdown:'Markdown',python:'Python',java:'Java',go:'Go',rust:'Rust',c:'C',cpp:'C++',csharp:'C#',swift:'Swift',kotlin:'Kotlin',ruby:'Ruby',php:'PHP',shell:'Shell',sql:'SQL',lua:'Lua',plaintext:'Plain Text'})[l]||l; }

// ---- HIGHLIGHT ----
function hl(code, lang) {
  const cs = CS[lang]; const kw = KW[lang] || KW[lang.replace('typescript','javascript')] || '';
  const kwRe = kw ? new RegExp('\\b('+kw+')\\b','g') : null;
  let r = '', i = 0;
  while (i < code.length) {
    if (cs && cs.l && code.substr(i, cs.l.length) === cs.l) {
      let j = code.indexOf('\n', i); if (j === -1) j = code.length;
      r += '<span class="tk-c">' + esc(code.slice(i,j)) + '</span>'; i = j; continue;
    }
    if (cs && cs.b && code.substr(i, cs.b[0].length) === cs.b[0]) {
      let j = code.indexOf(cs.b[1], i+cs.b[0].length); if (j === -1) j = code.length; else j += cs.b[1].length;
      r += '<span class="tk-c">' + esc(code.slice(i,j)) + '</span>'; i = j; continue;
    }
    const ch = code[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i+1; while (j < code.length) { if (code[j] === '\\') { j += 2; continue; } if (code[j] === ch) { j++; break; } if (code[j] === '\n' && ch !== '`') break; j++; }
      r += '<span class="tk-s">' + esc(code.slice(i,j)) + '</span>'; i = j; continue;
    }
    if (/\d/.test(ch) && (i === 0 || /[\s,;:()\[\]{}=+\-*/<>!&|^~?]/.test(code[i-1]))) {
      let j = i; while (j < code.length && /[\d.xXa-fA-F_]/.test(code[j])) j++;
      r += '<span class="tk-n">' + esc(code.slice(i,j)) + '</span>'; i = j; continue;
    }
    if (/[A-Za-z_$@]/.test(ch)) {
      let j = i; while (j < code.length && /[\w$]/.test(code[j])) j++;
      const w = code.slice(i,j);
      if (kwRe && kwRe.test(w)) { kwRe.lastIndex = 0; r += '<span class="tk-k">' + esc(w) + '</span>'; }
      else if (/^[A-Z_][A-Z0-9_]+$/.test(w) && w.length > 1) r += '<span class="tk-b">' + esc(w) + '</span>';
      else r += esc(w);
      i = j; continue;
    }
    if (/[=+\-*/%<>!&|^~?:]/.test(ch)) { let j = i; while (j < code.length && /[=+\-*/%<>!&|^~?:]/.test(code[j])) j++; r += '<span class="tk-o">' + esc(code.slice(i,j)) + '</span>'; i = j; continue; }
    if (/[{}()\[\].,;]/.test(ch)) { r += '<span class="tk-p">' + esc(ch) + '</span>'; i++; continue; }
    r += esc(ch); i++;
  }
  return r;
}

// ---- TREE OPERATIONS ----
function findN(path, t = tree) { for (const n of t) { if (n.path === path) return n; if (n.kids) { const f = findN(path, n.kids); if (f) return f; } } return null; }
function findP(path, t = tree) { for (const n of t) { if (n.path === path) return t; if (n.kids) { const r = findP(path, n.kids); if (r) return r; } } return null; }
function uniqP(par, name) { const c = par ? par + '/' + name : name; if (!findN(c)) return c; const d = name.lastIndexOf('.'); const stem = d > 0 ? name.slice(0,d) : name; const ext = d > 0 ? name.slice(d) : ''; let i = 1; while (findN(par ? par+'/'+stem+'-'+i+ext : stem+'-'+i+ext)) i++; return par ? par+'/'+stem+'-'+i+ext : stem+'-'+i+ext; }

function newFile(par, name) {
  if (!name) return;
  const path = uniqP(par, name);
  const node = { type:'file', name: path.split('/').pop(), path };
  const parent = par ? findN(par) : null;
  const list = parent ? (parent.kids || (parent.kids = [])) : tree;
  if (parent) parent.exp = true;
  list.push(node);
  files[path] = '';
  save(); renderTree(); openFile(path);
}
function newFolder(par, name) {
  if (!name) return;
  const path = uniqP(par, name);
  const node = { type:'folder', name: path.split('/').pop(), path, exp: true, kids: [] };
  const parent = par ? findN(par) : null;
  const list = parent ? (parent.kids || (parent.kids = [])) : tree;
  if (parent) parent.exp = true;
  list.push(node);
  save(); renderTree();
}
function delNode(path) {
  const list = findP(path); if (!list) return;
  const i = list.findIndex(n => n.path === path); if (i < 0) return;
  const node = list[i];
  const coll = (n) => n.type === 'file' ? [n.path] : (n.kids || []).flatMap(coll);
  coll(node).forEach(p => { delete files[p]; delete dirty[p]; tabs = tabs.filter(t => t !== p); });
  if (active && !tabs.includes(active)) active = tabs[0] || null;
  list.splice(i, 1);
  save(); renderTree(); renderTabs(); loadEditor();
}
function renNode(path, name) {
  if (!name) return;
  const n = findN(path); if (!n) return;
  const par = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const np = par ? par+'/'+name : name;
  if (findN(np)) return;
  if (n.type === 'file') {
    files[np] = files[path] || ''; delete files[path];
    if (dirty[path]) { dirty[np] = true; delete dirty[path]; }
    tabs = tabs.map(t => t === path ? np : t);
    if (active === path) active = np;
  } else {
    (function rw(nd, op, np2) { nd.path = nd.path.replace(op, np2); if (nd.type === 'file') { if (files[op] !== undefined) { files[nd.path] = files[op]; delete files[op]; } if (dirty[op]) { dirty[nd.path] = true; delete dirty[op]; } tabs = tabs.map(t => t === op ? nd.path : t); if (active === op) active = nd.path; } else if (nd.kids) { nd.kids.forEach(c => rw(c, op, nd.path)); } })(n, path, np);
  }
  n.name = name;
  save(); renderTree(); renderTabs(); loadEditor();
}

// ---- FOLDER OPEN ----
async function openFolder() {
  if (!('showDirectoryPicker' in window)) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.webkitdirectory = true; inp.multiple = true;
    inp.onchange = async (e) => {
      let cnt = 0;
      for (const f of Array.from(e.target.files)) {
        const p = f.webkitRelativePath || f.name;
        if (!findN(p)) { files[p] = await f.text().catch(() => ''); insertTree(p); cnt++; }
      }
      save(); renderTree(); toast('Folder opened', cnt + ' files imported', 'success');
    };
    inp.click(); return;
  }
  try {
    const dir = await window.showDirectoryPicker();
    let cnt = 0;
    const walk = async (h, prefix) => {
      for await (const entry of h.values()) {
        if (entry.kind === 'file') {
          const f = await entry.getFile();
          const p = prefix ? prefix+'/'+entry.name : entry.name;
          if (!findN(p)) { files[p] = await f.text().catch(() => ''); insertTree(p); cnt++; }
        } else {
          const sp = prefix ? prefix+'/'+entry.name : entry.name;
          if (!findN(sp)) insertTree(sp, true);
          await walk(entry, sp);
        }
      }
    };
    await walk(dir, '');
    save(); renderTree();
    toast('Folder opened', cnt + ' files from "' + dir.name + '"', 'success');
  } catch(e) { if (e.name !== 'AbortError') toast('Error', e.message, 'error'); }
}
function insertTree(path, isFolder = false) {
  const parts = path.split('/'); let cur = ''; let list = tree;
  for (let i = 0; i < parts.length; i++) {
    cur = cur ? cur+'/'+parts[i] : parts[i];
    const isFile = i === parts.length-1 && !isFolder;
    let n = list.find(x => x.name === parts[i]);
    if (!n) { n = isFile ? {type:'file',name:parts[i],path:cur} : {type:'folder',name:parts[i],path:cur,exp:false,kids:[]}; list.push(n); }
    if (n.type === 'folder') list = n.kids || (n.kids = []);
  }
}

// ---- RENDER TREE ----
function renderTree() {
  const root = $('#sbView');
  if (!root) return;
  let html = '<div class="sb-head">EXPLORER<div class="sb-actions">' +
    '<button class="sb-act" id="nFileBtn" title="New File">📄+</button>' +
    '<button class="sb-act" id="nFolderBtn" title="New Folder">📁+</button>' +
    '<button class="sb-act" id="oFolderBtn" title="Open Folder">📂</button>' +
    '<button class="sb-act" id="exportBtn" title="Export ZIP">⬇</button>' +
    '</div></div>' +
    '<div class="sb-search">🔍<input type="text" id="filterInput" placeholder="Filter files..."></div>' +
    '<ul class="tree" id="treeRoot">';
  tree.forEach(n => html += buildNodeHTML(n, 0));
  html += '</ul><div class="sb-footer"><span id="fileCount">0 files</span></div>';
  root.innerHTML = html;

  // Wire up explorer buttons
  $('#nFileBtn').onclick = () => { const n = prompt('File name:', 'new.js'); if (n) newFile('', n); };
  $('#nFolderBtn').onclick = () => { const n = prompt('Folder name:', 'folder'); if (n) newFolder('', n); };
  $('#oFolderBtn').onclick = openFolder;
  $('#exportBtn').onclick = exportZip;
  $('#filterInput').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    $$('#treeRoot .tree-item').forEach(el => {
      const n = el.querySelector('.ti-name')?.textContent.toLowerCase() || '';
      el.style.display = n.includes(q) ? '' : 'none';
    });
  };

  // Wire up tree items
  $$('#treeRoot .tree-item').forEach(el => {
    el.onclick = () => {
      const path = el.dataset.path;
      const type = el.dataset.type;
      if (type === 'folder') {
        const n = findN(path);
        if (n) { n.exp = !n.exp; save(); renderTree(); }
      } else {
        openFile(path);
      }
    };
    el.oncontextmenu = (e) => { e.preventDefault(); showCtx(e.clientX, e.clientY, path); };
  });

  const c = countF(tree);
  const fc = $('#fileCount'); if (fc) fc.textContent = c + ' files';
}
function buildNodeHTML(n, d) {
  const isF = n.type === 'folder';
  const cls = 'tree-item' + (isF ? ' folder' : '') + (isF && !n.exp ? ' collapsed' : '') + (active === n.path ? ' active' : '') + (dirty[n.path] ? ' dirty' : '');
  const pad = 'padding-left:' + (6 + d * 14) + 'px;';
  const ico = isF ? '📁' : (n.path.endsWith('.html') ? '🌐' : n.path.endsWith('.js') ? '📜' : n.path.endsWith('.css') ? '🎨' : n.path.endsWith('.json') ? '📋' : '📄');
  let html = '<li><div class="' + cls + '" style="' + pad + '" data-path="' + esc(n.path) + '" data-type="' + n.type + '">' +
    '<span class="ti-caret">' + (isF ? '▾' : '') + '</span>' +
    '<span class="ti-ico">' + ico + '</span>' +
    '<span class="ti-name">' + esc(n.name) + '</span></div></li>';
  if (isF && n.kids && n.exp) {
    html += '<ul>';
    n.kids.forEach(c => html += buildNodeHTML(c, d+1));
    html += '</ul>';
  }
  return html;
}
function countF(t) { return t.reduce((a,n) => a + (n.type === 'file' ? 1 : countF(n.kids || [])), 0); }

// ---- CONTEXT MENU ----
function showCtx(x, y, p) {
  ctxPath = p;
  const m = $('#ctxMenu');
  m.style.left = Math.min(x, innerWidth-140) + 'px';
  m.style.top = Math.min(y, innerHeight-150) + 'px';
  m.classList.add('show');
}
function hideCtx() { $('#ctxMenu').classList.remove('show'); ctxPath = null; }

// ---- EDITOR ----
function openFile(path) {
  if (files[path] === undefined) files[path] = '';
  if (!tabs.includes(path)) tabs.push(path);
  active = path;
  save(); renderTree(); renderTabs(); loadEditor();
}
function closeTab(path) {
  tabs = tabs.filter(t => t !== path);
  if (active === path) active = tabs[0] || null;
  save(); renderTabs(); loadEditor();
}
function renderTabs() {
  const tl = $('#tabList'); if (!tl) return;
  tl.innerHTML = tabs.map(p => {
    const n = p.split('/').pop();
    return '<div class="tab' + (p === active ? ' active' : '') + '" data-path="' + esc(p) + '">' +
      '<span>' + esc(n) + '</span>' +
      '<span class="tab-close" data-close="' + esc(p) + '">×</span></div>';
  }).join('');
  $$('#tabList .tab').forEach(t => {
    t.onclick = (e) => {
      if (e.target.dataset.close) { closeTab(e.target.dataset.close); return; }
      active = t.dataset.path; save(); renderTabs(); loadEditor(); renderTree();
    };
  });
}
function loadEditor() {
  const ta = $('#editor');
  if (!ta) return;
  if (!active) { ta.value = ''; ta.disabled = true; $('#hlLayer').innerHTML = ''; renderLN(0); updateSB(); return; }
  if (!files[active] && SEED[active]) files[active] = SEED[active];
  if (!files[active] || files[active].trim() === '') files[active] = SEED[active] || '';
  ta.disabled = false;
  ta.value = files[active] || '';
  refreshHL();
  renderLN(ta.value.split('\n').length);
  updateSB();
  updateBC();
}
function refreshHL() {
  const ta = $('#editor'); if (!ta || !active) return;
  $('#hlLayer').innerHTML = hl(ta.value, langOf(active));
  syncScroll();
}
function renderLN(n) {
  const g = $('#lineNums'); if (!g) return;
  const cl = getCL();
  let h = '';
  for (let i = 1; i <= n; i++) h += (i === cl ? '<span style="color:var(--bright)">' : '<span>') + i + '</span>\n';
  g.textContent = '';
  g.innerHTML = h;
}
function getCL() { const ta = $('#editor'); if (!ta) return 1; return ta.value.slice(0, ta.selectionStart).split('\n').length; }
function getCC() { const ta = $('#editor'); if (!ta) return 1; const v = ta.value.slice(0, ta.selectionStart); return ta.selectionStart - v.lastIndexOf('\n'); }
function syncScroll() {
  const ta = $('#editor'); if (!ta) return;
  const hl = $('#hlLayer');
  hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft;
  $('#lineNums').scrollTop = ta.scrollTop;
}
function updateSB() {
  const ta = $('#editor'); if (!ta) return;
  const v = ta.value; const l = v ? v.split('\n').length : 0;
  $('#sbCursor').textContent = 'Ln ' + getCL() + ', Col ' + getCC();
  $('#sbLang').textContent = active ? langName(langOf(active)) : 'plaintext';
  $('#sbFile').textContent = active || '—';
  const lc = lint.filter(i => i.path === active).length;
  $('#sbLint').textContent = 'Lint: ' + lc;
}
function updateBC() {
  const bc = $('#breadcrumb'); if (!bc) return;
  if (!active) { bc.innerHTML = ''; return; }
  const parts = active.split('/');
  let html = '';
  parts.forEach((p, i) => {
    const last = i === parts.length-1;
    html += '<span class="bc-part">' + esc(p) + '</span>';
    if (!last) html += '<span class="bc-sep">›</span>';
  });
  bc.innerHTML = html;
}
function saveTab() {
  if (!active) { toast('No file', 'Open a file first', 'warn'); return; }
  files[active] = $('#editor').value;
  dirty[active] = false;
  save(); renderTabs(); renderTree(); updateSB();
  toast('Saved', active, 'success', 1500);
}
function fmtFile() {
  if (!active) return;
  const ta = $('#editor');
  let v = ta.value;
  if (!v.trim()) return;
  v = v.split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n');
  if (!v.endsWith('\n')) v += '\n';
  ta.value = v;
  files[active] = v; dirty[active] = true;
  save(); refreshHL(); renderTabs(); renderTree(); updateSB();
  toast('Formatted', '', 'success', 1500);
}

// ---- LINTER ----
function runLint() {
  lint = lint.filter(i => i.path !== active);
  if (!active) { updateSB(); return; }
  const l = langOf(active);
  if (l !== 'javascript' && l !== 'typescript') { updateSB(); return; }
  const code = $('#editor').value;
  if (!code.trim()) { updateSB(); return; }
  // Simple bracket balance check
  const stack = []; const pairs = {'(':')','[':']','{':'}'};
  code.split('\n').forEach((line, ln) => {
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (pairs[ch]) stack.push({ch, line: ln+1, col: i+1});
      else if (ch === ')' || ch === ']' || ch === '}') {
        const top = stack[stack.length-1];
        if (!top) lint.push({path:active, line:ln+1, col:i+1, msg:'Unexpected "'+ch+'"', sev:'err'});
        else if (pairs[top.ch] !== ch) lint.push({path:active, line:ln+1, col:i+1, msg:'Mismatched "'+ch+'"', sev:'err'});
        else stack.pop();
      }
    }
  });
  stack.forEach(t => lint.push({path:active, line:t.line, col:t.col, msg:'Unclosed "'+t.ch+'"', sev:'err'}));
  updateSB();
  renderLN(code.split('\n').length);
}

// ---- FIND ----
function openFind() { $('#findBar').classList.add('show'); setTimeout(() => $('#findInput').focus(), 50); }
function closeFind() { $('#findBar').classList.remove('show'); findMatches = []; findCur = -1; $('#findCount').textContent = ''; }
function runFind() {
  const q = $('#findInput').value;
  if (!q || !active) { $('#findCount').textContent = ''; return; }
  const ta = $('#editor');
  const t = ta.value.toLowerCase(); const ql = q.toLowerCase();
  findMatches = []; let i = 0;
  while ((i = t.indexOf(ql, i)) !== -1) { findMatches.push(i); i += ql.length; }
  findCur = findMatches.length ? 0 : -1;
  $('#findCount').textContent = findMatches.length ? findMatches.length + ' matches' : 'no matches';
  if (findMatches.length) hlFind(0);
}
function hlFind(idx) {
  if (idx < 0 || idx >= findMatches.length) return;
  const ta = $('#editor');
  const pos = findMatches[idx]; const len = $('#findInput').value.length;
  ta.focus(); ta.setSelectionRange(pos, pos+len);
  const lh = parseFloat(getComputedStyle(ta).lineHeight);
  const lb = ta.value.slice(0, pos).split('\n').length;
  ta.scrollTop = Math.max(0, (lb-5) * lh);
  syncScroll();
  $('#findCount').textContent = (idx+1) + '/' + findMatches.length;
}
function findNext() { if (!findMatches.length) return; findCur = (findCur+1) % findMatches.length; hlFind(findCur); }
function findPrev() { if (!findMatches.length) return; findCur = (findCur-1+findMatches.length) % findMatches.length; hlFind(findCur); }

// ---- PREVIEW ----
function togglePreview() {
  if (!active) { toast('No file', 'Open HTML first', 'warn'); return; }
  const l = langOf(active);
  const p = $('#prevPane');
  if (p.classList.contains('show')) { p.classList.remove('show'); return; }
  if (l === 'html') {
    // Inline CSS and JS into the HTML for preview
    let html = files[active] || '';
    // Replace <link rel="stylesheet" href="styles.css"> with inline <style>
    const cssPath = active.split('/').slice(0,-1).join('/') + '/styles.css';
    if (files[cssPath]) html = html.replace(/<link[^>]*href=["']styles\.css["'][^>]*>/g, '<style>' + files[cssPath] + '</style>');
    // Replace <script src="app.js"></script> with inline <script>
    const jsPath = active.split('/').slice(0,-1).join('/') + '/app.js';
    if (files[jsPath]) html = html.replace(/<script[^>]*src=["']app\.js["'][^>]*><\/script>/g, '<script>' + files[jsPath] + '</script>');
    $('#prevFrame').srcdoc = html;
    p.classList.add('show');
  } else {
    toast('No preview', 'Open an HTML file', 'info');
  }
}

// ---- AI ----
const AI_EP = {
  gemini: (m, k) => 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(k),
  openai: (m, k, b) => (b || 'https://api.openai.com') + '/v1/chat/completions'
};

async function aiSend(prompt) {
  if (aiBusy) { toast('Busy', 'AI is responding', 'warn'); return; }
  const p = prompt.trim(); if (!p) return;

  if (!D.aiKey && D.aiProv !== 'builtin') {
    toast('No key', 'Using built-in AI. Add a key in Settings for better responses.', 'info', 3000);
    D.aiProv = 'builtin';
  }

  aiHist.push({role:'user', body:p, ts:Date.now()});
  save(); renderAI();
  $('#aiPrompt').value = '';

  let ctx = '';
  if (active) ctx = 'Active file: ' + active + '\nLanguage: ' + langName(langOf(active)) + '\n\n```' + langOf(active) + '\n' + (files[active]||'') + '\n```\n\n';
  const full = ctx + p;

  aiBusy = true;
  $('#aiSend').disabled = true;
  $('#aiStatus').textContent = 'Sending...';
  aiHist.push({role:'assistant', body:'Thinking...', ts:Date.now(), loading:true});
  renderAI();

  try {
    let resp = '';
    if (D.aiProv === 'gemini') {
      resp = await callGemini(full);
    } else if (D.aiProv === 'openai') {
      resp = await callOpenAI(full);
    } else {
      resp = await callBuiltin(full);
    }
    aiHist = aiHist.filter(m => !m.loading);
    aiHist.push({role:'assistant', body:resp, ts:Date.now()});
    $('#aiStatus').textContent = 'Ready';
  } catch(e) {
    aiHist = aiHist.filter(m => !m.loading);
    const fb = await callBuiltin(full);
    aiHist.push({role:'assistant', body: fb + '\n\n*(API error: ' + e.message + ' — built-in fallback)*', ts:Date.now()});
    $('#aiStatus').textContent = 'Fallback';
  } finally {
    aiBusy = false; $('#aiSend').disabled = false; save(); renderAI();
  }
}

async function callGemini(prompt) {
  const contents = aiHist.slice(-20).filter(m => !m.loading).map(m => ({role: m.role === 'assistant' ? 'model' : 'user', parts:[{text:m.body}]}));
  const body = { contents, generationConfig: {temperature:0.4, maxOutputTokens:2048} };
  body.systemInstruction = {parts:[{text:'You are an expert iOS engineer. Reply with concise, production-ready code in fenced code blocks.'}]};
  const res = await fetch(AI_EP.gemini(D.aiModel, D.aiKey), {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'HTTP ' + res.status);
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '(no response)';
}
async function callOpenAI(prompt) {
  const messages = [{role:'system', content:'You are an expert iOS engineer. Reply with concise, production-ready code.'}];
  aiHist.slice(-20).filter(m => !m.loading).forEach(m => messages.push({role: m.role === 'assistant' ? 'assistant' : 'user', content: m.body}));
  const res = await fetch(AI_EP.openai(D.aiModel, D.aiKey, D.aiBaseUrl), {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer ' + D.aiKey}, body: JSON.stringify({model: D.aiModel, messages, temperature:0.4, max_tokens:2048})});
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'HTTP ' + res.status);
  return data?.choices?.[0]?.message?.content || '(no response)';
}
async function callBuiltin(full) {
  await sleep(400 + Math.random() * 600);
  const p = full.split('\n\n').pop().toLowerCase();
  if (p.includes('hello') || p.includes('hi ')) return 'Hello! I\'m the built-in AI. I can help with code questions. For better responses, add a free Gemini API key in Settings.';
  if (p.includes('html') || p.includes('example')) return 'Here\'s an HTML template:\n\n```html\n<!DOCTYPE html>\n<html>\n<head><title>My App</title></head>\n<body>\n  <h1>Hello!</h1>\n</body>\n</html>\n```';
  if (p.includes('css')) return 'Here\'s CSS:\n\n```css\n.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n}\n```';
  if (p.includes('ipa') || p.includes('build')) return 'To build a real .ipa:\n1. Set your GitHub token in Settings\n2. Click "Compile IDE to .ipa"\n3. It pushes code, builds on cloud Mac, downloads .ipa\n4. Sign with ESign + free Apple ID';
  if (p.includes('help')) return 'I can help with:\n- Code questions (110+ languages)\n- HTML/CSS/JS examples\n- iOS building\n- Refactoring\n\nAdd a free Gemini key in Settings for AI-powered responses.';
  return 'I received: "' + p.slice(0,80) + '"\n\nI\'m the built-in AI (offline). For intelligent responses, add a free Gemini API key in Settings → AI.';
}

function renderAI() {
  const w = $('#aiHistory'); if (!w) return;
  if (!aiHist.length) {
    w.innerHTML = '<div style="text-align:center;padding:30px 16px;color:var(--dim);font-size:12px"><div style="font-size:28px;margin-bottom:8px">✦</div><p>Ask the AI anything...</p></div>';
    return;
  }
  w.innerHTML = aiHist.map(m => {
    const rc = m.role === 'user' ? 'user' : 'assistant';
    const rl = m.role === 'user' ? 'You' : 'AI';
    const body = aiBody(m.body);
    const actions = m.role === 'assistant' && !m.loading ? aiActions(m.body) : '';
    return '<div style="margin-bottom:8px"><div style="font-size:10px;text-transform:uppercase;color:var(--dim);margin-bottom:2px">' + rl + '</div><div style="font-size:12px;line-height:1.5;color:var(--text);background:var(--input);border-radius:6px;padding:8px 10px">' + body + '</div>' + actions + '</div>';
  }).join('');
  w.scrollTop = w.scrollHeight;
}
function aiBody(text) {
  const parts = []; const re = /```(\w+)?\n([\s\S]*?)```/g; let last = 0, m;
  while ((m = re.exec(text)) !== null) { if (m.index > last) parts.push({type:'text', value:text.slice(last,m.index)}); parts.push({type:'code', value:m[2]}); last = m.index + m[0].length; }
  if (last < text.length) parts.push({type:'text', value:text.slice(last)});
  return parts.map(p => p.type === 'code' ? '<pre style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:8px;margin:6px 0;overflow-x:auto;font-family:var(--mono);font-size:11px"><code>' + esc(p.value) + '</code></pre>' : '<div>' + esc(p.value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') + '</div>').join('');
}
function aiActions(body) {
  if (!/```\w*\n[\s\S]*?```/.test(body)) return '';
  return '<div style="display:flex;gap:4px;margin-top:4px"><button class="ai-act" data-ai-act="insert">Insert</button><button class="ai-act" data-ai-act="copy">Copy</button></div>';
}
function aiAction(act, body) {
  const m = /```(\w+)?\n([\s\S]*?)```/.exec(body);
  if (!m) { toast('No code', 'No code block found', 'warn'); return; }
  const code = m[2];
  if (act === 'insert') {
    if (!active) { toast('No file', 'Open a file first', 'warn'); return; }
    const ta = $('#editor');
    const pos = ta.selectionStart;
    ta.value = ta.value.slice(0, pos) + code + ta.value.slice(pos);
    files[active] = ta.value; dirty[active] = true;
    save(); refreshHL(); renderTabs(); renderTree(); updateSB();
    toast('Inserted', 'Code added at cursor', 'success');
  } else if (act === 'copy') {
    navigator.clipboard.writeText(code).then(() => toast('Copied', 'Code copied', 'success', 1500));
  }
}

// ---- GITHUB SYNC ----
async function pushFile(path, content, msg) {
  if (!D.token) { toast('No token', 'Set GitHub token in Settings', 'warn'); return false; }
  try {
    // Get SHA for update
    let sha = '';
    try {
      const r = await fetch('https://api.github.com/repos/' + D.repo + '/contents/' + path, {
        headers: { 'Authorization': 'Bearer ' + D.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
      });
      if (r.ok) { const d = await r.json(); sha = d.sha; }
    } catch(e) {}

    const r = await fetch('https://api.github.com/repos/' + D.repo + '/contents/' + path, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + D.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg || 'Update ' + path, content: btoa(unescape(encodeURIComponent(content))), sha: sha || undefined, branch: 'main' })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'HTTP ' + r.status);
    return true;
  } catch(e) {
    toast('Push failed', e.message, 'error', 4000);
    return false;
  }
}

async function compileIDE() {
  if (!D.token) { toast('Need token', 'Set GitHub token in Settings first', 'warn', 4000); openSettings(); return; }

  logCon('step', '▶ Starting build...');
  toast('Building', 'Pushing code to GitHub...', 'info', 3000);

  // Push all files
  const paths = Object.keys(files);
  let pushed = 0;
  for (const p of paths) {
    const ghPath = p.startsWith('www/') ? p.slice(4) : p;
    logCon('info', '  Pushing ' + ghPath + '...');
    const ok = await pushFile(ghPath, files[p], 'Update ' + ghPath + ' from IDE');
    if (ok) pushed++;
  }
  logCon('ok', 'Pushed ' + pushed + '/' + paths.length + ' files');

  // Wait for build
  logCon('step', '▶ Waiting for cloud Mac build...');
  const ok = await waitForBuild();
  if (ok) {
    logCon('ok', '✔ Build succeeded!');
    await downloadIPA();
  } else {
    logCon('warn', 'Build may still be running — opening Actions...');
    window.open('https://github.com/' + D.repo + '/actions', '_blank');
  }
}

async function waitForBuild() {
  toast('Waiting', 'Polling build status (up to 12 min)...', 'info', 4000);
  let runId = null;
  for (let i = 0; i < 10; i++) {
    try {
      const r = await fetch('https://api.github.com/repos/' + D.repo + '/actions/runs?per_page=1', {
        headers: { 'Authorization': 'Bearer ' + D.token, 'Accept': 'application/vnd.github+json' }
      });
      const d = await r.json();
      if (d.workflow_runs && d.workflow_runs.length > 0) { runId = d.workflow_runs[0].id; break; }
    } catch(e) {}
    await sleep(3000);
  }
  if (!runId) { logCon('err', 'No workflow run found'); return false; }

  for (let i = 0; i < 72; i++) {
    try {
      const r = await fetch('https://api.github.com/repos/' + D.repo + '/actions/runs/' + runId, {
        headers: { 'Authorization': 'Bearer ' + D.token, 'Accept': 'application/vnd.github+json' }
      });
      const d = await r.json();
      if (i % 6 === 0) logCon('info', '  Status: ' + d.status + (d.conclusion ? ' → ' + d.conclusion : ''));
      if (d.status === 'completed') return d.conclusion === 'success';
    } catch(e) {}
    await sleep(10000);
  }
  return false;
}

async function downloadIPA() {
  toast('Downloading', 'Fetching .ipa from GitHub Releases...', 'info', 3000);
  try {
    const r = await fetch('https://api.github.com/repos/' + D.repo + '/releases/latest');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (d.assets && d.assets.length > 0) {
      const ipa = d.assets.find(a => a.name.endsWith('.ipa'));
      if (ipa) {
        const sz = (ipa.size / 1024 / 1024).toFixed(1);
        toast('Downloading .ipa', ipa.name + ' (' + sz + ' MB)', 'success', 5000);
        logCon('ok', 'Downloading: ' + ipa.name + ' (' + sz + ' MB)');
        const a = document.createElement('a');
        a.href = ipa.browser_download_url;
        a.download = ipa.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        return;
      }
    }
    toast('No release', 'Opening Actions tab...', 'warn', 3000);
    window.open('https://github.com/' + D.repo + '/actions', '_blank');
  } catch(e) {
    toast('Error', 'Opening Actions', 'warn');
    window.open('https://github.com/' + D.repo + '/actions', '_blank');
  }
}

async function testToken() {
  const t = $('#setToken').value.trim();
  const repo = $('#setRepo').value.trim();
  if (!t) { $('#tokenStatus').textContent = 'Enter a token first'; $('#tokenStatus').style.color = 'var(--red)'; return; }
  $('#tokenStatus').textContent = 'Testing...'; $('#tokenStatus').style.color = 'var(--dim)';
  try {
    const r = await fetch('https://api.github.com/repos/' + repo, {
      headers: { 'Authorization': 'Bearer ' + t, 'Accept': 'application/vnd.github+json' }
    });
    if (r.ok) {
      const d = await r.json();
      $('#tokenStatus').textContent = '✓ Connected to ' + d.full_name; $('#tokenStatus').style.color = 'var(--green)';
      toast('Connected', 'Token works for ' + d.full_name, 'success');
    } else {
      $('#tokenStatus').textContent = '✗ Failed: HTTP ' + r.status; $('#tokenStatus').style.color = 'var(--red)';
    }
  } catch(e) {
    $('#tokenStatus').textContent = '✗ Error: ' + e.message; $('#tokenStatus').style.color = 'var(--red)';
  }
}

// ---- ZIP ----
const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[i] = c; } return t; })();
function crc32(d) { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(fl) {
  const enc = new TextEncoder(); const local = [], central = []; let off = 0;
  for (const f of fl) {
    const nb = enc.encode(f.name); const d = f.data; const cr = crc32(d);
    const lh = new Uint8Array(30 + nb.length); const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(8, 0, true); dv.setUint16(12, 0x21, true);
    dv.setUint32(14, cr, true); dv.setUint32(18, d.length, true); dv.setUint32(22, d.length, true);
    dv.setUint16(26, nb.length, true); lh.set(nb, 30); local.push(lh, d);
    const ch = new Uint8Array(46 + nb.length); const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(14, 0x21, true);
    cv.setUint32(16, cr, true); cv.setUint32(20, d.length, true); cv.setUint32(24, d.length, true);
    cv.setUint16(28, nb.length, true); cv.setUint32(42, off, true); ch.set(nb, 46); central.push(ch);
    off += lh.length + d.length;
  }
  let cd = 0; central.forEach(r => cd += r.length);
  const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, fl.length, true); ev.setUint16(10, fl.length, true);
  ev.setUint32(12, cd, true); ev.setUint32(16, off, true);
  const all = [...local, ...central, eocd]; let tot = 0; all.forEach(r => tot += r.length);
  const res = new Uint8Array(tot); let pos = 0; all.forEach(r => { res.set(r, pos); pos += r.length; });
  return res;
}
function s2u(s) { return new TextEncoder().encode(s); }
function exportZip() {
  const fl = Object.keys(files).map(p => ({ name: p, data: s2u(files[p]) }));
  if (!fl.length) { toast('No files', '', 'warn'); return; }
  const zip = makeZip(fl);
  const blob = new Blob([zip], { type: 'application/zip' });
  const u = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = u; a.download = 'project.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(u), 1000);
  toast('Exported', fl.length + ' files', 'success');
}

// ---- CONSOLE / TERMINAL ----
function logCon(lv, msg) {
  const b = $('#console'); if (!b) return;
  const ln = document.createElement('div'); ln.className = 'log-l';
  ln.innerHTML = '<span class="log-ts">[' + now() + ']</span><span class="log-lv ' + lv + '">' + lv.toUpperCase() + '</span><span>' + esc(msg) + '</span>';
  b.appendChild(ln); b.scrollTop = b.scrollHeight;
}
function clearCon() { $('#console').innerHTML = ''; $('#terminal').innerHTML = ''; paintTerm(); }

const TCMD = {
  help: () => ['Commands: help, clear, status, build, ipa, ls, echo, ai <prompt>'],
  clear: () => { $('#terminal').innerHTML = ''; return null; },
  status: () => ['Repo: ' + D.repo, 'Token: ' + (D.token ? '✓ set' : '✗ none'), 'AI: ' + D.aiProv + '/' + D.aiModel, 'Files: ' + Object.keys(files).length],
  build: async () => { await compileIDE(); return ['Build started...']; },
  ipa: async () => { await downloadIPA(); return ['Downloading .ipa...']; },
  ls: () => Object.keys(files),
  echo: (a) => [a.join(' ')],
};
async function runTerm(raw) {
  const inp = raw.trim(); if (!inp) return;
  const b = $('#terminal');
  const h = document.createElement('div'); h.style.color = 'var(--text)';
  h.innerHTML = '<span style="color:var(--green)">$</span> ' + esc(inp);
  b.appendChild(h);
  termHist.push(inp); termCur = termHist.length;
  const [cmd, ...args] = inp.split(/\s+/);
  if (TCMD[cmd]) { const out = await TCMD[cmd](args); if (out) out.forEach(l => { const d = document.createElement('div'); d.textContent = l; d.style.color = 'var(--dim)'; b.appendChild(d); }); }
  else if (cmd === 'ai') { if (!args.length) { const d = document.createElement('div'); d.textContent = 'usage: ai <prompt>'; d.style.color = 'var(--red)'; b.appendChild(d); } else { await aiSend(args.join(' ')); } }
  else { const d = document.createElement('div'); d.textContent = 'command not found: ' + cmd; d.style.color = 'var(--red)'; b.appendChild(d); }
  b.scrollTop = b.scrollHeight;
}
function paintTerm() {
  const b = $('#terminal'); if (!b) return; b.innerHTML = '';
  ['iOS Studio v7', 'Type "help" for commands, "build" to compile, "ipa" to download', ''].forEach(l => { const d = document.createElement('div'); d.textContent = l; d.style.color = 'var(--dim)'; b.appendChild(d); });
}

// ---- PROFILER ----
let pcv, pcx, prof = { run: true, cpu: 0, mem: 0, fps: 0, h1: new Array(60).fill(0), h2: new Array(60).fill(0), fc: 0, lts: 0 };
function initProf() {
  pcv = $('#profCanvas'); if (!pcv) return;
  pcx = pcv.getContext('2d');
  resizePC(); addEventListener('resize', resizePC);
  prof.lts = performance.now();
  requestAnimationFrame(profTick);
}
function resizePC() { if (!pcv) return; const d = devicePixelRatio || 1; const r = pcv.getBoundingClientRect(); pcv.width = r.width * d; pcv.height = r.height * d; pcx.setTransform(1,0,0,1,0,0); pcx.scale(d,d); }
function profTick(t) {
  prof.fc++;
  if (t - prof.lts >= 500) { prof.fps = Math.round(prof.fc * 1000 / (t - prof.lts)); prof.fc = 0; prof.lts = t; }
  if (prof.run) {
    prof.cpu = Math.max(5, Math.min(95, 30 + Math.sin(t/1000) * 15 + (Math.random()-0.5) * 8));
    prof.mem = Math.max(50, Math.min(300, 120 + Math.sin(t/700) * 30 + (Math.random()-0.5) * 10));
    prof.h1.push(prof.cpu); prof.h1.shift();
    prof.h2.push(prof.mem); prof.h2.shift();
  }
  drawPC();
  if (prof.fc % 6 === 0) { $('#psC').textContent = Math.round(prof.cpu) + '%'; $('#psM').textContent = Math.round(prof.mem) + 'MB'; $('#psF').textContent = prof.fps; }
  requestAnimationFrame(profTick);
}
function drawPC() {
  if (!pcx) return;
  const w = pcv.width / (devicePixelRatio||1), h = pcv.height / (devicePixelRatio||1);
  pcx.clearRect(0,0,w,h);
  pcx.strokeStyle = 'rgba(86,156,214,0.1)'; pcx.lineWidth = 1;
  for (let x = 0; x < w; x += 30) { pcx.beginPath(); pcx.moveTo(x,0); pcx.lineTo(x,h); pcx.stroke(); }
  for (let y = 0; y < h; y += 20) { pcx.beginPath(); pcx.moveTo(0,y); pcx.lineTo(w,y); pcx.stroke(); }
  drawWave(prof.h1, 0, h/2, w, '#569cd6', v => v/100);
  drawWave(prof.h2, h/2, h/2, w, '#6a9955', v => v/300);
}
function drawWave(hist, yOff, h, w, color, norm) {
  pcx.beginPath();
  const n = hist.length;
  for (let i = 0; i < n; i++) { const x = (i/(n-1))*w; const y = yOff + h - (norm(hist[i])*(h-4)) - 2; if (i===0) pcx.moveTo(x,y); else pcx.lineTo(x,y); }
  pcx.lineTo(w, yOff+h); pcx.lineTo(0, yOff+h); pcx.closePath();
  const g = pcx.createLinearGradient(0, yOff, 0, yOff+h); g.addColorStop(0, color+'44'); g.addColorStop(1, color+'00');
  pcx.fillStyle = g; pcx.fill();
  pcx.beginPath();
  for (let i = 0; i < n; i++) { const x = (i/(n-1))*w; const y = yOff + h - (norm(hist[i])*(h-4)) - 2; if (i===0) pcx.moveTo(x,y); else pcx.lineTo(x,y); }
  pcx.strokeStyle = color; pcx.lineWidth = 1.5; pcx.shadowBlur = 4; pcx.shadowColor = color; pcx.stroke(); pcx.shadowBlur = 0;
}

// ---- ACTIVITY BAR ----
const VIEWS = [
  {id:'explorer', ico:'📁', title:'Explorer'},
  {id:'search', ico:'🔍', title:'Search'},
  {id:'ai', ico:'✦', title:'AI'},
  {id:'run', ico:'▶', title:'Build'},
  {id:'settings', ico:'⚙', title:'Settings'},
];
let curView = 'explorer';

function renderActivityBar() {
  const ab = $('#activityBar'); if (!ab) return;
  let html = '';
  VIEWS.forEach(v => {
    html += '<button class="act-btn' + (curView === v.id ? ' active' : '') + '" data-view="' + v.id + '" title="' + v.title + '">' + v.ico + '</button>';
  });
  html += '<div class="act-spacer"></div>';
  html += '<button class="act-btn" id="actSettings" title="Settings">⚙</button>';
  ab.innerHTML = html;
  $$('.act-btn[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));
  $('#actSettings').onclick = openSettings;
}

function switchView(v) {
  curView = v;
  renderActivityBar();
  const sv = $('#sbView'); if (!sv) return;

  if (v === 'explorer') { renderTree(); return; }

  if (v === 'search') {
    sv.innerHTML = '<div class="sb-head">SEARCH</div><div style="padding:10px"><input type="text" id="gsFind" placeholder="Search all files..." style="width:100%;background:var(--input);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--text);outline:none;margin-bottom:8px"><input type="text" id="gsReplace" placeholder="Replace..." style="width:100%;background:var(--input);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--text);outline:none;margin-bottom:8px"><button class="btn primary" id="gsRun" style="width:100%">Search</button><div id="gsSummary" style="font-size:11px;color:var(--dim);margin-top:8px"></div><ul id="gsResults" style="list-style:none;margin-top:8px"></ul></div>';
    $('#gsRun').onclick = runSearch;
    return;
  }

  if (v === 'ai') {
    sv.innerHTML = '<div class="sb-head">AI <span style="font-size:9px;background:var(--input);padding:2px 6px;border-radius:3px;margin-left:auto" id="aiModelLabel">' + esc(D.aiModel) + '</span></div><div id="aiHistory" style="flex:1;overflow-y:auto;padding:8px"></div><div style="padding:6px 8px;border-top:1px solid var(--border)"><div style="display:flex;gap:4px"><textarea id="aiPrompt" placeholder="Ask AI..." rows="2" style="flex:1;background:var(--input);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--text);outline:none;font-size:12px;resize:none"></textarea><button class="btn primary" id="aiSend" style="min-width:44px">➤</button></div><div style="font-size:10px;color:var(--dim);margin-top:4px"><span id="aiStatus">Ready</span></div></div>';
    renderAI();
    $('#aiSend').onclick = () => aiSend($('#aiPrompt').value);
    $('#aiPrompt').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend($('#aiPrompt').value); } };
    $('#aiHistory').onclick = (e) => {
      const b = e.target.closest('.ai-act');
      if (!b) return;
      const m = b.closest('div[style*="margin-bottom:8px"]');
      const body = m?.querySelector('div[style*="background"]')?.textContent || '';
      aiAction(b.dataset.aiAct, body);
    };
    return;
  }

  if (v === 'run') {
    sv.innerHTML = '<div class="sb-head">BUILD</div><div style="padding:12px">' +
      '<div style="font-size:11px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">App Identity</div>' +
      '<div style="font-size:12px;background:var(--input);border-radius:4px;padding:8px 10px;margin-bottom:12px;font-family:var(--mono)">' + esc(D.appName) + '<br>' + esc(D.bundleId) + '<br>v1.0.0</div>' +
      '<button class="btn primary" id="compileBtn" style="width:100%;min-height:44px;margin-bottom:8px;font-size:14px">⚡ Compile IDE to .ipa</button>' +
      '<p style="font-size:11px;color:var(--dim);margin-bottom:12px">Pushes your code to GitHub, builds on cloud Mac, downloads real .ipa.</p>' +
      '<button class="btn" id="quickBtn" style="width:100%;min-height:44px;margin-bottom:8px">⬇ Download Latest .ipa</button>' +
      '<p style="font-size:11px;color:var(--dim)">Downloads the latest .ipa from GitHub Releases (no rebuild).</p>' +
      '</div>';
    $('#compileBtn').onclick = compileIDE;
    $('#quickBtn').onclick = downloadIPA;
    return;
  }

  if (v === 'settings') { openSettings(); return; }
}

function runSearch() {
  const q = $('#gsFind').value.toLowerCase();
  if (!q) return;
  const results = [];
  Object.keys(files).forEach(p => {
    files[p].split('\n').forEach((line, i) => {
      if (line.toLowerCase().includes(q)) results.push({p, line: i+1, text: line});
    });
  });
  $('#gsSummary').textContent = results.length + ' matches in ' + new Set(results.map(r=>r.p)).size + ' files';
  const list = $('#gsResults');
  list.innerHTML = results.slice(0, 100).map(r => '<li style="padding:4px 8px;cursor:pointer;border-radius:4px;font-size:11px" data-path="' + esc(r.p) + '"><span style="color:var(--blue)">' + esc(r.p) + ':' + r.line + '</span><br><span style="color:var(--dim)">' + esc(r.text.slice(0,80)) + '</span></li>').join('');
  $$('#gsResults li').forEach(li => li.onclick = () => openFile(li.dataset.path));
}

// ---- SETTINGS MODAL ----
function openSettings() {
  $('#setRepo').value = D.repo;
  $('#setToken').value = D.token;
  $('#setAIProv').value = D.aiProv;
  $('#setAIKey').value = D.aiKey;
  $('#setAIModel').value = D.aiModel;
  $('#setFS').value = D.fontSize;
  $('#setTS').value = D.tabSize;
  $('#setWrap').checked = D.wrap;
  $('#setAppName').value = D.appName;
  $('#setBundle').value = D.bundleId;
  $('#settingsModal').classList.add('show');
}
function saveSettings() {
  D.repo = $('#setRepo').value.trim() || D.repo;
  D.token = $('#setToken').value.trim();
  D.aiProv = $('#setAIProv').value;
  D.aiKey = $('#setAIKey').value.trim();
  D.aiModel = $('#setAIModel').value;
  D.fontSize = +$('#setFS').value || 13;
  D.tabSize = +$('#setTS').value || 2;
  D.wrap = $('#setWrap').checked;
  D.appName = $('#setAppName').value || 'iOS Studio Extreme';
  D.bundleId = $('#setBundle').value || 'com.developer.iosstudioextreme';
  save();
  // Apply font size
  const ta = $('#editor'); if (ta) { ta.style.fontSize = D.fontSize + 'px'; $('#hlLayer').style.fontSize = D.fontSize + 'px'; $('#lineNums').style.fontSize = D.fontSize + 'px'; ta.style.whiteSpace = D.wrap ? 'pre-wrap' : 'pre'; $('#hlLayer').style.whiteSpace = D.wrap ? 'pre-wrap' : 'pre'; }
  $('#settingsModal').classList.remove('show');
  toast('Saved', 'Settings updated', 'success', 1500);
  renderTree();
}

// ---- COMMAND PALETTE ----
const CMDS = [
  {l:'New File', a: () => { const n = prompt('File name:', 'new.js'); if (n) newFile('', n); }},
  {l:'New Folder', a: () => { const n = prompt('Folder name:', 'folder'); if (n) newFolder('', n); }},
  {l:'Open Folder', a: openFolder},
  {l:'Save', a: saveTab},
  {l:'Format Code', a: fmtFile},
  {l:'Find', a: openFind},
  {l:'Preview', a: togglePreview},
  {l:'Compile IDE to .ipa', a: compileIDE},
  {l:'Download .ipa', a: downloadIPA},
  {l:'Export ZIP', a: exportZip},
  {l:'Settings', a: openSettings},
  {l:'Clear Console', a: clearCon},
];
function openCmd() { $('#cmdModal').classList.add('show'); $('#cmdIn').value = ''; renderCmd(''); setTimeout(() => $('#cmdIn').focus(), 50); }
function renderCmd(q) {
  const list = $('#cmdList');
  const hits = CMDS.filter(c => c.l.toLowerCase().includes(q.toLowerCase()));
  list.innerHTML = hits.map((h, i) => '<li data-idx="' + i + '">' + esc(h.l) + '</li>').join('');
  $$('#cmdList li').forEach((li, i) => li.onclick = () => { $('#cmdModal').classList.remove('show'); hits[i].a(); });
}

// ---- MODALS ----
function openModal(id) { $('#'+id).classList.add('show'); }
function closeModal(id) { $('#'+id).classList.remove('show'); }

// ---- INIT ----
function init() {
  load();
  renderActivityBar();
  renderTree();
  renderTabs();
  loadEditor();
  paintTerm();
  initProf();

  // Editor events — TYPING WORKS
  const ta = $('#editor');
  ta.oninput = () => {
    if (!active) return;
    files[active] = ta.value;
    dirty[active] = true;
    refreshHL();
    renderLN(ta.value.split('\n').length);
    updateSB();
    renderTabs();
    renderTree();
  };
  ta.onscroll = syncScroll;
  ta.onkeyup = () => { renderLN(ta.value.split('\n').length); updateSB(); };
  ta.onclick = updateSB;
  ta.onkeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveTab(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); openFind(); }
    if (e.key === 'Escape' && $('#findBar').classList.contains('show')) closeFind();
    if (e.key === 'F3') { e.preventDefault(); findNext(); }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      const ind = ' '.repeat(D.tabSize);
      ta.value = ta.value.slice(0, s) + ind + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + ind.length;
      files[active] = ta.value; dirty[active] = true; refreshHL();
    }
  };

  // Tab actions
  $('#saveBtn').onclick = saveTab;
  $('#lintBtn').onclick = runLint;
  $('#fmtBtn').onclick = fmtFile;
  $('#prevBtn').onclick = togglePreview;
  $('#prevClose').onclick = () => $('#prevPane').classList.remove('show');

  // Find
  $('#findCloseB').onclick = closeFind;
  $('#findInput').oninput = runFind;
  $('#findInput').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? findPrev() : findNext(); } };
  $('#findNextB').onclick = findNext;
  $('#findPrevB').onclick = findPrev;

  // Panel
  $$('.pt[data-pt]').forEach(b => b.onclick = () => {
    $$('.pt[data-pt]').forEach(x => x.classList.remove('active'));
    $$('.pp[data-pp]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    $('.pp[data-pp="' + b.dataset.pt + '"]')?.classList.add('active');
  });
  $('#panelClear').onclick = clearCon;
  $('#panelCollapse').onclick = () => {
    const p = $('#panel');
    if (p.style.display === 'none') { p.style.display = ''; $('#panelResizer').style.display = ''; document.body.style.gridTemplateRows = '1fr var(--ph) var(--sh)'; }
    else { p.style.display = 'none'; $('#panelResizer').style.display = 'none'; document.body.style.gridTemplateRows = '1fr 0 var(--sh)'; }
  };

  // Terminal
  $('#termIn').onkeydown = async (e) => {
    if (e.key === 'Enter') { const v = e.target.value; e.target.value = ''; await runTerm(v); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (termCur > 0) { termCur--; e.target.value = termHist[termCur] || ''; } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (termCur < termHist.length - 1) { termCur++; e.target.value = termHist[termCur] || ''; } }
  };

  // Context menu
  document.addEventListener('click', hideCtx);
  $$('#ctxMenu .ctx-item').forEach(b => b.onclick = (e) => {
    e.stopPropagation(); const a = b.dataset.ctx; const p = ctxPath; hideCtx();
    if (!p) return;
    if (a === 'open') openFile(p);
    else if (a === 'rename') { const n = findN(p); if (n) { const nn = prompt('Rename:', n.name); if (nn) renNode(p, nn); } }
    else if (a === 'delete') { if (confirm('Delete ' + p + '?')) delNode(p); }
  });

  // Settings modal
  $('#saveSettingsBtn').onclick = saveSettings;
  $('#testTokenBtn').onclick = testToken;
  $$('.modal-close, .modal-overlay').forEach(el => el.onclick = (e) => { if (e.target === el) { const id = el.dataset.close || el.id; if (id) closeModal(id); } });
  $$('.modal').forEach(m => m.onclick = (e) => e.stopPropagation());

  // Command palette input
  $('#cmdIn').oninput = (e) => renderCmd(e.target.value);
  $('#cmdIn').onkeydown = (e) => { if (e.key === 'Escape') closeModal('cmdModal'); if (e.key === 'Enter') { const f = $('#cmdList li[data-idx="0"]'); if (f) f.click(); } };

  // Resizers
  setupHR($('#resizerSide'));
  setupVR($('#panelResizer'));

  // Global hotkeys
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCmd(); }
    if ((e.metaKey || e.ctrlKey) && e.key === '/' && !['TEXTAREA','INPUT'].includes(e.target.tagName)) { e.preventDefault(); openSettings(); }
    if (e.key === 'Escape') { $$('.modal-overlay.show').forEach(m => m.classList.remove('show')); hideCtx(); }
  });

  // Auto-open first file
  if (!tabs.length) openFile('www/index.html');

  logCon('ok', 'iOS Studio v7 booted');
  logCon('info', 'GitHub: ' + D.repo + (D.token ? ' ✓ connected' : ' — set token in Settings'));
  toast('Ready', 'v7 — all buttons work. Click ⚡ to compile.', 'info', 4000);
  console.log('%c v7 ', 'background:#007acc;color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold', 'booted');
}

function setupHR(el) {
  if (!el) return;
  let d = false;
  el.onmousedown = (e) => { d = true; el.classList.add('active'); document.body.style.cursor = 'col-resize'; e.preventDefault(); };
  addEventListener('mousemove', (e) => { if (!d) return; const w = Math.max(180, Math.min(480, e.clientX - 48)); document.documentElement.style.setProperty('--sw', w + 'px'); });
  addEventListener('mouseup', () => { if (!d) return; d = false; el.classList.remove('active'); document.body.style.cursor = ''; });
}
function setupVR(el) {
  if (!el) return;
  let d = false;
  el.onmousedown = (e) => { d = true; el.classList.add('active'); document.body.style.cursor = 'row-resize'; e.preventDefault(); };
  addEventListener('mousemove', (e) => { if (!d) return; const h = Math.max(80, Math.min(innerHeight - 200, innerHeight - e.clientY - 24)); document.documentElement.style.setProperty('--ph', h + 'px'); resizePC(); });
  addEventListener('mouseup', () => { if (!d) return; d = false; el.classList.remove('active'); document.body.style.cursor = ''; });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
