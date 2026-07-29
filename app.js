/* iOS Studio Extreme v5 — Lightweight, all features, bulletproof buttons */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const S = 'ios-studio-extreme::v5';
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const time = () => new Date().toLocaleTimeString('en-US', {hour12:false});

// State
const D = { appName:'iOS Studio Extreme', bundleId:'com.developer.iosstudioextreme', version:'1.0.0', build:1, target:'16.0', fontSize:13, tabSize:2, wordWrap:false, autoSave:true, accent:'indigo',
  aiProvider:'builtin', aiKey:'', aiModel:'builtin-smart', aiBaseUrl:'', aiSystem:'You are an expert iOS engineer. Reply with concise, production-ready code in fenced code blocks.',
  sendContext:true, showMinimap:true };
const seed = {
  'www/index.html':'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>App</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <div id="app"><h1>Hello iOS</h1></div>\n  <script src="app.js"></script>\n</body>\n</html>',
  'www/app.js':'// App logic\n(() => {\n  console.log("booted");\n})();',
  'www/styles.css':':root{--bg:#0B0F19;--accent:#6366f1}body{background:var(--bg);color:#fff;font-family:system-ui;padding:2rem}',
  'www/manifest.json':'{"name":"iOS Studio Extreme","display":"standalone","background_color":"#0B0F19"}',
  'package.json':'{"name":"ios-studio-extreme","version":"1.0.0","dependencies":{"@capacitor/core":"^6.1.2","@capacitor/ios":"^6.1.2"}}',
  'capacitor.config.json':'{"appId":"com.developer.iosstudioextreme","appName":"iOS Studio Extreme","webDir":"www"}',
  'README.md':'# iOS Studio Extreme\n\nCloud-built iOS IDE.',
  '.gitignore':'node_modules/\n/ios/\n*.ipa\n',
  '.github/workflows/ios-build.yml':'name: iOS Build\non:\n  push:\n    branches: [main]\njobs:\n  build:\n    runs-on: macos-14\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm install && npx cap add ios && npx cap sync ios\n      - run: xcodebuild -scheme App -configuration Release -sdk iphoneos archive CODE_SIGNING_ALLOWED=NO',
};
const st = { files:{}, tree:[{type:'folder',name:'www',path:'www',expanded:true,children:[
  {type:'file',name:'index.html',path:'www/index.html'},{type:'file',name:'app.js',path:'www/app.js'},
  {type:'file',name:'styles.css',path:'www/styles.css'},{type:'file',name:'manifest.json',path:'www/manifest.json'}]},
  {type:'folder',name:'.github',path:'.github',expanded:false,children:[{type:'folder',name:'workflows',path:'.github/workflows',expanded:false,children:[{type:'file',name:'ios-build.yml',path:'.github/workflows/ios-build.yml'}]}]},
  {type:'file',name:'package.json',path:'package.json'},{type:'file',name:'capacitor.config.json',path:'capacitor.config.json'},
  {type:'file',name:'README.md',path:'README.md'},{type:'file',name:'.gitignore',path:'.gitignore'}],
  tabs:[], active:null, dirty:{}, lint:[], aiHist:[], aiBusy:false, build:{running:false,cancelled:false,runs:0},
  prof:{running:true,cpu:0,mem:0,lat:0,fps:0,h1:new Array(80).fill(0),h2:new Array(80).fill(0),h3:new Array(80).fill(0),lf:0,fc:0,lts:0},
  termHist:[], termCur:0, ctxPath:null, find:{open:false,matches:[],cur:-1}, aiKey:'', aiModel:'gemini-2.0-flash' };

// Load
function load() {
  try { const p = JSON.parse(localStorage.getItem(S) || '{}');
    if (p.D) Object.assign(D, p.D); if (p.files) st.files = p.files;
    if (p.tree) st.tree = p.tree; if (p.tabs) st.tabs = p.tabs;
    if (p.active) st.active = p.active; if (p.dirty) st.dirty = p.dirty;
    if (p.aiHist) st.aiHist = p.aiHist; if (p.buildRuns) st.build.runs = p.buildRuns;
  } catch(e){}
  Object.keys(seed).forEach(p => { if (!st.files[p] || st.files[p].trim()==='') st.files[p] = seed[p]; });
}
function save() {
  try { localStorage.setItem(S, JSON.stringify({D, files:st.files, tree:st.tree, tabs:st.tabs, active:st.active, dirty:st.dirty, aiHist:st.aiHist.slice(-30), buildRuns:st.build.runs})); } catch(e){}
}

// Toast
function toast(t, m='', k='info', ttl=3000) {
  const s = $('#toastStack'); if (!s) return;
  const e = document.createElement('div'); e.className = 'toast '+k;
  e.innerHTML = '<div class="t-title">'+esc(t)+'</div>'+(m?'<div class="t-msg">'+esc(m)+'</div>':'');
  s.appendChild(e);
  setTimeout(() => { e.style.opacity='0'; e.style.transform='translateX(20px)'; setTimeout(()=>e.remove(),300); }, ttl);
}

// Lang (110+)
const LM = {js:'javascript',mjs:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',html:'html',htm:'html',css:'css',scss:'scss',sass:'sass',less:'less',vue:'vue',svelte:'svelte',json:'json',json5:'json',yaml:'yaml',yml:'yaml',xml:'xml',svg:'xml',toml:'toml',ini:'ini',cfg:'ini',conf:'ini',env:'env',csv:'csv',c:'c',h:'c',cpp:'cpp',cc:'cpp',cxx:'cpp',hpp:'cpp',hh:'cpp',cs:'csharp',java:'java',kt:'kotlin',kts:'kotlin',scala:'scala',sc:'scala',swift:'swift',go:'go',rs:'rust',dart:'dart',m:'objectivec',mm:'objectivec',py:'python',pyw:'python',rb:'ruby',erb:'ruby',rake:'ruby',php:'php',phtml:'php',pl:'perl',pm:'perl',lua:'lua',tcl:'tcl',r:'r',jl:'julia',sh:'shell',bash:'shell',zsh:'shell',fish:'shell',ps1:'powershell',bat:'batch',cmd:'batch',hs:'haskell',lhs:'haskell',ml:'ocaml',mli:'ocaml',elm:'elm',purs:'purescript',ex:'elixir',exs:'elixir',erl:'erlang',hrl:'erlang',clj:'clojure',cljs:'clojure',cljc:'clojure',edn:'clojure',scm:'scheme',ss:'scheme',rkt:'racket',fs:'fsharp',fsi:'fsharp',fsx:'fsharp',md:'markdown',markdown:'markdown',mdx:'markdown',rst:'rst',txt:'plaintext',text:'plaintext',log:'plaintext',tex:'latex',latex:'latex',sty:'latex',org:'org',adoc:'asciidoc',mk:'makefile',mak:'makefile',cmake:'cmake',gradle:'groovy',groovy:'groovy',gvy:'groovy',ninja:'ninja',sql:'sql',psql:'sql',mysql:'sql',sqlite:'sql',v:'verilog',vh:'verilog',sv:'systemverilog',vhd:'vhdl',vhdl:'vhdl',asm:'asm',nasm:'nasm',f:'fortran',f90:'fortran',f95:'fortran',f03:'fortran',for:'fortran',f77:'fortran',cob:'cobol',cbl:'cobol',pas:'pascal',pp:'pascal',dpr:'pascal',ada:'ada',adb:'ada',ads:'ada',pro:'prolog',nim:'nim',nims:'nim',zig:'zig',cr:'crystal',d:'d',di:'d',vala:'vala',graphql:'graphql',gql:'graphql',proto:'protobuf',sol:'solidity',glsl:'glsl',vert:'glsl',frag:'glsl',wgsl:'wgsl',hlsl:'hlsl',awk:'awk',sed:'sed',vim:'vim',el:'emacslisp',wat:'wasm',wasm:'wasm',move:'move',dockerfile:'dockerfile',properties:'ini'};
const CS = {javascript:{l:'//',b:['/*','*/']},typescript:{l:'//',b:['/*','*/']},c:{l:'//',b:['/*','*/']},cpp:{l:'//',b:['/*','*/']},csharp:{l:'//',b:['/*','*/']},java:{l:'//',b:['/*','*/']},go:{l:'//',b:['/*','*/']},rust:{l:'//',b:['/*','*/']},swift:{l:'//',b:['/*','*/']},kotlin:{l:'//',b:['/*','*/']},scala:{l:'//',b:['/*','*/']},dart:{l:'//',b:['/*','*/']},php:{l:'//',b:['/*','*/']},groovy:{l:'//',b:['/*','*/']},css:{l:null,b:['/*','*/']},scss:{l:'//',b:['/*','*/']},python:{l:'#'},ruby:{l:'#'},shell:{l:'#'},bash:{l:'#'},yaml:{l:'#'},toml:{l:'#'},ini:{l:';'},env:{l:'#'},dockerfile:{l:'#'},makefile:{l:'#'},sql:{l:'--',b:['/*','*/']},lua:{l:'--',b:['--[[',']]']},haskell:{l:'--',b:['{-','-}']},elm:{l:'--',b:['{-','-}']},html:{l:null,b:['<!--','-->']},xml:{l:null,b:['<!--','-->']},markdown:{l:null,b:['<!--','-->']},clojure:{l:';'},scheme:{l:';'},latex:{l:'%'},erlang:{l:'%'},powershell:{l:'#',b:['<#','#>']},nim:{l:'#'},zig:{l:'//'},crystal:{l:'#'},d:{l:'//',b:['/*','*/']},elixir:{l:'#'},fsharp:{l:'//',b:['(*','*)']},ocaml:{l:'--'},graphql:{l:'#'},protobuf:{l:'//'},solidity:{l:'//',b:['/*','*/']},glsl:{l:'//',b:['/*','*/']},verilog:{l:'//',b:['/*','*/']},vhdl:{l:'--'},asm:{l:';'},fortran:{l:'!'},cobol:{l:'*'},pascal:{l:'//',b:['{','}']},ada:{l:'--'},prolog:{l:'%'},r:{l:'#'},julia:{l:'#'},vim:{l:'"'},emacslisp:{l:';'},awk:{l:'#'},wat:{l:';;'}};
const KW = {javascript:'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|this|true|false|null|undefined|async|await|yield|delete|void|static|get|set|public|private|protected|readonly|enum|interface|type|as|is|keyof|never|unknown|any|string|number|boolean|symbol|object',python:'def|class|return|if|elif|else|for|while|break|continue|import|from|as|try|except|finally|raise|with|pass|lambda|yield|global|nonlocal|assert|del|in|is|not|and|or|True|False|None|self|cls|async|await|print|len|range|str|int|float|list|dict|set|tuple',go:'package|import|func|var|const|type|struct|interface|map|chan|go|defer|return|if|else|for|range|switch|case|default|break|continue|select|true|false|nil|make|new|len|cap|append|copy|delete|close|panic|recover',rust:'fn|let|mut|const|static|struct|enum|trait|impl|pub|use|mod|crate|self|Self|super|as|match|if|else|for|while|loop|break|continue|return|unsafe|async|await|move|dyn|where|type|true|false|Some|None|Ok|Err|Result|Option|Vec|String|Box',java:'public|private|protected|static|final|void|class|interface|enum|extends|implements|import|package|return|if|else|for|while|do|switch|case|break|continue|new|try|catch|finally|throw|throws|instanceof|this|super|true|false|null|int|long|short|byte|float|double|boolean|char|String',c:'int|long|short|char|float|double|void|unsigned|signed|const|static|extern|struct|union|enum|typedef|sizeof|return|if|else|for|while|do|switch|case|break|continue|default|goto|NULL|true|false|include|define',cpp:'int|long|short|char|float|double|void|unsigned|signed|const|static|extern|struct|union|enum|typedef|sizeof|return|if|else|for|while|do|switch|case|break|continue|default|goto|NULL|true|false|class|namespace|using|template|typename|public|private|protected|virtual|new|delete|this|throw|try|catch|constexpr|nullptr|auto|operator|inline|explicit',csharp:'public|private|protected|internal|static|readonly|const|void|class|interface|struct|enum|namespace|using|return|if|else|for|foreach|while|do|switch|case|break|continue|new|try|catch|finally|throw|typeof|is|as|this|base|true|false|null|var|async|await|int|long|float|double|bool|char|string|object',swift:'let|var|func|class|struct|enum|protocol|extension|import|return|if|else|for|in|while|repeat|switch|case|default|break|continue|guard|defer|do|try|catch|throw|as|is|nil|true|false|self|Self|super|init|private|public|internal|open|static|lazy|weak|mutating|override|typealias|where|async|await',kotlin:'fun|val|var|class|object|interface|enum|sealed|data|companion|import|package|return|if|else|when|for|in|while|do|break|continue|try|catch|finally|throw|as|is|true|false|null|this|super|private|public|protected|internal|abstract|final|open|override|suspend|by|lateinit|init',ruby:'def|end|class|module|require|include|attr_accessor|return|if|elsif|else|unless|while|until|for|in|do|break|next|case|when|then|begin|rescue|ensure|raise|yield|self|nil|true|false|puts|print|new|lambda|public|private|protected|super',php:'echo|print|function|class|interface|trait|extends|implements|public|private|protected|static|const|return|if|else|elseif|for|foreach|while|do|switch|case|break|continue|new|try|catch|finally|throw|use|namespace|as|instanceof|true|false|null|array|bool|int|float|string|object|void|enum|match|fn',shell:'if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|return|exit|echo|printf|read|local|export|unset|source|true|false|test|set|shift|trap|cd|pwd|exec|eval|declare',sql:'SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|VIEW|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|AND|OR|NOT|NULL|IS|IN|EXISTS|BETWEEN|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|UNION|DISTINCT|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|UNIQUE|CHECK|COMMIT|ROLLBACK|BEGIN|TRANSACTION',html:'html|head|body|div|span|p|a|img|ul|ol|li|table|tr|td|th|form|input|button|select|option|textarea|label|nav|header|footer|main|section|article|aside|h1|h2|h3|h4|h5|h6|br|hr|link|meta|script|style|title|iframe|canvas|svg|video|audio|source|figure|details|summary|mark|small|strong|em|code|pre|blockquote',css:'color|background|margin|padding|border|display|position|width|height|font|text|flex|grid|gap|align|justify|overflow|z-index|opacity|transform|transition|animation|box-shadow|border-radius|cursor|absolute|relative|fixed|sticky|block|inline|flex|grid|none|auto|var|important|media|keyframes|from|to|root|hover|focus|active|after|before'};
function langOf(p) { const e = p.split('.').pop().toLowerCase(); if (LM[e]) return LM[e]; const b = p.split('/').pop().toLowerCase(); if (b==='dockerfile'||b==='containerfile') return 'dockerfile'; if (b==='makefile') return 'makefile'; return 'plaintext'; }
function langName(l) { return ({javascript:'JavaScript',typescript:'TypeScript',html:'HTML',css:'CSS',scss:'SCSS',json:'JSON',yaml:'YAML',xml:'XML',markdown:'Markdown',python:'Python',java:'Java',go:'Go',rust:'Rust',c:'C',cpp:'C++',csharp:'C#',swift:'Swift',kotlin:'Kotlin',ruby:'Ruby',php:'PHP',shell:'Shell',bash:'Bash',sql:'SQL',dockerfile:'Dockerfile',makefile:'Makefile',lua:'Lua',haskell:'Haskell',elixir:'Elixir',clojure:'Clojure',dart:'Dart','objectivec':'Objective-C',fortran:'Fortran',cobol:'COBOL',pascal:'Pascal',r:'R',julia:'Julia',perl:'Perl',powershell:'PowerShell',nim:'Nim',zig:'Zig',crystal:'Crystal',d:'D',graphql:'GraphQL',solidity:'Solidity',glsl:'GLSL',verilog:'Verilog',vhdl:'VHDL',asm:'Assembly',latex:'LaTeX',plaintext:'Plain Text',fsharp:'F#',ocaml:'OCaml',elm:'Elm',erlang:'Erlang',scheme:'Scheme',groovy:'Groovy',vim:'Vim',emacslisp:'Emacs Lisp',awk:'Awk',wat:'WebAssembly',move:'Move',vue:'Vue',svelte:'Svelte',toml:'TOML',ini:'INI',env:'Env',csv:'CSV'})[l] || l; }
function ico(p) { const e = p.split('.').pop().toLowerCase(); return ({js:'JS',ts:'TS',html:'<>',css:'#',json:'{}',md:'M',yml:'Y',yaml:'Y',py:'PY',rb:'RB',go:'GO',rs:'RS',java:'JV',cpp:'C+',c:'C',swift:'SW',kt:'KT',php:'PHP',sh:'$',sql:'DB'})[e] || '·'; }

// Highlight
function hl(code, lang) {
  const cs = CS[lang], kw = KW[lang] || KW[lang.replace('typescript','javascript')] || '';
  const kwRe = kw ? new RegExp('\\b('+kw+')\\b','g') : null;
  let r = '', i = 0;
  while (i < code.length) {
    if (cs && cs.l && code.substr(i, cs.l.length) === cs.l) { let j = code.indexOf('\n', i); if (j===-1) j=code.length; r += '<span class="tk-c">'+esc(code.slice(i,j))+'</span>'; i=j; continue; }
    if (cs && cs.b && code.substr(i, cs.b[0].length) === cs.b[0]) { let j = code.indexOf(cs.b[1], i+cs.b[0].length); if (j===-1) j=code.length; else j+=cs.b[1].length; r += '<span class="tk-c">'+esc(code.slice(i,j))+'</span>'; i=j; continue; }
    const ch = code[i];
    if (ch==="'"||ch==='"'||ch==='`') { let j=i+1; while(j<code.length){if(code[j]==='\\'){j+=2;continue}if(code[j]===ch){j++;break}if(code[j]==='\n'&&ch!=='`')break;j++} r+='<span class="tk-s">'+esc(code.slice(i,j))+'</span>'; i=j; continue; }
    if (/\d/.test(ch) && (i===0||/[\s,;:()\[\]{}=+\-*/<>!&|^~?]/.test(code[i-1]))) { let j=i; while(j<code.length&&/[\d.xXa-fA-F_]/.test(code[j]))j++; r+='<span class="tk-n">'+esc(code.slice(i,j))+'</span>'; i=j; continue; }
    if (/[A-Za-z_$@]/.test(ch)) { let j=i; while(j<code.length&&/[\w$]/.test(code[j]))j++; const w=code.slice(i,j); if(kwRe&&kwRe.test(w)){kwRe.lastIndex=0;r+='<span class="tk-k">'+esc(w)+'</span>'}else if(/^[A-Z_][A-Z0-9_]+$/.test(w)&&w.length>1){r+='<span class="tk-b">'+esc(w)+'</span>'}else{r+=esc(w)} i=j; continue; }
    if (/[=+\-*/%<>!&|^~?:]/.test(ch)) { let j=i; while(j<code.length&&/[=+\-*/%<>!&|^~?:]/.test(code[j]))j++; r+='<span class="tk-o">'+esc(code.slice(i,j))+'</span>'; i=j; continue; }
    if (/[{}()\[\].,;]/.test(ch)) { r+='<span class="tk-p">'+esc(ch)+'</span>'; i++; continue; }
    r += esc(ch); i++;
  }
  return r;
}

// File tree
function findN(path, tree=st.tree) { for (const n of tree) { if (n.path===path) return n; if (n.children) { const f=findN(path,n.children); if(f)return f; } } return null; }
function findP(path, tree=st.tree) { for (const n of tree) { if (n.path===path) return tree; if (n.children) { const r=findP(path,n.children); if(r)return r; } } return null; }
function uniqPath(parent, name) { const c = parent ? parent+'/'+name : name; if (!findN(c)) return c; const d = name.lastIndexOf('.'); const stem = d>0 ? name.slice(0,d) : name; const ext = d>0 ? name.slice(d) : ''; let i=1; while(findN(parent?parent+'/'+stem+'-'+i+ext:stem+'-'+i+ext))i++; return parent?parent+'/'+stem+'-'+i+ext:stem+'-'+i+ext; }
function newFile(parent, name) { if(!name)return; const p=uniqPath(parent,name); const n={type:'file',name:p.split('/').pop(),path:p}; const par=parent?findN(parent):null; const list=par?(par.children||(par.children=[])):st.tree; if(par)par.expanded=true; list.push(n); st.files[p]=''; save(); renderTree(); openFile(p); }
function newFolder(parent, name) { if(!name)return; const p=uniqPath(parent,name); const n={type:'folder',name:p.split('/').pop(),path:p,expanded:true,children:[]}; const par=parent?findN(parent):null; const list=par?(par.children||(par.children=[])):st.tree; if(par)par.expanded=true; list.push(n); save(); renderTree(); }
function delNode(path) { const list=findP(path); if(!list)return; const i=list.findIndex(n=>n.path===path); if(i<0)return; const n=list[i]; const coll=(n)=>n.type==='file'?[n.path]:(n.children||[]).flatMap(coll).concat([n.path]); coll(n).forEach(p=>{delete st.files[p];delete st.dirty[p];st.tabs=st.tabs.filter(t=>t!==p)}); if(st.active&&!st.tabs.includes(st.active))st.active=st.tabs[0]||null; list.splice(i,1); save(); renderTree(); renderTabs(); loadEditor(); }
function renNode(path, name) { if(!name)return; const n=findN(path); if(!n)return; const par=path.includes('/')?path.slice(0,path.lastIndexOf('/')):''; const np=par?par+'/'+name:name; if(findN(np)){toast('Conflict',np+' exists','warn');return;} if(n.type==='file'){st.files[np]=st.files[path]||'';delete st.files[path];if(st.dirty[path]){st.dirty[np]=true;delete st.dirty[path]}st.tabs=st.tabs.map(t=>t===path?np:t);if(st.active===path)st.active=np;}else{(function rw(nd,op,np2){nd.path=nd.path.replace(op,np2);if(nd.type==='file'){if(st.files[op]!==undefined){st.files[nd.path]=st.files[op];delete st.files[op]}if(st.dirty[op]){st.dirty[nd.path]=true;delete st.dirty[op]}st.tabs=st.tabs.map(t=>t===op?nd.path:t);if(st.active===op)st.active=nd.path}else if(nd.children){nd.children.forEach(c=>rw(c,op,nd.path))}})(n,path,np)} n.name=name; save(); renderTree(); renderTabs(); loadEditor(); }
function dupNode(path) { const n=findNode(path); if(!n)return; const d=n.name.lastIndexOf('.'); const stem=d>0?n.name.slice(0,d):n.name; const ext=d>0?n.name.slice(d):''; const cn=stem+'-copy'+ext; if(n.type==='file'){const par=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';const np=newFile(par,cn);if(np)st.files[np]=st.files[path]||''}else{const par=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';newFolder(par,cn)} save(); }

// Real folder open via File System Access API
async function openFolder() {
  if (!('showDirectoryPicker' in window)) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.webkitdirectory = true; inp.multiple = true;
    inp.onchange = async (e) => {
      let cnt = 0;
      for (const f of Array.from(e.target.files)) {
        const p = f.webkitRelativePath || f.name;
        if (!findN(p)) { st.files[p] = await f.text().catch(()=>''); insertTree(p); cnt++; }
      }
      save(); renderTree(); toast('Folder opened', cnt+' files imported','success');
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
          if (!findN(p)) { st.files[p] = await f.text().catch(()=>''); insertTree(p); cnt++; }
        } else if (entry.kind === 'directory') {
          const sp = prefix ? prefix+'/'+entry.name : entry.name;
          if (!findN(sp)) insertTree(sp, true);
          await walk(entry, sp);
        }
      }
    };
    await walk(dir, '');
    save(); renderTree();
    toast('Real folder opened', cnt+' files from "'+dir.name+'"','success');
  } catch(e) { if (e.name !== 'AbortError') toast('Open error', e.message, 'error'); }
}
function insertTree(path, isFolder=false) {
  const parts = path.split('/'); let cur=''; let list=st.tree;
  for (let i=0;i<parts.length;i++) {
    cur = cur ? cur+'/'+parts[i] : parts[i];
    const isFile = i===parts.length-1 && !isFolder;
    let n = list.find(x=>x.name===parts[i]);
    if (!n) { n = isFile ? {type:'file',name:parts[i],path:cur} : {type:'folder',name:parts[i],path:cur,expanded:false,children:[]}; list.push(n); }
    if (n.type==='folder') list = n.children || (n.children=[]);
  }
}

// Drag-drop
function onDrop(e) {
  e.preventDefault(); e.stopPropagation(); document.body.classList.remove('dragging');
  const items = e.dataTransfer.items; const files = e.dataTransfer.files;
  if (items && items.length && items[0].kind==='file') {
    const proms = [];
    for (let i=0;i<items.length;i++) { const it=items[i]; if(it.kind==='file'){const en=it.webkitGetAsEntry?it.webkitGetAsEntry():null; if(en)proms.push(readEntry(en,'')); else {const f=it.getAsFile(); if(f)proms.push(dropFile(f,f.name));}} }
    Promise.all(proms).then(()=>{save();renderTree();});
  } else if (files && files.length) { Array.from(files).forEach(f=>dropFile(f,f.name)); save(); renderTree(); }
}
function dropFile(f, path) { return new Promise(res=>{ if(!findN(path)){const rd=new FileReader();rd.onload=()=>{st.files[path]=rd.result||'';insertTree(path);res()};rd.readAsText(f)}else{res()} }); }
function readEntry(en, prefix) { return new Promise(res=>{ if(en.isFile){en.file(f=>dropFile(f,prefix?prefix+'/'+en.name:en.name).then(res))}else if(en.isDirectory){const dp=prefix?prefix+'/'+en.name:en.name;if(!findN(dp))insertTree(dp,true);const rd=en.createReader();const all=()=>{rd.readEntries(async(es)=>{if(!es.length){res();return}for(const e of es)await readEntry(e,dp);all()})};all()}else{res()} }); }

// Render tree
function renderTree() {
  const root = $('#treeRoot'); if (!root) return;
  root.innerHTML = '';
  st.tree.forEach(n => root.appendChild(buildNode(n, 0)));
  const c = countF(st.tree); const fc = $('#fileCountStatus'); if (fc) fc.textContent = c+' file'+(c===1?'':'s');
  updateBC();
}
function buildNode(n, d) {
  const li = document.createElement('li');
  const item = document.createElement('div');
  const isF = n.type==='folder';
  item.className = 'tree-item'+(isF?' folder':'')+(isF&&!n.expanded?' collapsed':'')+(st.active===n.path?' active':'')+(st.dirty[n.path]?' dirty':'');
  item.style.paddingLeft = (6+d*14)+'px';
  item.dataset.path = n.path; item.dataset.type = n.type;
  item.innerHTML = (isF?'<span class="ti-caret">▾</span>':'<span class="ti-caret"></span>')+'<span class="ti-ico '+(isF?'folder':langOf(n.path))+'">'+(isF?'▣':ico(n.path))+'</span><span class="ti-name">'+esc(n.name)+'</span>';
  li.appendChild(item);
  if (isF) {
    const ul = document.createElement('ul'); ul.className='tree-children';
    if (n.expanded && n.children) n.children.forEach(c=>ul.appendChild(buildNode(c,d+1)));
    else ul.style.display='none';
    li.appendChild(ul);
    item.onclick = (e) => { if(e.target.classList.contains('ti-caret'))e.stopPropagation(); n.expanded=!n.expanded; save(); renderTree(); };
  } else { item.onclick = () => openFile(n.path); }
  item.oncontextmenu = (e) => { e.preventDefault(); showCtx(e.clientX, e.clientY, n.path); };
  let pt=null; item.ontouchstart=(e)=>{const t=e.touches[0];pt=setTimeout(()=>showCtx(t.clientX,t.clientY,n.path),600)}; item.ontouchend=()=>clearTimeout(pt); item.ontouchmove=()=>clearTimeout(pt);
  return li;
}
function countF(t) { return t.reduce((a,n)=>a+(n.type==='file'?1:countF(n.children||[])),0); }
function showCtx(x,y,p) { st.ctxPath=p; const m=$('#ctxMenu'); m.style.left=Math.min(x,innerWidth-160)+'px'; m.style.top=Math.min(y,innerHeight-180)+'px'; m.classList.add('show'); }
function hideCtx() { $('#ctxMenu').classList.remove('show'); st.ctxPath=null; }

// Editor
function openFile(p) { if(st.files[p]===undefined)st.files[p]=''; if(!st.tabs.includes(p))st.tabs.push(p); st.active=p; save(); renderTree(); renderTabs(); loadEditor(); }
function closeTab(p) { st.tabs=st.tabs.filter(t=>t!==p); if(st.active===p)st.active=st.tabs[0]||null; save(); renderTabs(); loadEditor(); }
function renderTabs() {
  const tl = $('#tabList'); if(!tl)return;
  tl.innerHTML = st.tabs.map(p=>{const n=p.split('/').pop();return '<div class="tab'+(p===st.active?' active':'')+(st.dirty[p]?' dirty':'')+'" data-path="'+esc(p)+'"><span class="tab-ico">'+ico(p)+'</span><span class="tab-name">'+esc(n)+'</span><span class="tab-close" data-close="'+esc(p)+'">×</span></div>'}).join('');
  $$('#tabList .tab').forEach(t=>t.onclick=(e)=>{if(e.target.dataset.close){closeTab(e.target.dataset.close);return}st.active=t.dataset.path;save();renderTabs();loadEditor();renderTree();});
}
function loadEditor() {
  const ta = $('#editorTextarea'); if(!ta)return;
  if (!st.active) { ta.value=''; ta.disabled=true; $('#highlightLayer').innerHTML=''; $('#lintLayer').innerHTML=''; renderLN(0); updateSB(); return; }
  if (!st.files[st.active] && seed[st.active]) st.files[st.active] = seed[st.active];
  ta.disabled=false; ta.value=st.files[st.active]||'';
  applySettings(); refreshHL(); renderLN(ta.value.split('\n').length); runLint(); updateSB(); closeFind(); updateBC(); renderMM();
}
function applySettings() {
  const ta=$('#editorTextarea'), hl=$('#highlightLayer'); if(!ta)return;
  ta.style.fontSize=D.fontSize+'px'; ta.style.whiteSpace=D.wordWrap?'pre-wrap':'pre'; ta.style.tabSize=D.tabSize;
  hl.style.fontSize=D.fontSize+'px'; hl.style.whiteSpace=D.wordWrap?'pre-wrap':'pre';
  const ln=$('#lineNumbers'); if(ln)ln.style.fontSize=D.fontSize+'px';
  const mm=$('#minimap'); if(mm)mm.style.display=D.showMinimap?'block':'none';
}
function refreshHL() { const ta=$('#editorTextarea'); if(!ta)return; $('#highlightLayer').innerHTML=hl(ta.value, st.active?langOf(st.active):'plaintext'); syncScroll(); renderMM(); }
function renderLN(n) { const g=$('#lineNumbers'); if(!g)return; const cl=getCL(); const ll=new Set(st.lint.filter(i=>i.path===st.active).map(i=>i.line)); let h=''; for(let i=1;i<=n;i++)h+='<span class="ln'+(i===cl?' current':'')+(ll.has(i)?' lint':'')+'">'+i+'</span>'; g.innerHTML=h; }
function getCL() { const ta=$('#editorTextarea'); if(!ta)return 1; return ta.value.slice(0,ta.selectionStart).split('\n').length; }
function getCC() { const ta=$('#editorTextarea'); if(!ta)return 1; const v=ta.value.slice(0,ta.selectionStart); return ta.selectionStart-v.lastIndexOf('\n'); }
function syncScroll() { const ta=$('#editorTextarea'); if(!ta)return; $('#highlightLayer').scrollTop=ta.scrollTop; $('#highlightLayer').scrollLeft=ta.scrollLeft; $('#lintLayer').scrollTop=ta.scrollTop; $('#lintLayer').scrollLeft=ta.scrollLeft; $('#lineNumbers').scrollTop=ta.scrollTop; }
function updateSB() { const ta=$('#editorTextarea'); if(!ta)return; const v=ta.value; const l=v?v.split('\n').length:0; const set=(id,val)=>{const e=$('#'+id);if(e)e.textContent=val}; set('sbPath',st.active||'—'); set('sbLang',st.active?langName(langOf(st.active)):'Plain Text'); set('sbCursor','Ln '+getCL()+', Col '+getCC()); set('sbLines',l+' lines'); set('sbChars',v.length+' chars'); const sl=ta.selectionEnd-ta.selectionStart; const se=$('#sbSel'); if(se){if(sl>0){se.textContent='Sel: '+sl+' ('+v.substring(ta.selectionStart,ta.selectionEnd).split('\n').length+' ln)';se.style.display=''}else se.style.display='none'} const lc=st.lint.filter(i=>i.path===st.active).length; const le=$('#sbLint'); if(le){le.textContent='Lint: '+lc;le.className='sb-item'+(lc?' has-issues':'')} set('sbWrap',D.wordWrap?'Wrap: ON':'Wrap: OFF'); set('sbTab','Tab: '+D.tabSize); }
function saveTab() { if(!st.active){toast('Nothing to save','Open a file first','warn');return} st.files[st.active]=$('#editorTextarea').value; st.dirty[st.active]=false; save(); renderTabs(); renderTree(); updateSB(); toast('Saved',st.active,'success',1500); }
let asT=null; function schedAS() { if(!D.autoSave||!st.active)return; clearTimeout(asT); asT=setTimeout(()=>{st.files[st.active]=$('#editorTextarea').value;st.dirty[st.active]=false;save();renderTabs();renderTree();updateSB()},1200); }

// Breadcrumb
function updateBC() { const bc=$('#breadcrumb'); if(!bc)return; if(!st.active){bc.innerHTML='';return} const parts=st.active.split('/'); let h=''; parts.forEach((p,i)=>{const last=i===parts.length-1;const path=parts.slice(0,i+1).join('/');h+='<span class="bc-part'+(last?' bc-current':'')+'" data-path="'+esc(path)+'">'+esc(p)+'</span>'+(last?'':'<span class="bc-sep">›</span>')}); bc.innerHTML=h; $$('#breadcrumb .bc-part').forEach(el=>el.onclick=()=>{const p=el.dataset.path;const n=findN(p);if(n&&n.type==='folder'){n.expanded=true;save();renderTree()}else if(n&&n.type==='file')openFile(p)}); }

// Minimap
function renderMM() { if(!D.showMinimap)return; const mc=$('#minimapContent'); if(!mc)return; const code=$('#editorTextarea').value; mc.innerHTML='<div class="mm-code">'+hl(code, st.active?langOf(st.active):'plaintext')+'</div>'; const mmc=mc.querySelector('.mm-code'); if(mmc){mmc.style.fontSize='2px';mmc.style.lineHeight='3px';mmc.style.transformOrigin='top left'} }

// Linter (JS/TS)
function runLint() {
  st.lint = st.lint.filter(i=>i.path!==st.active);
  if(!st.active){renderLL();renderPL();updateSB();return}
  const l = langOf(st.active);
  if(l!=='javascript'&&l!=='typescript'){renderLL();renderPL();updateSB();return}
  const code=$('#editorTextarea').value; if(!code.trim()){renderLL();renderPL();updateSB();return}
  lintJS(code).forEach(i=>st.lint.push({...i,path:st.active}));
  renderLL(); renderPL(); updateSB(); renderLN(code.split('\n').length);
}
const LTR = /(\s+)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(['"`])((?:\\.|(?!\3).)*)?(\3?)|(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|this|true|false|null|undefined|async|await|yield|delete|void)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)|([{}()\[\]])|([=+\-*/%<>!&|^~?:;,.])|(.)/g;
function tokJS(code) { const t=[];let m;LTR.lastIndex=0;let ln=1,col=1;while((m=LTR.exec(code))!==null){const f=m[0];const ls=f.split('\n');if(ls.length>1){ln+=ls.length-1;col=ls[ls.length-1].length+1}else col+=f.length;const[_,ws,cm,q,sb,cq,kw,nm,id,br,pu]=m;if(ws||cm)continue;if(q)t.push({type:'string',closed:cq===q,line:ln,col:col-f.length});else if(kw)t.push({type:'keyword',line:ln,col:col-f.length});else if(nm)t.push({type:'number',line:ln,col:col-f.length});else if(id)t.push({type:'ident',line:ln,col:col-f.length});else if(br)t.push({type:'bracket',value:br,line:ln,col:col-f.length});else if(pu)t.push({type:'punct',value:pu,line:ln,col:col-f.length})}return t }
function lintJS(code) { const is=[];const tk=tokJS(code);const lines=code.split('\n');tk.forEach(t=>{if(t.type==='string'&&!t.closed)is.push({line:t.line,col:t.col,msg:'Unclosed string',sev:'err'})});const st2=[];const pr={'(':')','[':']','{':'}'};tk.forEach(t=>{if(t.type==='bracket'){if(pr[t.value])st2.push({v:t.value,l:t.line,c:t.col});else{const top=st2[st2.length-1];if(!top)is.push({line:t.line,col:t.col,msg:'Unexpected "'+t.value+'"',sev:'err'});else if(pr[top.v]!==t.value)is.push({line:t.line,col:t.col,msg:'Mismatched "'+t.value+'"',sev:'err'});else st2.pop()}}});st2.forEach(t=>is.push({line:t.l,col:t.c,msg:'Unclosed "'+t.v+'"',sev:'err'}));const seen=new Set();return is.filter(i=>{const k=i.line+':'+i.col+':'+i.msg;if(seen.has(k))return false;seen.add(k);return true}) }
function renderLL() { const l=$('#lintLayer'); if(!l)return; if(!st.active||langOf(st.active)!=='javascript'&&langOf(st.active)!=='typescript'){l.innerHTML='';return} const code=$('#editorTextarea').value;const lines=code.split('\n');const ibl={};st.lint.filter(i=>i.path===st.active).forEach(i=>{if(!ibl[i.line])ibl[i.line]=[];ibl[i.line].push(i)});let h='';for(let i=0;i<lines.length;i++){const ln=i+1;const li=ibl[ln]||[];if(li.length&&li.some(x=>x.sev==='err'))h+='<span class="lint-err">'+esc(lines[i])+'</span>\n';else h+=esc(lines[i])+'\n'}l.innerHTML=h }
function renderPL() { const list=$('#problemsList');const pc=$('#problemsCount');const is=st.lint;const c=is.length;if(pc){pc.textContent=c;pc.className='pt-count'+(c?' has-issues':'')}if(!list)return;if(!c){list.innerHTML='<li class="problems-empty">No problems.</li>';return}list.innerHTML=is.map(i=>'<li class="'+i.sev+'" data-line="'+i.line+'" data-path="'+esc(i.path)+'"><span class="p-icon">'+(i.sev==='err'?'✕':'!')+'</span><span class="p-pos">Ln '+i.line+':'+i.col+'</span><span class="p-msg">'+esc(i.msg)+'</span><span class="p-file">'+esc(i.path)+'</span></li>').join('');$$('#problemsList li').forEach(li=>li.onclick=()=>{const p=li.dataset.path,l=+li.dataset.line;if(p){openFile(p);setTimeout(()=>{const ta=$('#editorTextarea');const ls=ta.value.split('\n');let pos=0;for(let i=0;i<l-1;i++)pos+=ls[i].length+1;ta.focus();ta.setSelectionRange(pos,pos+(ls[l-1]||'').length);syncScroll()},60)}}); }

// Find
function openFind() { $('#findBar').classList.add('show'); st.find.open=true; setTimeout(()=>$('#findInput').focus(),50); }
function closeFind() { $('#findBar').classList.remove('show'); st.find.open=false; st.find.matches=[]; st.find.cur=-1; const fc=$('#findCount'); if(fc)fc.textContent=''; }
function runFind() { const q=$('#findInput').value; if(!q||!st.active){const fc=$('#findCount');if(fc)fc.textContent='';return} const ta=$('#editorTextarea');const t=ta.value.toLowerCase();const ql=q.toLowerCase();const m=[];let i=0;while((i=t.indexOf(ql,i))!==-1){m.push(i);i+=ql.length}st.find.matches=m;st.find.cur=m.length?0:-1;const fc=$('#findCount');if(fc)fc.textContent=m.length?m.length+' match'+(m.length===1?'':'es'):'no matches';if(m.length)hlFind(0) }
function hlFind(idx) { if(idx<0||idx>=st.find.matches.length)return; const ta=$('#editorTextarea');const pos=st.find.matches[idx];const len=$('#findInput').value.length;ta.focus();ta.setSelectionRange(pos,pos+len);const lh=parseFloat(getComputedStyle(ta).lineHeight);const lb=ta.value.slice(0,pos).split('\n').length;ta.scrollTop=Math.max(0,(lb-5)*lh);syncScroll();const fc=$('#findCount');if(fc)fc.textContent=(idx+1)+'/'+st.find.matches.length }
function findNext() { if(!st.find.matches.length)return; st.find.cur=(st.find.cur+1)%st.find.matches.length; hlFind(st.find.cur) }
function findPrev() { if(!st.find.matches.length)return; st.find.cur=(st.find.cur-1+st.find.matches.length)%st.find.matches.length; hlFind(st.find.cur) }
function goToLine() { const inp=prompt('Go to line:'); if(!inp)return; const ln=parseInt(inp,10); if(isNaN(ln)||ln<1){toast('Invalid','Enter a number','warn');return} const ta=$('#editorTextarea');const ls=ta.value.split('\n');if(ln>ls.length){toast('Out of range',ls.length+' lines','warn');return} let pos=0;for(let i=0;i<ln-1;i++)pos+=ls[i].length+1;ta.focus();ta.setSelectionRange(pos,pos+(ls[ln-1]||'').length);const lh=parseFloat(getComputedStyle(ta).lineHeight);ta.scrollTop=Math.max(0,(ln-5)*lh);syncScroll() }

// Preview
function togglePreview() { if(!st.active){toast('No file','Open HTML/MD','warn');return} const l=langOf(st.active);const p=$('#previewPane');if(p.classList.contains('show')){p.classList.remove('show');return} if(l==='html'){$('#previewFrame').srcdoc=$('#editorTextarea').value;$('#previewFrame').style.display='block';$('#previewMd').style.display='none';p.classList.add('show')} else if(l==='markdown'){$('#previewMd').innerHTML=md($('#editorTextarea').value);$('#previewMd').style.display='block';$('#previewFrame').style.display='none';p.classList.add('show')} else toast('No preview','HTML/MD only','info') }
function md(s) { let h=esc(s);h=h.replace(/```(\w+)?\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>');h=h.replace(/^###### (.+)$/gm,'<h6>$1</h6>').replace(/^##### (.+)$/gm,'<h5>$1</h5>').replace(/^#### (.+)$/gm,'<h4>$1</h4>').replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank">$1</a>').replace(/^\s*[-*] (.+)$/gm,'<li>$1</li>');return h.split(/\n\n+/).map(p=>p.match(/^<(h\d|ul|pre)/)?p:'<p>'+p.replace(/\n/g,'<br>')+'</p>').join('\n') }

// AI — supports Gemini API, OpenAI-compatible API, and built-in fallback
const AI_PROVIDERS = {
  gemini: { name:'Gemini (Google)', models:['gemini-2.0-flash','gemini-1.5-flash','gemini-1.5-flash-8b','gemini-1.5-pro','gemini-pro'], endpoint:(m,k)=>'https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent?key='+encodeURIComponent(k) },
  openai: { name:'OpenAI-compatible', models:['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo','deepseek-chat','claude-3-5-sonnet'], endpoint:(m,k,base)=>(base||'https://api.openai.com')+'/v1/chat/completions' },
};

async function aiSend(prompt) {
  if (st.aiBusy) { toast('Busy','AI is responding','warn'); return; }
  if (!D.aiKey && D.aiProvider !== 'builtin') {
    toast('No API key','Using built-in AI. Add a free Gemini key in Settings for better responses.','info', 3000);
    D.aiProvider = 'builtin';
  }
  const p = prompt.trim(); if(!p) return;
  st.aiHist.push({role:'user',body:p,ts:Date.now()}); save(); renderAI();
  $('#aiPrompt').value = '';
  let ctx = '';
  if (D.sendContext && st.active) ctx = 'Active file: '+st.active+'\nLanguage: '+langName(langOf(st.active))+'\n\n```'+langOf(st.active)+'\n'+(st.files[st.active]||'')+'\n```\n\n';
  const fullPrompt = ctx + p;
  st.aiBusy = true; $('#aiSend').disabled = true; $('#aiStatus').textContent = 'Sending...';
  st.aiHist.push({role:'assistant',body:'Thinking…',ts:Date.now(),loading:true}); renderAI();

  try {
    let response = '';
    if (D.aiProvider === 'gemini') {
      response = await callGemini(fullPrompt);
    } else if (D.aiProvider === 'openai') {
      response = await callOpenAI(fullPrompt);
    } else {
      response = await callBuiltin(fullPrompt);
    }
    st.aiHist = st.aiHist.filter(m=>!m.loading);
    st.aiHist.push({role:'assistant',body:response,ts:Date.now()});
    $('#aiStatus').textContent = 'Ready';
  } catch(e) {
    st.aiHist = st.aiHist.filter(m=>!m.loading);
    const fb = await callBuiltin(fullPrompt);
    st.aiHist.push({role:'assistant',body:fb+'\n\n*(API error: '+e.message+' — showing built-in response)*',ts:Date.now()});
    $('#aiStatus').textContent = 'Fallback used';
  } finally {
    st.aiBusy = false; $('#aiSend').disabled = false; save(); renderAI();
  }
}

async function callGemini(prompt) {
  const contents = st.aiHist.slice(-20).filter(m=>!m.loading).map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.body}]}));
  const body = { contents, generationConfig:{temperature:0.4,maxOutputTokens:2048} };
  if (D.aiSystem) body.systemInstruction = {parts:[{text:D.aiSystem}]};
  const res = await fetch(AI_PROVIDERS.gemini.endpoint(D.aiModel, D.aiKey), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'HTTP '+res.status);
  return data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n') || '(no response)';
}

async function callOpenAI(prompt) {
  const messages = [];
  if (D.aiSystem) messages.push({role:'system',content:D.aiSystem});
  st.aiHist.slice(-20).filter(m=>!m.loading).forEach(m=>messages.push({role:m.role==='assistant'?'assistant':'user',content:m.body}));
  const res = await fetch(AI_PROVIDERS.openai.endpoint(D.aiModel, D.aiKey, D.aiBaseUrl), {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+D.aiKey},body:JSON.stringify({model:D.aiModel,messages,temperature:0.4,max_tokens:2048})});
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'HTTP '+res.status);
  return data?.choices?.[0]?.message?.content || '(no response)';
}

// Built-in smart AI (offline fallback)
async function callBuiltin(fullPrompt) {
  await sleep(400 + Math.random()*600);
  const p = fullPrompt.split('\n\n').pop().toLowerCase();
  const codeMatch = fullPrompt.match(/```(\w+)?\n([\s\S]*?)```/);
  const hasCode = !!codeMatch;
  const lang = codeMatch ? codeMatch[1] : (st.active ? langOf(st.active) : 'javascript');

  if (p.includes('hello') || p.includes('hi ') || p.trim()==='hi') return 'Hello! I\'m the built-in AI assistant. I can help with code questions, but for the best results, add a free Gemini API key in Settings → AI.\n\nWhat would you like help with?';
  if (p.includes('refactor') && hasCode) return 'Here\'s a refactored version:\n\n```'+lang+'\n'+codeMatch[2].replace(/var /g,'const ').replace(/function\s+(\w+)\s*\(([^)]*)\)\s*{/g,'const $1 = ($2) => {')+'\n```\n\n*(Built-in AI: basic refactor. Add a Gemini key for intelligent refactoring.)*';
  if (p.includes('explain') && hasCode) return 'This code does the following:\n\n1. Declares variables and functions\n2. Implements the core logic\n3. Handles edge cases\n\n**Key points:**\n- Uses standard '+langName(lang)+' patterns\n- Could benefit from error handling\n- Consider adding type annotations\n\n*(Built-in AI: basic explanation. Add a Gemini key for detailed analysis.)*';
  if (p.includes('function') || p.includes('example')) return 'Here\'s an example:\n\n```'+lang+'\n// Example function\nfunction example(param) {\n  if (!param) return null;\n  const result = param;\n  return result;\n}\n\nconst output = example("test");\nconsole.log(output);\n```\n\n*(Built-in AI: template response. Add a Gemini key for custom code.)*';
  if (p.includes('fix') && hasCode) return 'I see a few potential issues:\n\n1. **Missing error handling** — wrap in try/catch\n2. **No input validation** — check for null/undefined\n3. **Could use async/await** instead of callbacks\n\nHere\'s a fixed version:\n\n```'+lang+'\n'+codeMatch[2]+'\n```\n\n*(Built-in AI: basic fix suggestions. Add a Gemini key for precise fixes.)*';
  if (p.includes('html') || p.includes('page')) return 'Here\'s an HTML template:\n\n```html\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n  <style>\n    body { font-family: system-ui; margin: 2rem; }\n  </style>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>Your content here.</p>\n</body>\n</html>\n```\n\n*(Built-in AI: template. Add a Gemini key for custom pages.)*';
  if (p.includes('css') || p.includes('style')) return 'Here\'s a CSS snippet:\n\n```css\n.container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  gap: 1rem;\n}\n\n.card {\n  background: #1e1e1e;\n  border-radius: 8px;\n  padding: 1.5rem;\n  box-shadow: 0 4px 12px rgba(0,0,0,0.3);\n}\n```\n\n*(Built-in AI: template. Add a Gemini key for custom styles.)*';
  if (p.includes('ipa') || p.includes('build') || p.includes('ios')) return 'To build an iOS IPA:\n\n1. **Edit your files** in the editor\n2. **Click "Compile IPA"** in the Run view — runs mock build + downloads real .ipa\n3. **For a real IPA**: the GitHub Actions workflow runs on macos-14 cloud Mac\n4. **Download** the real .ipa from GitHub Releases\n5. **Sign** with ESign using a free Apple ID\n\nThe "Compile IPA" button downloads the REAL .ipa from GitHub Releases.\n\n*(Built-in AI: info. Add a Gemini key for detailed help.)*';
  if (p.includes('help') || p.includes('what can you')) return 'I can help with:\n\n- **Code questions** — ask about any of the 110+ supported languages\n- **Refactoring** — paste code and ask for improvements\n- **Examples** — request code templates\n- **iOS building** — ask about the IPA pipeline\n- **Explanations** — paste code and ask how it works\n\n**For best results:** Add a free Gemini API key in Settings → AI. The built-in AI is a basic fallback.\n\n*(Built-in AI: help text.)*';
  return 'I received your message: "'+p.slice(0,100)+(p.length>100?'…':'')+'"\n\nI\'m the built-in AI (offline fallback). For intelligent responses, add a free Gemini API key:\n\n1. Go to **Settings → AI**\n2. Get a free key at aistudio.google.com/app/apikey\n3. Paste it and select "Gemini" provider\n4. Use model `gemini-2.0-flash` (1M token context)\n\nYou can also use any OpenAI-compatible API (OpenAI, DeepSeek, local LLMs, etc.).\n\n*(Built-in AI: limited offline mode.)*';
}

function renderAI() {
  const w = $('#aiHistory'); if(!w)return;
  if (!st.aiHist.length) { w.innerHTML = '<div class="ai-empty"><div class="ai-empty-icon">✦</div><p>Ask the AI to refactor, explain, generate, or fix code.</p><p class="ai-empty-hint">Supports Gemini, OpenAI, and built-in offline AI. Code blocks get Insert/Replace/Copy.</p></div>'; return; }
  w.innerHTML = st.aiHist.map(m=>{const rc=m.role==='user'?'user':'assistant';const rl=m.role==='user'?'You':'AI';const body=aiBody(m.body);const actions=m.role==='assistant'&&!m.loading?aiActions(m.body):'';return '<div class="ai-msg '+rc+(m.loading?' loading':'')+'"><div class="gm-role">'+rl+'</div><div class="gm-body">'+body+'</div>'+actions+'</div>'}).join('');
  w.scrollTop = w.scrollHeight;
}
function aiBody(text) { const parts=[];const re=/```(\w+)?\n([\s\S]*?)```/g;let last=0,m;while((m=re.exec(text))!==null){if(m.index>last)parts.push({type:'text',value:text.slice(last,m.index)});parts.push({type:'code',value:m[2]});last=m.index+m[0].length}if(last<text.length)parts.push({type:'text',value:text.slice(last)});return parts.map(p=>p.type==='code'?'<pre><code>'+esc(p.value)+'</code></pre>':'<div>'+esc(p.value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')+'</div>').join('') }
function aiActions(body) { return /```\w*\n[\s\S]*?```/.test(body) ? '<div class="gm-actions"><button class="gm-action-btn" data-ai-action="insert">Insert</button><button class="gm-action-btn" data-ai-action="replace">Replace</button><button class="gm-action-btn" data-ai-action="copy">Copy</button></div>' : '' }
function extractCode(text) { const m=/```(\w+)?\n([\s\S]*?)```/.exec(text);return m?m[2]:null }
function aiAction(act, body) { const code=extractCode(body); if(!code){toast('No code','No code block found','warn');return} if(act==='insert'){if(!st.active){toast('No file','Open a file first','warn');return}const ta=$('#editorTextarea');const pos=ta.selectionStart;ta.value=ta.value.slice(0,pos)+code+ta.value.slice(pos);st.dirty[st.active]=true;st.files[st.active]=ta.value;save();refreshHL();runLint();renderTabs();renderTree();updateSB();toast('Inserted','Code added at cursor','success')} else if(act==='replace'){if(!st.active){toast('No file','Open a file first','warn');return}const ta=$('#editorTextarea');ta.value=code;st.dirty[st.active]=true;st.files[st.active]=code;save();refreshHL();runLint();renderTabs();renderTree();updateSB();toast('Replaced','File contents replaced','success')} else if(act==='copy'){navigator.clipboard.writeText(code).then(()=>toast('Copied','Code copied','success',1500))} }

// AI key test
async function testAI() {
  const key = $('#aiKeyInput').value.trim();
  const provider = $('#aiProviderSelect').value;
  const model = $('#aiModelSelect').value;
  if (!key && provider !== 'builtin') { setAIStatus('Enter a key first','err'); return; }
  setAIStatus('Testing...','info');
  try {
    let reply = '';
    if (provider === 'gemini') {
      const res = await fetch(AI_PROVIDERS.gemini.endpoint(model, key), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:'Reply with: OK'}]}],generationConfig:{maxOutputTokens:8}})});
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'HTTP '+res.status);
      reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(empty)';
    } else if (provider === 'openai') {
      const base = $('#aiBaseUrlInput').value.trim() || 'https://api.openai.com';
      const res = await fetch(base+'/v1/chat/completions', {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,messages:[{role:'user',content:'Reply with: OK'}],max_tokens:8})});
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'HTTP '+res.status);
      reply = data?.choices?.[0]?.message?.content || '(empty)';
    } else {
      reply = await callBuiltin('test');
    }
    setAIStatus('✓ Connected! Reply: "'+reply.trim().slice(0,50)+'"','ok');
  } catch(e) { setAIStatus('Error: '+e.message,'err'); }
}
function setAIStatus(m,k) { const e=$('#aiKeyStatus'); if(e){e.textContent=m;e.className='key-status '+k} }

// Snippets
const SNIPS = {'HTML Boilerplate':'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>','JS Function':'function name(params) {\n  return result;\n}','JS Arrow':'const name = (params) => {\n  return result;\n};','JS Async':'async function name(params) {\n  try {\n    const r = await op();\n    return r;\n  } catch(e) {\n    console.error(e);\n  }\n}','JS Class':'class Name {\n  constructor(props) {\n    this.props = props;\n  }\n  method() {}\n}','JS Fetch':'const r = await fetch(url, {\n  method: "GET",\n  headers: {"Content-Type":"application/json"},\n});\nconst data = await r.json();','JS Fetch POST':'const r = await fetch(url, {\n  method: "POST",\n  headers: {"Content-Type":"application/json"},\n  body: JSON.stringify(payload),\n});\nconst data = await r.json();','CSS Flexbox':'.container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n}','CSS Grid':'.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 1rem;\n}','JSON Object':'{\n  "key": "value",\n  "items": [\n    {"id": 1, "name": "Item 1"}\n  ]\n}','Python Function':'def function(params):\n    """Docstring."""\n    return result','Python Class':'class Name:\n    def __init__(self, props):\n        self.props = props\n    def method(self):\n        pass','Go Function':'func name(params string) (string, error) {\n    return result, nil\n}','Rust Function':'fn name(params: &str) -> Result<String, Box<dyn std::error::Error>> {\n    Ok(result)\n}','Shell Script':'#!/bin/bash\nset -euo pipefail\n\necho "Hello, World!"','Swift Function':'func name(params: String) -> String {\n    return result\n}','Kotlin Function':'fun name(params: String): String {\n    return result\n}','React Component':'function Component(props) {\n  return (\n    <div>\n      <h1>{props.title}</h1>\n    </div>\n  );\n}'};
function renderSnips() { const l=$('#sbSnippetsList'); if(!l)return; l.innerHTML=Object.keys(SNIPS).map(n=>'<li data-name="'+esc(n)+'"><span class="snip-name">'+esc(n)+'</span><span class="snip-preview">'+esc(SNIPS[n].slice(0,50).replace(/\n/g,' '))+'…</span></li>').join(''); $$('#sbSnippetsList li').forEach(li=>li.onclick=()=>{const n=li.dataset.name;const code=SNIPS[n];if(st.active){const ta=$('#editorTextarea');const pos=ta.selectionStart;ta.value=ta.value.slice(0,pos)+code+ta.value.slice(pos);st.dirty[st.active]=true;st.files[st.active]=ta.value;save();refreshHL();runLint();renderTabs();renderTree();updateSB();toast('Inserted',n,'success',1500)}else{toast('No file','Open a file first','warn')}}); }

// Profiler
let pcv, pcx;
function initProf() { pcv=$('#profilerCanvas'); if(!pcv)return; pcx=pcv.getContext('2d'); resizePC(); addEventListener('resize',resizePC); st.prof.lf=performance.now(); st.prof.lts=performance.now(); requestAnimationFrame(profTick); }
function resizePC() { if(!pcv)return; const d=devicePixelRatio||1; const r=pcv.getBoundingClientRect(); pcv.width=r.width*d; pcv.height=r.height*d; pcx.setTransform(1,0,0,1,0,0); pcx.scale(d,d); }
function profTick(now) { st.prof.lf=now; st.prof.fc++; if(now-st.prof.lts>=500){st.prof.fps=Math.round(st.prof.fc*1000/(now-st.prof.lts));st.prof.fc=0;st.prof.lts=now} if(st.prof.running){const t=now/1000;st.prof.cpu=Math.max(2,Math.min(100,30+Math.sin(t*0.6)*18+Math.sin(t*1.7)*8+(Math.random()-0.5)*6));st.prof.mem=Math.max(40,Math.min(400,120+Math.sin(t*0.3)*30+(Math.random()-0.5)*10));st.prof.lat=Math.max(2,Math.min(80,14+Math.sin(t*1.2)*6+(Math.random()-0.5)*4));st.prof.h1.push(st.prof.cpu);st.prof.h1.shift();st.prof.h2.push(st.prof.mem);st.prof.h2.shift();st.prof.h3.push(st.prof.lat);st.prof.h3.shift()} drawPC(); if(st.prof.fc%6===0){const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v};set('psCpu',Math.round(st.prof.cpu)+'%');set('psMem',Math.round(st.prof.mem)+' MB');set('psLat',st.prof.lat.toFixed(1)+' ms');set('psFps',st.prof.fps)} requestAnimationFrame(profTick) }
function drawPC() { if(!pcx)return; const w=pcv.width/(devicePixelRatio||1),h=pcv.height/(devicePixelRatio||1);pcx.clearRect(0,0,w,h);pcx.strokeStyle='rgba(99,102,241,0.06)';pcx.lineWidth=1;for(let x=0;x<w;x+=30){pcx.beginPath();pcx.moveTo(x,0);pcx.lineTo(x,h);pcx.stroke()}for(let y=0;y<h;y+=24){pcx.beginPath();pcx.moveTo(0,y);pcx.lineTo(w,y);pcx.stroke()}const sh=h/3;drawWave(st.prof.h1,0,sh,w,'#569cd6','CPU',v=>v/100);drawWave(st.prof.h2,sh,sh,w,'#6a9955','MEM',v=>v/400);drawWave(st.prof.h3,sh*2,sh,w,'#dcdcaa','LAT',v=>v/80) }
function drawWave(hist,yOff,h,w,color,label,norm) { pcx.beginPath();const n=hist.length;for(let i=0;i<n;i++){const x=(i/(n-1))*w;const y=yOff+h-(norm(hist[i])*(h-4))-2;if(i===0)pcx.moveTo(x,y);else pcx.lineTo(x,y)}pcx.lineTo(w,yOff+h);pcx.lineTo(0,yOff+h);pcx.closePath();const g=pcx.createLinearGradient(0,yOff,0,yOff+h);g.addColorStop(0,color+'44');g.addColorStop(1,color+'00');pcx.fillStyle=g;pcx.fill();pcx.beginPath();for(let i=0;i<n;i++){const x=(i/(n-1))*w;const y=yOff+h-(norm(hist[i])*(h-4))-2;if(i===0)pcx.moveTo(x,y);else pcx.lineTo(x,y)}pcx.strokeStyle=color;pcx.lineWidth=1.5;pcx.shadowBlur=6;pcx.shadowColor=color;pcx.stroke();pcx.shadowBlur=0;pcx.fillStyle=color;pcx.font='10px monospace';pcx.fillText(label,6,yOff+12) }

// Inspector
function openInspector() { openModal('inspectorModal'); const r=$('#inspectorTree'); if(!r)return; r.innerHTML=''; r.appendChild(insNode(document.body,0)); }
function insNode(el,d) { const li=document.createElement('li');const tag=el.tagName?.toLowerCase()||'#text';const id=el.id?'#'+el.id:'';const cls=el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'';li.innerHTML='<span class="it-tag">'+esc(tag)+'</span>'+(id?'<span class="it-id">'+esc(id)+'</span>':'')+(cls?'<span class="it-class">'+esc(cls)+'</span>':'');li.onclick=(e)=>{e.stopPropagation();$$('#inspectorTree li').forEach(x=>x.classList.remove('selected'));li.classList.add('selected');insProps(el)};if(el.children){const ul=document.createElement('ul');Array.from(el.children).slice(0,50).forEach(c=>ul.appendChild(insNode(c,d+1)));li.appendChild(ul)}return li }
function insProps(el) { const w=$('#inspectorProps');if(!w)return;const cs=getComputedStyle(el);const r=el.getBoundingClientRect();const rows=[['tag',el.tagName],['id',el.id||'—'],['class',typeof el.className==='string'?el.className||'—':'—'],['display',cs.display],['position',cs.position],['width',r.width.toFixed(0)+'px'],['height',r.height.toFixed(0)+'px'],['color',cs.color],['background',cs.backgroundColor],['font-size',cs.fontSize],['padding',cs.padding],['margin',cs.margin],['border',cs.border],['opacity',cs.opacity],['z-index',cs.zIndex]];w.innerHTML=rows.map(([k,v])=>'<div class="prop-row"><span class="prop-key">'+esc(k)+'</span><span class="prop-val">'+esc(String(v))+'</span></div>').join('') }

// Global search
function runSearch() { const f=$('#gsFind').value,re=$('#gsRegex').checked,cs=$('#gsCase').checked;if(!f){toast('Empty','Type to search','warn');return} let rx;try{rx=re?new RegExp(f,cs?'g':'gi'):new RegExp(esc(f),cs?'g':'gi')}catch(e){$('#gsSummary').textContent='Bad regex: '+e.message;return} const results=[];Object.keys(st.files).forEach(p=>{st.files[p].split('\n').forEach((line,i)=>{rx.lastIndex=0;let m;while((m=rx.exec(line))!==null){results.push({p,line:i+1,col:m.index+1,text:line,match:m[0]});if(m.index===rx.lastIndex)rx.lastIndex++}})});$('#gsSummary').textContent=results.length+' matches in '+new Set(results.map(r=>r.p)).size+' files';const list=$('#gsResults');if(!results.length){list.innerHTML='<li style="text-align:center;color:var(--vsc-text-dim);padding:18px;">No matches.</li>';return}list.innerHTML=results.slice(0,200).map((r,i)=>'<li data-idx="'+i+'"><span class="sr-file">'+esc(r.p)+'</span><span class="sr-line">:'+r.line+':'+r.col+'</span><div class="sr-text">'+esc(r.text).replace(new RegExp(esc(esc(r.match)),'g'),'<mark>'+esc(r.match)+'</mark>')+'</div></li>').join('');$$('#gsResults li').forEach(li=>li.onclick=()=>{const r=results[+li.dataset.idx];openFile(r.p);setTimeout(()=>{const ta=$('#editorTextarea');const ls=ta.value.split('\n');let pos=0;for(let i=0;i<r.line-1;i++)pos+=ls[i].length+1;pos+=r.col-1;ta.focus();ta.setSelectionRange(pos,pos+r.match.length);syncScroll()},60)});st._lastSearch={results,re,replace:$('#gsReplace').value} }
function replaceAll() { if(!st._lastSearch)runSearch();const s=st._lastSearch;if(!s||!s.results.length){toast('No matches','Search first','warn');return}const rt=$('#gsReplace').value;let tot=0;const byP={};s.results.forEach(r=>{if(!byP[r.p])byP[r.p]=st.files[r.p]});Object.keys(byP).forEach(p=>{const o=st.files[p];s.re.lastIndex=0;const n=o.replace(s.re,()=>{tot++;return rt});if(n!==o){st.files[p]=n;st.dirty[p]=true;if(st.active===p){$('#editorTextarea').value=n;refreshHL();runLint();updateSB()}}});save();renderTabs();renderTree();toast('Replaced',tot+' occurrences','success');runSearch() }

// Packager
function openPkg() { openModal('packagerModal');$('#pkgAppName').value=D.appName;$('#pkgBundleId').value=D.bundleId;$('#pkgVersion').value=D.version;$('#pkgBuild').value=D.build;$('#pkgTarget').value=D.target;$('#pkgDevices').value=D.devices;updatePkgPreview() }
function updatePkgPreview() { const n=$('#pkgAppName').value,b=$('#pkgBundleId').value,v=$('#pkgVersion').value,bd=$('#pkgBuild').value;const sn=n.replace(/\s+/g,'').slice(0,15);$('#pkgPreview').textContent='<?xml version="1.0"?>\n<plist version="1.0">\n<dict>\n  <key>CFBundleDisplayName</key><string>'+n+'</string>\n  <key>CFBundleIdentifier</key><string>'+b+'</string>\n  <key>CFBundleShortVersionString</key><string>'+v+'</string>\n  <key>CFBundleVersion</key><string>'+bd+'</string>\n  <key>MinimumOSVersion</key><string>'+$('#pkgTarget').value+'</string>\n</dict>\n</plist>' }
function savePkg() { D.appName=$('#pkgAppName').value||'iOS Studio Extreme';D.bundleId=$('#pkgBundleId').value||'com.developer.iosstudioextreme';D.version=$('#pkgVersion').value||'1.0.0';D.build=+$('#pkgBuild').value||1;D.target=$('#pkgTarget').value;D.devices=$('#pkgDevices').value;save();applyTop();toast('Saved','Packager settings applied','success') }
function resetPkg() { Object.assign(D,{appName:'iOS Studio Extreme',bundleId:'com.developer.iosstudioextreme',version:'1.0.0',build:1,target:'16.0',devices:'1,2'});save();openPkg();applyTop();toast('Reset','Defaults restored','info') }
function exportCap() { const cfg={appId:D.bundleId,appName:D.appName,webDir:'www',ios:{scheme:'App'}};const blob=new Blob([JSON.stringify(cfg,null,2)+'\n'],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='capacitor.config.json';a.click();URL.revokeObjectURL(u);toast('Exported','capacitor.config.json','success') }
function applyTop() { const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v};set('ppName',D.appName);set('ppBundle',D.bundleId);set('ppVersion',D.version);set('aiModelLabel',D.aiModel);const ri=$('#runAppInfo');if(ri)ri.innerHTML=D.appName+'<br>'+D.bundleId+'<br>v'+D.version+' ('+D.build+')'; }

// ZIP
const CRC = (()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c}return t})();
function crc32(d){let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=CRC[(c^d[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function makeZip(files){const enc=new TextEncoder();const local=[],central=[];let off=0;for(const f of files){const nb=enc.encode(f.name);const d=f.data;const cr=crc32(d);const lh=new Uint8Array(30+nb.length);const dv=new DataView(lh.buffer);dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(8,0,true);dv.setUint16(12,0x21,true);dv.setUint32(14,cr,true);dv.setUint32(18,d.length,true);dv.setUint32(22,d.length,true);dv.setUint16(26,nb.length,true);lh.set(nb,30);local.push(lh,d);const ch=new Uint8Array(46+nb.length);const cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(14,0x21,true);cv.setUint32(16,cr,true);cv.setUint32(20,d.length,true);cv.setUint32(24,d.length,true);cv.setUint16(28,nb.length,true);cv.setUint32(42,off,true);ch.set(nb,46);central.push(ch);off+=lh.length+d.length}let cd=0;central.forEach(r=>cd+=r.length);const eocd=new Uint8Array(22);const ev=new DataView(eocd.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,cd,true);ev.setUint32(16,off,true);const all=[...local,...central,eocd];let tot=0;all.forEach(r=>tot+=r.length);const res=new Uint8Array(tot);let pos=0;all.forEach(r=>{res.set(r,pos);pos+=r.length});return res}
function s2u(s){return new TextEncoder().encode(s)}

// Stub IPA (fallback only)
function downloadStubIpa() {
  const n=D.appName,b=D.bundleId,v=D.version,bd=D.build;const sn=n.replace(/\s+/g,'').slice(0,15);
  const plist='<?xml version="1.0"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n<key>CFBundleDisplayName</key><string>'+n+'</string>\n<key>CFBundleName</key><string>'+sn+'</string>\n<key>CFBundleIdentifier</key><string>'+b+'</string>\n<key>CFBundleShortVersionString</key><string>'+v+'</string>\n<key>CFBundleVersion</key><string>'+bd+'</string>\n<key>CFBundleExecutable</key><string>App</string>\n<key>CFBundlePackageType</key><string>APPL</string>\n<key>MinimumOSVersion</key><string>'+D.target+'</string>\n<key>UIDeviceFamily</key><array><integer>1</integer><integer>2</integer></array>\n</dict>\n</plist>';
  const files=[{name:'Payload/App.app/Info.plist',data:s2u(plist)},{name:'Payload/App.app/App',data:new Uint8Array([0xcf,0xfa,0xed,0xfe,0x07,0,0,1,3,0,0,0,8,0,0,0])},{name:'Payload/App.app/PkgInfo',data:s2u('APPL????')}];
  Object.keys(st.files).forEach(p=>{if(p.startsWith('www/'))files.push({name:'Payload/App.app/'+p,data:s2u(st.files[p])})});
  const zip=makeZip(files);const blob=new Blob([zip],{type:'application/octet-stream'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=sn+'.ipa';document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),1000);return sn+'.ipa';
}
function exportProject() { const files=[];Object.keys(st.files).forEach(p=>files.push({name:p,data:s2u(st.files[p])}));if(!files.length){toast('No files','Nothing to export','warn');return}const zip=makeZip(files);const blob=new Blob([zip],{type:'application/zip'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='project.zip';document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),1000);toast('Exported',files.length+' files','success') }

// Console + Terminal
function logCon(lvl,msg) { const b=$('#consoleBody');if(!b)return;const ln=document.createElement('div');ln.className='log-line';ln.innerHTML='<span class="log-ts">['+time()+']</span><span class="log-level '+lvl+'">'+lvl.toUpperCase()+'</span><span class="log-msg">'+msg+'</span>';b.appendChild(ln);b.scrollTop=b.scrollHeight }
function clearCon() { const b=$('#consoleBody');if(b)b.innerHTML='';const t=$('#terminalBody');if(t){t.innerHTML='';paintTerm()} }
const TCMD = {
  help:()=>['Commands: help, clear, status, build, ipa, export, open, ls, cat <f>, echo, ai <p>, reset, exit'],
  clear:()=>{$('#terminalBody').innerHTML='';return null},
  status:()=>['App: '+D.appName,'Bundle: '+D.bundleId,'Version: '+D.version+' ('+D.build+')','AI: '+D.aiProvider+' / '+D.aiModel,'Builds: '+st.build.runs],
  ipa:async()=>{await downloadRealIpa();return ['Downloading REAL .ipa from GitHub Releases...']},
  export:()=>{exportProject();return['Project exported as ZIP']},
  open:()=>{openFolder();return['Opening folder picker...']},
  ls:()=>Object.keys(st.files).sort(),
  whoami:()=>['studio@extreme'],
  date:()=>[new Date().toString()],
  exit:()=>['Session preserved'],
  reset:()=>{localStorage.removeItem(S);location.reload();return['Resetting...']},
};
async function runTerm(raw) {
  const inp=raw.trim();if(!inp)return;const b=$('#terminalBody');const h=document.createElement('div');h.className='line';h.innerHTML='<span class="prompt">studio:~$</span> '+esc(inp);b.appendChild(h);st.termHist.push(inp);st.termCur=st.termHist.length;b.scrollTop=b.scrollHeight;
  const [cmd,...args]=inp.split(/\s+/);const rest=args.join(' ');
  if(cmd==='build'){await mockBuild(args[0]==='debug'?'Debug':'Release');return}
  if(cmd==='cap'&&args[0]==='sync'){termLine('$','npx cap sync ios');await sleep(200);termLine('ok','Synced');return}
  if(cmd==='xcodebuild'){await mockBuild('Release');return}
  if(cmd==='cat'){if(!args[0]){termLine('err','usage: cat <file>');return}const f=st.files[args[0]];if(f===undefined){termLine('err','No such file');return}f.split('\n').forEach(l=>termLine('',l));return}
  if(cmd==='echo'){termLine('',rest);return}
  if(cmd==='ai'){if(!rest){termLine('err','usage: ai <prompt>');return}termLine('ai','Sending to AI: "'+rest.slice(0,60)+'"');await aiSend(rest);return}
  if(TCMD[cmd]){const out=await TCMD[cmd](args);if(out===null)return;out.forEach(l=>termLine('',l));return}
  termLine('err','command not found: '+cmd);
}
function termLine(prefix,text,cls='') { const b=$('#terminalBody');const l=document.createElement('div');l.className='line';const p={$:'<span class="prompt">$ </span>',ok:'<span class="ok">✓ </span>',err:'<span class="err">✗ </span>',ai:'<span class="ai">✦ </span>'};l.innerHTML=(p[prefix]||'')+'<span class="'+cls+'">'+esc(text)+'</span>';b.appendChild(l);b.scrollTop=b.scrollHeight }
async function mockBuild(cfg) { const lines=[['$','npm run cap:sync -- --ios'],['ok','Synced www → ios/App'],['',''],['$','xcodebuild -scheme App -configuration '+cfg+' -sdk iphoneos archive \\'],['','  CODE_SIGNING_ALLOWED=NO'],['',''],['','CompileSwiftSources → 14 sources'],['ok','Archive Succeeded'],['',''],['$','zip -qry '+D.appName.replace(/\s/g,'')+'.ipa Payload'],['ok','IPA packaged'],['',''],['ok','Build complete in '+(24+Math.floor(Math.random()*12))+'s']];for(const[p,t]of lines){if(!t&&!p){termLine('','');continue}const m={'$':'<span class="prompt">$ </span>',ok:'<span class="ok">✓ </span>','':'<span class="muted">  </span>'};termLine(m[p]||'',t);await sleep(70+Math.random()*80)} }
function paintTerm() { const b=$('#terminalBody');if(!b)return;b.innerHTML='';['iOS Studio Extreme v5','Type "help" for commands, "ai <prompt>" to chat, "ipa" to download, "open" to open folder',''].forEach(l=>termLine('',l,'muted')) }

// Build simulator
const STEPS = [
  {l:'Checkout',logs:['actions/checkout@v4','Cloned to /Users/runner/work']},
  {l:'Setup Node 24',logs:['actions/setup-node@v4','npm install → 412 packages']},
  {l:'Capacitor sync',logs:['npx cap add ios','npx cap sync ios','4 plugins synced']},
  {l:'Patch bundle ID',logs:['sed -E "s|PRODUCT_BUNDLE_IDENTIFIER = ...;|... = '+D.bundleId+';|"','PlistBuddy -c "Set :CFBundleDisplayName '+D.appName+'"','Stripped CODE_SIGN_IDENTITY lines']},
  {l:'xcodebuild archive',logs:['xcodebuild -workspace App.xcworkspace','  CODE_SIGNING_ALLOWED=NO','CompileSwiftSources → 14 sources','Archive Succeeded']},
  {l:'Assemble .ipa',logs:['mkdir -p Payload','cp -R App.app Payload/','zip -qry '+D.appName.replace(/\s/g,'')+'.ipa .','shasum -a 256 → 8f4e2c1a…']},
  {l:'Upload artifact',logs:['actions/upload-artifact@v4','name: ios-app','retention: 30 days','Uploaded successfully']},
  {l:'Create release',logs:['softprops/action-gh-release@v2','tag: v1.0.'+st.build.runs,'Release created','iOSStudioExtreme.ipa attached']},
];
async function dispatchBuild() {
  if(st.build.running){toast('Running','Build in progress','warn');return}
  st.build.running=true;st.build.cancelled=false;const btn=$('#compileBtn');if(btn)btn.disabled=true;
  logCon('step','▶ Build: '+D.appName+' ('+D.bundleId+')');
  const t0=performance.now();
  for(let i=0;i<STEPS.length;i++){
    if(st.build.cancelled){logCon('err','✗ Cancelled');break}
    const s=STEPS[i];logCon('step','▶ ['+(i+1)+'/'+STEPS.length+'] '+s.l);
    for(const ln of s.logs){if(st.build.cancelled)break;logCon('info','  '+ln);await sleep(180+Math.random()*200)}
    if(st.build.cancelled)break;logCon('ok','  ✓ '+s.l);await sleep(100);
  }
  const el=performance.now()-t0;st.build.running=false;if(btn)btn.disabled=false;
  if(!st.build.cancelled){st.build.runs++;save();logCon('ok','✔ Build succeeded in '+Math.round(el/1000)+'s');logCon('info','  Now downloading REAL .ipa from GitHub Releases...')}
  else toast('Cancelled','Build interrupted','warn');
}

// Command palette
const CMDS = [
  {c:'File',l:'New File',a:()=>{const n=prompt('File name:','new.js');if(n)newFile('',n)}},
  {c:'File',l:'New Folder',a:()=>{const n=prompt('Folder name:','folder');if(n)newFolder('',n)}},
  {c:'File',l:'Open Real Folder...',a:openFolder},
  {c:'File',l:'Save',a:saveTab,s:'⌘S'},
  {c:'File',l:'Export Project ZIP',a:exportProject},
  {c:'File',l:'Download REAL .ipa',a:downloadRealIpa},
  {c:'File',l:'Reset Workspace',a:()=>{if(confirm('Reset?')){localStorage.removeItem(S);location.reload()}}},
  {c:'Edit',l:'Find',a:openFind,s:'⌘F'},
  {c:'Edit',l:'Go to Line',a:goToLine,s:'⌘G'},
  {c:'Edit',l:'Run Linter',a:runLint,s:'⌘L'},
  {c:'Edit',l:'Format',a:formatFile},
  {c:'Edit',l:'Global Search',a:()=>switchView('search'),s:'⌘⇧F'},
  {c:'View',l:'Explorer',a:()=>switchView('explorer'),s:'⌘⇧E'},
  {c:'View',l:'AI Chat',a:()=>switchView('ai')},
  {c:'View',l:'Build & Run',a:()=>switchView('run')},
  {c:'View',l:'Snippets',a:()=>switchView('snippets')},
  {c:'View',l:'Settings',a:()=>switchView('settings')},
  {c:'View',l:'Preview',a:togglePreview},
  {c:'View',l:'Toggle Profiler',a:()=>{st.prof.running=!st.prof.running}},
  {c:'View',l:'Shortcuts',a:()=>openModal('shortcutsModal'),s:'⌘/'},
  {c:'Tools',l:'OTA Packager',a:openPkg},
  {c:'Tools',l:'Layout Inspector',a:openInspector},
  {c:'Tools',l:'AI Settings',a:()=>switchView('settings')},
  {c:'Build',l:'Compile IPA (mock + real download)',a:async()=>{await dispatchBuild();await downloadRealIpa()}},
  {c:'Build',l:'Download REAL .ipa',a:downloadRealIpa},
];
function openCmd() { openModal('cmdModal');$('#cmdInput').value='';renderCmd('');setTimeout(()=>$('#cmdInput').focus(),50) }
function renderCmd(q) { const list=$('#cmdList');const ql=q.toLowerCase();const fh=Object.keys(st.files).filter(p=>p.toLowerCase().includes(ql)).slice(0,8).map(p=>({c:'File',l:'Open '+p,a:()=>openFile(p)}));const ch=CMDS.filter(c=>c.l.toLowerCase().includes(ql));const hits=[...ch,...fh];if(!hits.length){list.innerHTML='<li style="text-align:center;color:var(--vsc-text-dim);padding:18px;">No matches</li>';return}list.innerHTML=hits.map((h,i)=>'<li data-idx="'+i+'"><span>'+esc(h.l)+'</span><span class="cmd-cat">'+esc(h.c)+(h.s?' · '+h.s:'')+'</span></li>').join('');$$('#cmdList li').forEach((li,i)=>li.onclick=()=>{closeModal('cmdModal');hits[i].a()}) }

function formatFile() { if(!st.active){toast('No file','Open first','warn');return}const ta=$('#editorTextarea');let v=ta.value;if(!v.trim()){toast('Empty','Nothing to format','warn');return}v=v.split('\n').map(l=>l.replace(/\s+$/,'')).join('\n').replace(/\n{3,}/g,'\n\n');if(!v.endsWith('\n'))v+='\n';ta.value=v;st.files[st.active]=v;st.dirty[st.active]=true;save();refreshHL();runLint();renderTabs();renderTree();updateSB();toast('Formatted','Trimmed','success',1500) }

// Views
function switchView(v) { $$('.activity-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$$('.sb-view').forEach(s=>s.classList.toggle('active',s.dataset.sbView===v)) }
function switchPanel(t) { $$('.panel-tab').forEach(b=>b.classList.toggle('active',b.dataset.pt===t));$$('.panel-pane').forEach(p=>p.classList.toggle('active',p.dataset.pp===t)) }
function toggleSidebar() { const sb=$('#sideBar'),rs=$('#resizerSide');if(sb.style.display==='none'){sb.style.display='';rs.style.display='';document.body.style.gridTemplateColumns='var(--activity-w) var(--sidebar-w) 5px 1fr'}else{sb.style.display='none';rs.style.display='none';document.body.style.gridTemplateColumns='var(--activity-w) 0 0 1fr'} }
function togglePanel() { const p=$('#panel'),pr=$('#panelResizer');if(p.style.display==='none'){p.style.display='';pr.style.display='';document.body.style.gridTemplateRows='1fr var(--panel-h) var(--statusbar-h)'}else{p.style.display='none';pr.style.display='none';document.body.style.gridTemplateRows='1fr 0 var(--statusbar-h)'} }

// Modals
function openModal(id) { const m=$('#'+id); if(m){m.classList.add('show');m.setAttribute('aria-hidden','false')} }
function closeModal(id) { const m=$('#'+id); if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true')} }

// Resizers
function initResizers() { setupHR($('#resizerSide'));setupVR($('#panelResizer')) }
function setupHR(el) { if(!el)return;let d=false;el.onmousedown=e=>{d=true;el.classList.add('active');document.body.style.cursor='col-resize';e.preventDefault()};addEventListener('mousemove',e=>{if(!d)return;const x=e.clientX;const w=Math.max(180,Math.min(480,x-48));document.documentElement.style.setProperty('--sidebar-w',w+'px')});addEventListener('mouseup',()=>{if(!d)return;d=false;el.classList.remove('active');document.body.style.cursor=''}) }
function setupVR(el) { if(!el)return;let d=false;el.onmousedown=e=>{d=true;el.classList.add('active');document.body.style.cursor='row-resize';e.preventDefault()};addEventListener('mousemove',e=>{if(!d)return;const y=e.clientY;const h=Math.max(80,Math.min(innerHeight-200,innerHeight-y-22));document.documentElement.style.setProperty('--panel-h',h+'px');resizePC()});addEventListener('mouseup',()=>{if(!d)return;d=false;el.classList.remove('active');document.body.style.cursor=''}) }

// AI settings sync
function syncAISettings() {
  const prov=$('#aiProviderSelect'); if(prov) prov.value = D.aiProvider;
  const key=$('#aiKeyInput'); if(key) key.value = D.aiKey;
  const base=$('#aiBaseUrlInput'); if(base) base.value = D.aiBaseUrl;
  const sys=$('#aiSystemInput'); if(sys) sys.value = D.aiSystem;
  updateAIModels();
  const mdl=$('#aiModelSelect'); if(mdl) mdl.value = D.aiModel;
}
function updateAIModels() {
  const sel=$('#aiModelSelect'); if(!sel)return;
  const p = D.aiProvider;
  const models = p==='gemini'?AI_PROVIDERS.gemini.models : p==='openai'?AI_PROVIDERS.openai.models : ['builtin-smart'];
  sel.innerHTML = models.map(m=>'<option value="'+m+'">'+m+'</option>').join('');
  if (models.includes(D.aiModel)) sel.value = D.aiModel;
  else D.aiModel = models[0], sel.value = D.aiModel;
  const baseField=$('#aiBaseUrlField'); if(baseField) baseField.style.display = p==='openai'?'':'none';
}
function syncAIModal() {
  const prov=$('#aiProviderSelectModal'); if(prov) prov.value = D.aiProvider;
  const key=$('#aiKeyInput'); if(key) key.value = D.aiKey;
  const base=$('#aiBaseUrlInputModal'); if(base) base.value = D.aiBaseUrl;
  const sys=$('#aiSystemInput'); if(sys) sys.value = D.aiSystem;
  const p = D.aiProvider;
  const models = p==='gemini'?AI_PROVIDERS.gemini.models : p==='openai'?AI_PROVIDERS.openai.models : ['builtin-smart'];
  const sel=$('#aiModelSelectModal'); if(sel){sel.innerHTML=models.map(m=>'<option value="'+m+'">'+m+'</option>').join('');sel.value=D.aiModel}
  const bf=$('#aiBaseUrlFieldModal'); if(bf) bf.style.display = p==='openai'?'':'none';
}

// Bind ALL events
function bind() {
  $$('.activity-item[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  $('#activityAccount') && ($('#activityAccount').onclick=()=>switchView('settings'));

  $('#newFileBtn').onclick=()=>{const n=prompt('File name:','new.js');if(n)newFile('',n)};
  $('#newFolderBtn').onclick=()=>{const n=prompt('Folder name:','folder');if(n)newFolder('',n)};
  $('#openFolderBtn').onclick=openFolder;
  $('#importFolderBtn').onclick=openFolder;
  $('#exportProjectBtn').onclick=exportProject;
  $('#exportProjectBtn2').onclick=exportProject;
  $('#resetWorkspaceBtn').onclick=()=>{if(confirm('Reset workspace?')){localStorage.removeItem(S);location.reload()}};
  $('#collapseAllBtn').onclick=()=>{(function c(n){n.forEach(x=>{if(x.type==='folder'){x.expanded=false;if(x.children)c(x.children)}})})(st.tree);save();renderTree()};
  $('#fileSearchInput').oninput=(e)=>{const q=e.target.value.toLowerCase();$$('.tree-item').forEach(el=>{const n=el.querySelector('.ti-name')?.textContent.toLowerCase()||'';el.style.display=n.includes(q)?'':'none'})};

  addEventListener('dragover',e=>{e.preventDefault();document.body.classList.add('dragging')});
  addEventListener('dragleave',e=>{if(e.relatedTarget===null)document.body.classList.remove('dragging')});
  addEventListener('drop',onDrop);

  addEventListener('click',hideCtx);
  $$('#ctxMenu .ctx-item').forEach(b=>b.onclick=e=>{e.stopPropagation();const a=b.dataset.ctx;const p=st.ctxPath;hideCtx();if(!p)return;if(a==='open')openFile(p);else if(a==='rename'){const n=findN(p);if(n){const nn=prompt('Rename:',n.name);if(nn&&nn!==n.name)renNode(p,nn)}}else if(a==='duplicate')dupNode(p);else if(a==='delete'){if(confirm('Delete '+p+'?'))delNode(p)}});

  const ta=$('#editorTextarea');
  ta.oninput=()=>{if(!st.active)return;st.files[st.active]=ta.value;st.dirty[st.active]=true;refreshHL();renderLN(ta.value.split('\n').length);clearTimeout(st._lt);st._lt=setTimeout(runLint,300);updateSB();renderTabs();renderTree();schedAS()};
  ta.onscroll=syncScroll;
  ta.onkeyup=()=>{renderLN(ta.value.split('\n').length);updateSB()};
  ta.onclick=updateSB;
  ta.onkeydown=e=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();saveTab()}
    if((e.metaKey||e.ctrlKey)&&e.key==='l'){e.preventDefault();runLint()}
    if((e.metaKey||e.ctrlKey)&&e.key==='f'){e.preventDefault();openFind()}
    if((e.metaKey||e.ctrlKey)&&e.key==='g'&&!e.shiftKey){e.preventDefault();goToLine()}
    if(e.key==='Escape'&&st.find.open)closeFind();
    if(e.key==='F3'){e.preventDefault();findNext()}
    if(e.key==='Tab'){e.preventDefault();const s=ta.selectionStart,en=ta.selectionEnd;const ind=' '.repeat(D.tabSize);ta.value=ta.value.slice(0,s)+ind+ta.value.slice(en);ta.selectionStart=ta.selectionEnd=s+ind.length;st.files[st.active]=ta.value;st.dirty[st.active]=true;refreshHL()}
  };
  $('#saveFileBtn').onclick=saveTab;
  $('#runLinterBtn').onclick=runLint;
  $('#formatBtn').onclick=formatFile;
  $('#previewBtn').onclick=togglePreview;
  $('#previewClose').onclick=()=>$('#previewPane').classList.remove('show');
  $('#findClose').onclick=closeFind;
  $('#findInput').oninput=runFind;
  $('#findInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.shiftKey?findPrev():findNext()}};
  $('#findNextBtn').onclick=findNext;
  $('#findPrevBtn').onclick=findPrev;

  $('#fontIncBtn').onclick=()=>{D.fontSize=Math.min(24,D.fontSize+1);save();applySettings();refreshHL();$('#fontSizeLabel').textContent=D.fontSize+'px'};
  $('#fontDecBtn').onclick=()=>{D.fontSize=Math.max(10,D.fontSize-1);save();applySettings();refreshHL();$('#fontSizeLabel').textContent=D.fontSize+'px'};
  $('#tabSizeSelect').onchange=e=>{D.tabSize=+e.target.value;save();applySettings();updateSB()};
  $('#wrapToggleChk').onchange=e=>{D.wordWrap=e.target.checked;save();applySettings();refreshHL();updateSB()};
  $('#autoSaveChk').onchange=e=>{D.autoSave=e.target.checked;save()};
  $('#minimapChk').onchange=e=>{D.showMinimap=e.target.checked;save();applySettings()};
  $$('.theme-swatch').forEach(sw=>sw.onclick=()=>{D.accent=sw.dataset.accent;save();document.documentElement.dataset.accent=D.accent;$$('.theme-swatch').forEach(s=>s.classList.toggle('active',s===sw))});

  $('#aiSend').onclick=()=>aiSend($('#aiPrompt').value);
  $('#aiPrompt').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();aiSend($('#aiPrompt').value)}};
  $('#aiClearBtn').onclick=()=>{st.aiHist=[];save();renderAI();toast('Cleared','AI history','info',1500)};
  $('#sendContext').onchange=e=>{D.sendContext=e.target.checked;save()};
  $('#aiHistory').onclick=e=>{const b=e.target.closest('.gm-action-btn');if(!b)return;const m=b.closest('.ai-msg');const body=m?.querySelector('.gm-body');const pre=body?.querySelector('pre');const code=pre?pre.textContent:extractCode(body?.textContent||'');aiAction(b.dataset.aiAction,code?'```\n'+code+'\n```':'')};

  $('#aiProviderSelect').onchange=e=>{D.aiProvider=e.target.value;save();updateAIModels()};
  $('#aiBaseUrlInput').oninput=e=>{D.aiBaseUrl=e.target.value;save()};
  $('#aiModelSelect').onchange=e=>{D.aiModel=e.target.value;save();applyTop()};
  $('#aiKeySaveBtn').onclick=()=>{save();applyTop();closeModal('geminiKeyModal');toast('Saved','AI settings saved','success')};
  $('#aiKeyTestBtn').onclick=testAI;

  $('#openAIKeyBtn') && ($('#openAIKeyBtn').onclick=()=>{syncAIModal();openModal('geminiKeyModal')});
  $('#aiProviderSelectModal') && ($('#aiProviderSelectModal').onchange=e=>{
    D.aiProvider=e.target.value;save();
    const p=D.aiProvider;
    const models=p==='gemini'?AI_PROVIDERS.gemini.models:p==='openai'?AI_PROVIDERS.openai.models:['builtin-smart'];
    const sel=$('#aiModelSelectModal'); if(sel){sel.innerHTML=models.map(m=>'<option value="'+m+'">'+m+'</option>').join('');if(models.includes(D.aiModel))sel.value=D.aiModel;else{D.aiModel=models[0];sel.value=D.aiModel}}
    const bf=$('#aiBaseUrlFieldModal'); if(bf)bf.style.display=p==='openai'?'':'none';
    syncAISettings();
  });
  $('#aiModelSelectModal') && ($('#aiModelSelectModal').onchange=e=>{D.aiModel=e.target.value;save();applyTop();syncAISettings()});
  $('#aiKeyInput') && ($('#aiKeyInput').oninput=e=>{D.aiKey=e.target.value;save();syncAISettings()});
  $('#aiBaseUrlInputModal') && ($('#aiBaseUrlInputModal').oninput=e=>{D.aiBaseUrl=e.target.value;save();syncAISettings()});
  $('#aiSystemInput') && ($('#aiSystemInput').oninput=e=>{D.aiSystem=e.target.value;save()});

  ['#pkgAppName','#pkgBundleId','#pkgVersion','#pkgBuild','#pkgTarget','#pkgDevices'].forEach(s=>{const e=$(s);if(e)e.oninput=updatePkgPreview});
  $('#pkgSaveBtn').onclick=savePkg;
  $('#pkgResetBtn').onclick=resetPkg;
  $('#pkgExportBtn').onclick=exportCap;
  $('#openPackagerBtn').onclick=openPkg;
  $('#openPackagerBtn2').onclick=openPkg;
  $('#openInspectorBtn').onclick=openInspector;
  $('#openShortcutsBtn').onclick=()=>openModal('shortcutsModal');

  $('#gsRunBtn').onclick=runSearch;
  $('#gsReplaceAllBtn').onclick=replaceAll;
  $('#gsFind').onkeydown=e=>{if(e.key==='Enter')runSearch()};

  // Run view — Compile IPA runs mock build + downloads real .ipa after
  $('#compileBtn').onclick=async()=>{
    await dispatchBuild();
    logCon('step','▶ Fetching REAL .ipa from GitHub Releases...');
    await downloadRealIpa();
  };
  $('#quickIpaBtn').onclick=downloadRealIpa;

  $$('.panel-tab').forEach(t=>t.onclick=()=>switchPanel(t.dataset.pt));
  $('#panelClearBtn').onclick=clearCon;
  $('#panelProfilerBtn').onclick=()=>{st.prof.running=!st.prof.running;$('#panelProfilerBtn').textContent=st.prof.running?'⏸':'▶'};
  $('#panelCollapseBtn').onclick=togglePanel;

  $('#termInput').onkeydown=async e=>{if(e.key==='Enter'){const v=e.target.value;e.target.value='';await runTerm(v)}else if(e.key==='ArrowUp'){e.preventDefault();if(st.termCur>0){st.termCur--;e.target.value=st.termHist[st.termCur]||''}}else if(e.key==='ArrowDown'){e.preventDefault();if(st.termCur<st.termHist.length-1){st.termCur++;e.target.value=st.termHist[st.termCur]||''}else{st.termCur=st.termHist.length;e.target.value=''}}};

  $('#cmdInput').oninput=e=>renderCmd(e.target.value);
  $('#cmdInput').onkeydown=e=>{if(e.key==='Escape')closeModal('cmdModal');if(e.key==='Enter'){const f=$('#cmdList li[data-idx="0"]');if(f)f.click()}};

  $$('.modal-close, .modal-overlay').forEach(el=>el.onclick=e=>{if(e.target===el){const id=el.dataset.close||el.id;if(id)closeModal(id)}});
  $$('.modal').forEach(m=>m.onclick=e=>e.stopPropagation());

  addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openCmd()}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==='f'||e.key==='F')){e.preventDefault();switchView('search')}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==='e'||e.key==='E')){e.preventDefault();switchView('explorer')}
    if((e.metaKey||e.ctrlKey)&&e.key==='/'&&!(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')){e.preventDefault();openModal('shortcutsModal')}
    if(e.key==='Escape'){$$('.modal-overlay.show').forEach(m=>m.classList.remove('show'));hideCtx()}
  });
}

function applyDom() {
  document.documentElement.dataset.accent = D.accent;
  const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v};
  set('aiModelLabel', D.aiModel);
  set('fontSizeLabel', D.fontSize+'px');
  const w=$('#wrapToggleChk');if(w)w.checked=D.wordWrap;
  const a=$('#autoSaveChk');if(a)a.checked=D.autoSave;
  const m=$('#minimapChk');if(m)m.checked=D.showMinimap;
  const t=$('#tabSizeSelect');if(t)t.value=D.tabSize;
  $$('.theme-swatch').forEach(s=>s.classList.toggle('active',s.dataset.accent===D.accent));
}

function init() {
  load(); applyDom(); applyTop(); syncAISettings();
  renderTree(); renderTabs(); loadEditor(); renderAI(); renderPL(); renderSnips();
  paintTerm(); initProf(); initResizers(); bind();
  switchView('explorer');
  if(!st.tabs.length) openFile('www/index.html');
  logCon('ok','iOS Studio Extreme v5 booted');
  logCon('info','AI: '+D.aiProvider+' / '+D.aiModel+(D.aiKey?' ✓ key set':' — using built-in AI'));
  logCon('info','110+ languages · Open Folder works · Compile IPA downloads REAL .ipa');
  toast('v5 Ready','All features back. Tap Run → Compile IPA for real .ipa.',  'info', 4000);
  console.log('%c v5 ','background:#007acc;color:white;padding:2px 8px;border-radius:4px;font-weight:bold;','booted');
}

if (document.readyState==='loading') addEventListener('DOMContentLoaded',init);
else init();

/* ======================================================================
   v5.1 ENHANCEMENTS — GitHub Release download + App Icon picker
   ====================================================================== */

// Download REAL .ipa from GitHub Releases
async function downloadRealIpa() {
  toast('Fetching real .ipa', 'Checking GitHub Releases...', 'info', 3000);
  try {
    const res = await fetch('https://api.github.com/repos/kirpalsingh11/ios-studio-extreme/releases/latest');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.assets && data.assets.length > 0) {
      const ipa = data.assets.find(a => a.name.endsWith('.ipa'));
      if (ipa) {
        const sizeMB = (ipa.size / 1024 / 1024).toFixed(1);
        toast('Downloading REAL .ipa', ipa.name + ' (' + sizeMB + ' MB)', 'success', 5000);
        const a = document.createElement('a');
        a.href = ipa.browser_download_url;
        a.download = ipa.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        logCon('ok', 'Downloaded REAL .ipa: ' + ipa.name + ' (' + sizeMB + ' MB)');
        return true;
      }
    }
    toast('No release yet', 'Opening Actions tab to trigger a build', 'warn', 4000);
    window.open('https://github.com/kirpalsingh11/ios-studio-extreme/actions', '_blank');
  } catch(e) {
    toast('Error', 'Opening GitHub Actions', 'warn', 4000);
    window.open('https://github.com/kirpalsingh11/ios-studio-extreme/actions', '_blank');
  }
  return false;
}

// App Icon picker
function pickAppIcon() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) { document.body.removeChild(input); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try { localStorage.setItem('app-icon', reader.result); } catch(e) { toast('Too large', 'Image too big for storage', 'error'); return; }
      const preview = document.getElementById('iconPreview');
      if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
      const placeholder = document.getElementById('iconPlaceholder');
      if (placeholder) placeholder.style.display = 'none';
      if (typeof D !== 'undefined') { D.appIcon = reader.result; save(); }
      toast('Icon set', 'App icon saved. Upload app-icon.png to GitHub repo for real builds.', 'success', 4000);
      document.body.removeChild(input);
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function clearAppIcon() {
  localStorage.removeItem('app-icon');
  if (typeof D !== 'undefined') { D.appIcon = ''; save(); }
  const preview = document.getElementById('iconPreview');
  if (preview) preview.style.display = 'none';
  const placeholder = document.getElementById('iconPlaceholder');
  if (placeholder) placeholder.style.display = '';
  toast('Icon cleared', 'App icon removed', 'info', 2000);
}

function addIconPickerUI() {
  const settings = document.querySelector('[data-sb-view="settings"] .sb-settings');
  if (!settings) return;
  if (document.getElementById('iconPickerGroup')) return;
  const group = document.createElement('div');
  group.className = 'settings-group';
  group.id = 'iconPickerGroup';
  group.innerHTML = '<div class="settings-group-title">App Icon</div><div class="icon-picker-row"><div class="icon-preview-wrap"><img id="iconPreview" class="icon-preview" style="display:none;" /><div id="iconPlaceholder" class="icon-placeholder">No icon</div></div><div class="icon-picker-btns"><button class="sb-btn" id="pickIconBtn">Choose Photo</button><button class="ghost-btn" id="clearIconBtn" style="font-size:11px;padding:6px 10px;">Clear</button></div></div><p class="run-hint" style="margin-top:6px;">Pick an image from your photo library. For real GitHub builds, upload it as <code>app-icon.png</code> in your repo root.</p>';
  settings.appendChild(group);
  document.getElementById('pickIconBtn').onclick = pickAppIcon;
  document.getElementById('clearIconBtn').onclick = clearAppIcon;
  const saved = localStorage.getItem('app-icon');
  if (saved) {
    const preview = document.getElementById('iconPreview');
    if (preview) { preview.src = saved; preview.style.display = 'block'; }
    const placeholder = document.getElementById('iconPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
  }
}

function patchGithubButtons() {
  const quickBtn = document.getElementById('quickIpaBtn');
  if (quickBtn) {
    quickBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Download REAL .ipa';
    quickBtn.onclick = downloadRealIpa;
    const runHint = quickBtn.parentElement.querySelector('.run-hint');
    if (runHint) runHint.textContent = 'Downloads the REAL compiled .ipa from GitHub Releases (built on cloud Mac).';
  }
  const compileBtn = document.getElementById('compileBtn');
  if (compileBtn) {
    compileBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>Compile IPA';
    compileBtn.onclick = async () => {
      await dispatchBuild();
      logCon('step', '▶ Fetching REAL .ipa from GitHub Releases...');
      await downloadRealIpa();
    };
    const hint = compileBtn.parentElement.querySelector('.run-hint');
    if (hint) hint.textContent = 'Runs mock build simulation, then downloads the REAL .ipa from GitHub Releases.';
  }
}

setTimeout(() => {
  addIconPickerUI();
  patchGithubButtons();
}, 500);
})();
