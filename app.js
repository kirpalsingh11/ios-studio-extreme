/* ======================================================================
   iOS Studio Extreme — High-Density Runtime Logic Engine
   ----------------------------------------------------------------------
   Vanilla ES2020+. No frameworks. No build step.
   Modules enclosed in single IIFE:

     [01] Constants & State
     [02] Storage (localStorage persistence)
     [03] DOM Utilities
     [04] Toast System
     [05] File Manager (dynamic tree, add/remove/rename/duplicate)
     [06] Code Editor (tabs, line numbers, syntax highlight, lint overlay)
     [07] Real-Time Linter (regex tokenizer + error detection)
     [08] Gemini AI Copilot (async fetch to generativelanguage API)
     [09] Live Performance Profiler (canvas, 3 wave strips, RAF loop)
     [10] Visual Layout Inspector (DOM tree walker + property editor)
     [11] Global Search & Replace (multi-file, regex, case-sensitive)
     [12] OTA Packager (app name, version, bundle ID, plist preview)
     [13] Console + Terminal emulator
     [14] Build Simulator (Compile IPA button → step-by-step logs)
     [15] Command Palette (⌘K)
     [16] Resizers & Layout
     [17] Init & Wire-up
   ====================================================================== */

(() => {
  'use strict';

  // ==================================================================
  // [01] CONSTANTS & STATE
  // ==================================================================
  const STORAGE_KEY = 'ios-studio-extreme::v1';
  const DEFAULTS = Object.freeze({
    appName:    'iOS Studio Extreme',
    bundleId:   'com.developer.iosstudioextreme',
    version:    '1.0.0',
    buildNumber: 1,
    target:     '16.0',
    devices:    '1,2',
    accent:     'indigo',
    density:    'comfortable',
    animations: 'on',
    geminiKey:  '',
    geminiModel: 'gemini-1.5-flash',
    geminiSystem: 'You are an expert iOS engineer. Reply with concise, production-ready code. When suggesting code, wrap it in a fenced code block with the language tag.',
    geminiSendContext: true,
  });

  // Initial seeded file tree (mirrors the actual repo layout).
  const SEED_TREE = [
    { type: 'folder', name: 'www', path: 'www', expanded: true, children: [
      { type: 'file', name: 'index.html', path: 'www/index.html' },
      { type: 'file', name: 'app.js',     path: 'www/app.js' },
      { type: 'file', name: 'styles.css', path: 'www/styles.css' },
      { type: 'file', name: 'manifest.json', path: 'www/manifest.json' },
    ]},
    { type: 'folder', name: '.github', path: '.github', expanded: false, children: [
      { type: 'folder', name: 'workflows', path: '.github/workflows', expanded: false, children: [
        { type: 'file', name: 'ios-build.yml', path: '.github/workflows/ios-build.yml' },
      ]},
    ]},
    { type: 'file', name: 'package.json',         path: 'package.json' },
    { type: 'file', name: 'capacitor.config.json', path: 'capacitor.config.json' },
    { type: 'file', name: 'README.md',            path: 'README.md' },
    { type: 'file', name: '.gitignore',           path: '.gitignore' },
  ];

  // Seed contents for the files above (used on first run only).
  const SEED_CONTENT = {
    'www/index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>iOS Studio Extreme</title>\n  <link rel="stylesheet" href="./styles.css" />\n</head>\n<body>\n  <div id="app">iOS Studio Extreme</div>\n  <script src="./app.js"></script>\n</body>\n</html>\n',
    'www/app.js': '// iOS Studio Extreme — runtime engine\n(() => {\n  "use strict";\n  console.log("iOS Studio Extreme booted.");\n})();\n',
    'www/styles.css': '/* iOS Studio Extreme — Cyber Midnight Matrix */\n:root {\n  --bg-1: #0B0F19;\n  --accent: #6366f1;\n}\nbody {\n  background: var(--bg-1);\n  color: #e0e7ff;\n}\n',
    'www/manifest.json': '{\n  "name": "iOS Studio Extreme",\n  "short_name": "iOS Studio X",\n  "display": "standalone",\n  "background_color": "#0B0F19",\n  "theme_color": "#0B0F19"\n}\n',
    'package.json': '{\n  "name": "ios-studio-extreme",\n  "version": "1.0.0",\n  "dependencies": {\n    "@capacitor/core": "^6.1.2",\n    "@capacitor/ios": "^6.1.2"\n  }\n}\n',
    'capacitor.config.json': '{\n  "appId": "com.developer.iosstudioextreme",\n  "appName": "iOS Studio Extreme",\n  "webDir": "www"\n}\n',
    'README.md': '# iOS Studio Extreme\n\nA browser-based IDE for cloud-building iOS apps. See README.md in your repo for the full deployment guide.\n',
    '.gitignore': 'node_modules/\n/ios/\n/build/\n*.ipa\n.env\n',
    '.github/workflows/ios-build.yml': '# GitHub Actions workflow for iOS Studio Extreme\nname: iOS Studio Extreme — Build Pipeline\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\njobs:\n  build-ios:\n    runs-on: macos-14\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: "20" }\n      - run: npm install\n      - run: npx cap add ios\n      - run: npx cap sync ios\n      # patch pbxproj + Info.plist, then xcodebuild archive → unsigned .ipa\n',
  };

  const state = {
    settings: { ...DEFAULTS },
    files: {},                  // path -> contents
    tree: deepClone(SEED_TREE),
    openTabs: [],               // paths in order
    activeTab: null,            // path
    dirty: {},                  // path -> true if unsaved
    lintIssues: [],             // [{ line, col, msg, severity, path }]
    geminiHistory: [],          // [{ role, body, ts }]
    geminiBusy: false,
    build: {
      running: false,
      cancelled: false,
      progress: 0,
      runs: 0,
    },
    profiler: {
      running: true,
      cpu: 0, mem: 0, lat: 0, fps: 0,
      cpuHist: new Array(120).fill(0),
      memHist: new Array(120).fill(0),
      latHist: new Array(120).fill(0),
      lastFrame: 0,
      frameCount: 0,
      lastFpsTs: 0,
    },
    terminalHistory: [],
    terminalCursor: 0,
    ctxTargetPath: null,
  };

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  // ==================================================================
  // [02] STORAGE
  // ==================================================================
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.settings) Object.assign(state.settings, p.settings);
      if (p.files) state.files = p.files;
      if (p.tree) state.tree = p.tree;
      if (Array.isArray(p.openTabs)) state.openTabs = p.openTabs;
      if (p.activeTab) state.activeTab = p.activeTab;
      if (p.dirty) state.dirty = p.dirty;
      if (Array.isArray(p.geminiHistory)) state.geminiHistory = p.geminiHistory;
      if (p.buildRuns) state.build.runs = p.buildRuns;
    } catch (e) { console.warn('loadState failed:', e); }
    // Seed any missing default files.
    Object.keys(SEED_CONTENT).forEach(p => {
      if (state.files[p] === undefined) state.files[p] = SEED_CONTENT[p];
    });
  }

  function saveState() {
    try {
      const slice = {
        settings: state.settings,
        files: state.files,
        tree: state.tree,
        openTabs: state.openTabs,
        activeTab: state.activeTab,
        dirty: state.dirty,
        geminiHistory: state.geminiHistory.slice(-50),
        buildRuns: state.build.runs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
    } catch (e) { console.warn('saveState failed:', e); }
  }

  // ==================================================================
  // [03] DOM UTILITIES
  // ==================================================================
  const $  = (sel, r = document) => r.querySelector(sel);
  const $$ = (sel, r = document) => Array.from(r.querySelectorAll(sel));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const fmtTime = (d = new Date()) => d.toLocaleTimeString('en-US', { hour12: false });
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const langOfPath = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    return ({ js: 'javascript', mjs: 'javascript', html: 'html', htm: 'html',
      css: 'css', json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml',
      sh: 'shell', txt: 'plaintext' })[ext] || 'plaintext';
  };
  const iconOfPath = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    return ({ js: 'js', html: 'html', css: 'css', json: 'json',
      md: 'md', yml: 'yml', yaml: 'yml', sh: 'sh', txt: 'txt' })[ext] || 'txt';
  };

  // ==================================================================
  // [04] TOAST
  // ==================================================================
  function toast(title, msg = '', kind = 'info', ttl = 3500) {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    const icons = { success: '✓', error: '!', info: 'i', warn: '!' };
    el.innerHTML = `
      <div class="t-ico">${icons[kind] || 'i'}</div>
      <div>
        <div class="t-title">${escapeHtml(title)}</div>
        ${msg ? `<div class="t-msg">${escapeHtml(msg)}</div>` : ''}
      </div>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, ttl);
  }

  // ==================================================================
  // [05] FILE MANAGER
  // ==================================================================
  // The tree is a recursive array of { type, name, path, expanded?, children? }.

  function findNode(path, tree = state.tree) {
    for (const n of tree) {
      if (n.path === path) return n;
      if (n.children) {
        const f = findNode(path, n.children);
        if (f) return f;
      }
    }
    return null;
  }

  function findParentList(path, tree = state.tree) {
    for (const n of tree) {
      if (n.path === path) return tree;
      if (n.children) {
        const r = findParentList(path, n.children);
        if (r) return r;
      }
    }
    return null;
  }

  function ensureUniquePath(parentPath, baseName) {
    const candidate = parentPath ? `${parentPath}/${baseName}` : baseName;
    if (!findNode(candidate)) return candidate;
    const dot = baseName.lastIndexOf('.');
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
    const ext = dot > 0 ? baseName.slice(dot) : '';
    let i = 1;
    while (findNode(parentPath ? `${parentPath}/${stem}-${i}${ext}` : `${stem}-${i}${ext}`)) i++;
    return parentPath ? `${parentPath}/${stem}-${i}${ext}` : `${stem}-${i}${ext}`;
  }

  function createFile(parentPath, name) {
    if (!name) return null;
    const path = ensureUniquePath(parentPath, name);
    const node = { type: 'file', name: path.split('/').pop(), path };
    const list = parentPath ? (findNode(parentPath)?.children || (findNode(parentPath).children = [])) : state.tree;
    list.push(node);
    state.files[path] = '';
    saveState();
    renderTree();
    openFile(path);
    return path;
  }

  function createFolder(parentPath, name) {
    if (!name) return null;
    const path = ensureUniquePath(parentPath, name);
    const node = { type: 'folder', name: path.split('/').pop(), path, expanded: true, children: [] };
    const list = parentPath ? (findNode(parentPath)?.children || (findNode(parentPath).children = [])) : state.tree;
    list.push(node);
    saveState();
    renderTree();
    return path;
  }

  function deleteNode(path) {
    const list = findParentList(path);
    if (!list) return;
    const idx = list.findIndex(n => n.path === path);
    if (idx < 0) return;
    const node = list[idx];
    // Collect all descendant file paths and clear their state.
    const collectPaths = (n) => n.type === 'file' ? [n.path] : (n.children || []).flatMap(collectPaths).concat([n.path]);
    collectPaths(node).forEach(p => {
      delete state.files[p];
      delete state.dirty[p];
      state.openTabs = state.openTabs.filter(t => t !== p);
    });
    if (state.activeTab && !state.openTabs.includes(state.activeTab)) {
      state.activeTab = state.openTabs[0] || null;
    }
    list.splice(idx, 1);
    saveState();
    renderTree();
    renderTabs();
    loadActiveTabIntoEditor();
  }

  function renameNode(path, newName) {
    if (!newName) return;
    const node = findNode(path);
    if (!node) return;
    const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    if (findNode(newPath)) { toast('Name conflict', `${newPath} already exists.`, 'warn'); return; }
    // Move contents (file) or recurse (folder).
    if (node.type === 'file') {
      state.files[newPath] = state.files[path] || '';
      delete state.files[path];
      if (state.dirty[path]) { state.dirty[newPath] = true; delete state.dirty[path]; }
      state.openTabs = state.openTabs.map(t => t === path ? newPath : t);
      if (state.activeTab === path) state.activeTab = newPath;
    } else {
      // Recursively rewrite child paths.
      const rewrite = (n, oldPrefix, newPrefix) => {
        const np = n.path.replace(oldPrefix, newPrefix);
        const op = n.path;
        n.path = np;
        if (n.type === 'file') {
          if (state.files[op] !== undefined) { state.files[np] = state.files[op]; delete state.files[op]; }
          if (state.dirty[op]) { state.dirty[np] = true; delete state.dirty[op]; }
          state.openTabs = state.openTabs.map(t => t === op ? np : t);
          if (state.activeTab === op) state.activeTab = np;
        } else if (n.children) {
          n.children.forEach(c => rewrite(c, op, np));
        }
      };
      rewrite(node, path, newPath);
    }
    node.name = newName;
    saveState();
    renderTree();
    renderTabs();
    loadActiveTabIntoEditor();
  }

  function duplicateNode(path) {
    const node = findNode(path);
    if (!node) return;
    const dot = node.name.lastIndexOf('.');
    const stem = dot > 0 ? node.name.slice(0, dot) : node.name;
    const ext = dot > 0 ? node.name.slice(dot) : '';
    const copyName = `${stem}-copy${ext}`;
    if (node.type === 'file') {
      const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      const newPath = createFile(parentPath, copyName);
      if (newPath) state.files[newPath] = state.files[path] || '';
    } else {
      // Shallow folder duplicate — create empty folder with same structure.
      const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      createFolder(parentPath, copyName);
    }
    saveState();
  }

  function renderTree() {
    const root = $('#treeRoot');
    root.innerHTML = '';
    state.tree.forEach(node => root.appendChild(buildTreeNode(node, 0)));
    updateFileCount();
    applyFileSearchFilter();
  }

  function buildTreeNode(node, depth) {
    const li = document.createElement('li');
    const item = document.createElement('div');
    const isFolder = node.type === 'folder';
    item.className = `tree-item ${isFolder ? 'folder' : ''} ${isFolder && !node.expanded ? 'collapsed' : ''} ${state.activeTab === node.path ? 'active' : ''} ${state.dirty[node.path] ? 'dirty' : ''}`;
    item.style.paddingLeft = `${6 + depth * 14}px`;
    item.dataset.path = node.path;
    item.dataset.type = node.type;

    const caret = isFolder ? `<span class="ti-caret">▾</span>` : `<span class="ti-caret"></span>`;
    const ico = isFolder
      ? `<span class="ti-ico folder">▣</span>`
      : `<span class="ti-ico ${iconOfPath(node.path)}">${iconGlyph(node.path)}</span>`;
    item.innerHTML = `${caret}${ico}<span class="ti-name">${escapeHtml(node.name)}</span>`;
    li.appendChild(item);

    if (isFolder) {
      const ul = document.createElement('ul');
      ul.className = 'tree-children';
      if (node.expanded && Array.isArray(node.children)) {
        node.children.forEach(c => ul.appendChild(buildTreeNode(c, depth + 1)));
      } else {
        ul.style.display = 'none';
      }
      li.appendChild(ul);

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('ti-caret')) e.stopPropagation();
        node.expanded = !node.expanded;
        saveState();
        renderTree();
      });
    } else {
      item.addEventListener('click', () => openFile(node.path));
    }

    // Right-click context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, node.path);
    });

    // Long-press for touch devices
    let pressTimer = null;
    item.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      pressTimer = setTimeout(() => {
        showContextMenu(touch.clientX, touch.clientY, node.path);
      }, 600);
    }, { passive: true });
    item.addEventListener('touchend', () => clearTimeout(pressTimer));
    item.addEventListener('touchmove', () => clearTimeout(pressTimer));

    return li;
  }

  function iconGlyph(path) {
    const ext = path.split('.').pop().toLowerCase();
    return ({ js: 'JS', html: '<>', css: '#', json: '{}', md: 'M', yml: 'Y', sh: '$', txt: '·' })[ext] || '·';
  }

  function updateFileCount() {
    const count = countFiles(state.tree);
    $('#fileCountStatus').textContent = `${count} file${count === 1 ? '' : 's'}`;
  }

  function countFiles(tree) {
    return tree.reduce((acc, n) => acc + (n.type === 'file' ? 1 : countFiles(n.children || [])), 0);
  }

  function applyFileSearchFilter() {
    const q = $('#fileSearchInput').value.trim().toLowerCase();
    const count = $('#fileSearchCount');
    if (!q) { count.textContent = ''; $$('#treeRoot .tree-item').forEach(el => el.style.display = ''); return; }
    let matches = 0;
    $$('#treeRoot .tree-item').forEach(el => {
      const name = el.querySelector('.ti-name')?.textContent.toLowerCase() || '';
      const path = (el.dataset.path || '').toLowerCase();
      const hit = name.includes(q) || path.includes(q);
      el.style.display = hit ? '' : 'none';
      if (hit && el.dataset.type === 'file') matches++;
    });
    count.textContent = `${matches}`;
  }

  function showContextMenu(x, y, path) {
    state.ctxTargetPath = path;
    const menu = $('#ctxMenu');
    menu.style.left = `${Math.min(x, window.innerWidth - 160)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 180)}px`;
    menu.classList.add('show');
  }

  function hideContextMenu() {
    $('#ctxMenu').classList.remove('show');
    state.ctxTargetPath = null;
  }

  // ==================================================================
  // [06] CODE EDITOR (tabs, line numbers, highlight overlay)
  // ==================================================================
  function openFile(path) {
    if (!state.files[path] && state.files[path] !== '') state.files[path] = '';
    if (!state.openTabs.includes(path)) state.openTabs.push(path);
    state.activeTab = path;
    saveState();
    renderTree();
    renderTabs();
    loadActiveTabIntoEditor();
  }

  function closeTab(path) {
    state.openTabs = state.openTabs.filter(t => t !== path);
    if (state.activeTab === path) state.activeTab = state.openTabs[0] || null;
    saveState();
    renderTabs();
    loadActiveTabIntoEditor();
  }

  function renderTabs() {
    const list = $('#tabList');
    list.innerHTML = state.openTabs.map(p => {
      const name = p.split('/').pop();
      const active = p === state.activeTab ? 'active' : '';
      const dirty = state.dirty[p] ? 'dirty' : '';
      const ico = iconGlyph(p);
      return `<div class="tab ${active} ${dirty}" data-path="${escapeHtml(p)}">
        <span class="tab-ico">${ico}</span>
        <span class="tab-name">${escapeHtml(name)}</span>
        <span class="tab-close" data-close="${escapeHtml(p)}">×</span>
      </div>`;
    }).join('');

    $$('#tabList .tab').forEach(t => {
      t.addEventListener('click', (e) => {
        if (e.target.dataset.close) {
          closeTab(e.target.dataset.close);
          return;
        }
        state.activeTab = t.dataset.path;
        saveState();
        renderTabs();
        loadActiveTabIntoEditor();
        renderTree();
      });
    });
  }

  function loadActiveTabIntoEditor() {
    const ta = $('#editorTextarea');
    if (!state.activeTab) {
      ta.value = '';
      ta.disabled = true;
      $('#highlightLayer').innerHTML = '';
      $('#lintLayer').innerHTML = '';
      renderLineNumbers(0);
      updateStatusbar();
      return;
    }
    ta.disabled = false;
    ta.value = state.files[state.activeTab] || '';
    refreshEditorHighlight();
    renderLineNumbers(ta.value.split('\n').length);
    runLinter();
    updateStatusbar();
  }

  function refreshEditorHighlight() {
    const code = $('#editorTextarea').value;
    const lang = state.activeTab ? langOfPath(state.activeTab) : 'plaintext';
    $('#highlightLayer').innerHTML = highlightCode(code, lang);
    syncEditorScroll();
  }

  function renderLineNumbers(lineCount) {
    const gutter = $('#lineNumbers');
    const ta = $('#editorTextarea');
    const cursorLine = getCursorLine();
    const lintLines = new Set(state.lintIssues.filter(i => i.path === state.activeTab).map(i => i.line));
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      const cls = `ln${i === cursorLine ? ' current' : ''}${lintLines.has(i) ? ' lint' : ''}`;
      html += `<span class="${cls}">${i}</span>`;
    }
    gutter.innerHTML = html;
  }

  function getCursorLine() {
    const ta = $('#editorTextarea');
    const v = ta.value.slice(0, ta.selectionStart);
    return v.split('\n').length;
  }

  function getCursorCol() {
    const ta = $('#editorTextarea');
    const v = ta.value.slice(0, ta.selectionStart);
    const lineStart = v.lastIndexOf('\n') + 1;
    return (ta.selectionStart - lineStart) + 1;
  }

  function syncEditorScroll() {
    const ta = $('#editorTextarea');
    $('#highlightLayer').scrollTop = ta.scrollTop;
    $('#highlightLayer').scrollLeft = ta.scrollLeft;
    $('#lintLayer').scrollTop = ta.scrollTop;
    $('#lintLayer').scrollLeft = ta.scrollLeft;
    $('#lineNumbers').scrollTop = ta.scrollTop;
  }

  function updateStatusbar() {
    const ta = $('#editorTextarea');
    const v = ta.value;
    const lines = v ? v.split('\n').length : 0;
    $('#sbPath').textContent = state.activeTab || '—';
    $('#sbLang').textContent = state.activeTab ? langOfPath(state.activeTab) : 'plaintext';
    $('#sbCursor').textContent = `Ln ${getCursorLine()}, Col ${getCursorCol()}`;
    $('#sbLines').textContent = `${lines} lines`;
    $('#sbChars').textContent = `${v.length} chars`;
    const lintCount = state.lintIssues.filter(i => i.path === state.activeTab).length;
    const lintEl = $('#sbLint');
    lintEl.textContent = `Lint: ${lintCount} issue${lintCount === 1 ? '' : 's'}`;
    lintEl.className = `sb-item lint-status ${lintCount ? 'has-issues' : 'clean'}`;
    const saved = $('#sbSaved');
    if (state.activeTab) {
      const dirty = state.dirty[state.activeTab];
      saved.textContent = dirty ? 'unsaved' : 'saved';
      saved.className = dirty ? 'unsaved' : 'saved';
    } else {
      saved.textContent = '';
      saved.className = '';
    }
  }

  function saveActiveTab() {
    if (!state.activeTab) { toast('Nothing to save', 'Open a file first.', 'warn'); return; }
    state.files[state.activeTab] = $('#editorTextarea').value;
    state.dirty[state.activeTab] = false;
    saveState();
    renderTabs();
    renderTree();
    updateStatusbar();
    toast('Saved', state.activeTab, 'success', 2200);
  }

  // ==================================================================
  // [07] REAL-TIME LINTER (regex tokenizer + error detection)
  // ==================================================================
  // Lightweight JS tokenizer. Detects:
  //   - Unclosed strings (', ", `)
  //   - Unclosed brackets/braces/parens
  //   - Trailing comma in function calls (warning)
  //   - Use of == / != instead of === / !== (warning)
  //   - Missing semicolons after statements ending with ) ] } identifier (info)

  const LINT_TOKEN_RE = /(\s+)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(['"`])((?:\\.|(?!\3).)*)?(\3?)|(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|this|true|false|null|undefined|async|await|yield|delete|void)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)|([{}()\[\]])|([=+\-*/%<>!&|^~?:;,.])|(.)/g;

  function tokenize(code) {
    const tokens = [];
    let m;
    LINT_TOKEN_RE.lastIndex = 0;
    let line = 1, col = 1;
    while ((m = LINT_TOKEN_RE.exec(code)) !== null) {
      const [full, ws, comment, quote, strBody, closingQuote, keyword, number, ident, bracket, punct, other] = m;
      // Advance line/col
      const lines = full.split('\n');
      if (lines.length > 1) { line += lines.length - 1; col = lines[lines.length - 1].length + 1; }
      else { col += full.length; }
      if (ws || comment) continue;
      if (quote) {
        tokens.push({ type: 'string', quote, value: strBody || '', closed: closingQuote === quote, line, col: col - full.length });
      } else if (keyword) {
        tokens.push({ type: 'keyword', value: keyword, line, col: col - full.length });
      } else if (number) {
        tokens.push({ type: 'number', value: number, line, col: col - full.length });
      } else if (ident) {
        tokens.push({ type: 'ident', value: ident, line, col: col - full.length });
      } else if (bracket) {
        tokens.push({ type: 'bracket', value: bracket, line, col: col - full.length });
      } else if (punct) {
        tokens.push({ type: 'punct', value: punct, line, col: col - full.length });
      } else {
        tokens.push({ type: 'other', value: other || full, line, col: col - full.length });
      }
    }
    return tokens;
  }

  function runLinter() {
    state.lintIssues = state.lintIssues.filter(i => i.path !== state.activeTab);
    if (!state.activeTab) { renderLintLayer(); renderProblemsList(); updateStatusbar(); return; }
    const lang = langOfPath(state.activeTab);
    if (lang !== 'javascript') {
      renderLintLayer();
      renderProblemsList();
      updateStatusbar();
      return;
    }
    const code = $('#editorTextarea').value;
    const issues = lintJavaScript(code);
    issues.forEach(i => state.lintIssues.push({ ...i, path: state.activeTab }));
    renderLintLayer();
    renderProblemsList();
    updateStatusbar();
    renderLineNumbers(code.split('\n').length);
  }

  function lintJavaScript(code) {
    const issues = [];
    const tokens = tokenize(code);
    const lines = code.split('\n');

    // Check 1: unclosed strings
    tokens.forEach(t => {
      if (t.type === 'string' && !t.closed) {
        issues.push({ line: t.line, col: t.col, msg: `Unclosed string literal (${t.quote})`, severity: 'err' });
      }
    });

    // Check 2: bracket balance
    const stack = [];
    const pairs = { '(': ')', '[': ']', '{': '}' };
    tokens.forEach(t => {
      if (t.type === 'bracket') {
        if (pairs[t.value]) {
          stack.push({ value: t.value, line: t.line, col: t.col });
        } else {
          const top = stack[stack.length - 1];
          if (!top) {
            issues.push({ line: t.line, col: t.col, msg: `Unexpected closing bracket "${t.value}"`, severity: 'err' });
          } else if (pairs[top.value] !== t.value) {
            issues.push({ line: t.line, col: t.col, msg: `Mismatched bracket "${t.value}" (expected "${pairs[top.value]}")`, severity: 'err' });
          } else {
            stack.pop();
          }
        }
      }
    });
    stack.forEach(t => {
      issues.push({ line: t.line, col: t.col, msg: `Unclosed bracket "${t.value}"`, severity: 'err' });
    });

    // Check 3: == and != usage (warning)
    tokens.forEach((t, i) => {
      if (t.type === 'punct' && (t.value === '=' || t.value === '!') && tokens[i + 1]?.value === '=' && tokens[i + 2]?.value !== '=') {
        issues.push({ line: t.line, col: t.col, msg: `Use ${t.value}== instead of ${t.value}= for strict comparison`, severity: 'warn' });
      }
    });

    // Check 4: missing semicolons (info) — heuristic: line ends with ) ] } identifier number string and next non-empty line doesn't start with } ) ] ; & | + - * / , . ?
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
      if (/(if|for|while|switch|function|else|do|try|catch|finally|class|interface)\b.*\b$/.test(line)) continue;
      if (line.endsWith('{') || line.endsWith(';') || line.endsWith(',') || line.endsWith(':') || line.endsWith('.') || line.endsWith('\\') || line.endsWith('=>')) continue;
      if (line.endsWith(')') || line.endsWith(']') || line.endsWith('}') || /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(line) || /["'`][^"'`]*["'`]$/.test(line) || /\d$/.test(line)) {
        // Skip if the next non-empty line starts with } ) ] ; , . + - * / & | ?
        const next = (lines[i + 1] || '').trim();
        if (next && /^[}).;,+\-*/&|?]/.test(next)) continue;
        if (line.endsWith(')') && /^(if|for|while|switch|catch|function|return|else)\b/.test(lines.slice(0, i + 1).reverse().join(' ').match(/\b(if|for|while|switch|catch|function|return|else)\b[^)]*$/)?.[0] || '')) continue;
        issues.push({ line: i + 1, col: line.length, msg: 'Possibly missing semicolon', severity: 'info' });
      }
    }

    // Check 5: console.log in code (info)
    tokens.forEach((t, i) => {
      if (t.type === 'ident' && t.value === 'console' && tokens[i + 1]?.value === '.' && tokens[i + 2]?.value === 'log') {
        issues.push({ line: t.line, col: t.col, msg: 'console.log statement found', severity: 'info' });
      }
    });

    // Deduplicate by line+col+msg
    const seen = new Set();
    return issues.filter(i => {
      const k = `${i.line}:${i.col}:${i.msg}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function renderLintLayer() {
    const layer = $('#lintLayer');
    if (!state.activeTab || langOfPath(state.activeTab) !== 'javascript') {
      layer.innerHTML = '';
      return;
    }
    const code = $('#editorTextarea').value;
    const lines = code.split('\n');
    const issuesByLine = {};
    state.lintIssues.filter(i => i.path === state.activeTab).forEach(i => {
      if (!issuesByLine[i.line]) issuesByLine[i.line] = [];
      issuesByLine[i.line].push(i);
    });
    let html = '';
    for (let i = 0; i < lines.length; i++) {
      const ln = i + 1;
      const lineIssues = issuesByLine[ln] || [];
      if (lineIssues.length && lineIssues.some(x => x.severity === 'err')) {
        html += `<span class="lint-err">${escapeHtml(lines[i])}</span>\n`;
      } else {
        html += escapeHtml(lines[i]) + '\n';
      }
    }
    layer.innerHTML = html;
  }

  function renderProblemsList() {
    const list = $('#problemsList');
    const issues = state.lintIssues;
    const count = issues.length;
    $('#problemsCount').textContent = count;
    $('#problemsCount').className = `bs-count ${count ? 'has-issues' : ''}`;
    if (!count) {
      list.innerHTML = '<li class="problems-empty">No problems detected. Run the linter to scan the active file.</li>';
      return;
    }
    list.innerHTML = issues.map(i => {
      const sevIcon = i.severity === 'err' ? '✕' : i.severity === 'warn' ? '!' : 'i';
      return `<li class="${i.severity}" data-line="${i.line}" data-path="${escapeHtml(i.path)}">
        <span class="p-icon">${sevIcon}</span>
        <span class="p-pos">Ln ${i.line}:${i.col}</span>
        <span class="p-msg">${escapeHtml(i.msg)}</span>
        <span class="p-file">${escapeHtml(i.path)}</span>
      </li>`;
    }).join('');
    $$('#problemsList li').forEach(li => {
      li.addEventListener('click', () => {
        const path = li.dataset.path;
        const line = +li.dataset.line;
        if (path) {
          openFile(path);
          setTimeout(() => {
            const ta = $('#editorTextarea');
            const lines = ta.value.split('\n');
            let pos = 0;
            for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
            ta.focus();
            ta.setSelectionRange(pos, pos + (lines[line - 1] || '').length);
            syncEditorScroll();
          }, 60);
        }
      });
    });
  }

  // ==================================================================
  // [06b] SYNTAX HIGHLIGHTING
  // ==================================================================
  function highlightCode(code, lang) {
    if (lang === 'javascript' || lang === 'json') {
      return highlightJs(code);
    }
    if (lang === 'html') {
      return highlightHtml(code);
    }
    if (lang === 'css') {
      return highlightCss(code);
    }
    return escapeHtml(code);
  }

  function highlightJs(code) {
    // Tokenize and wrap in spans. Use the same regex as the linter for consistency.
    let out = '';
    let m;
    LINT_TOKEN_RE.lastIndex = 0;
    while ((m = LINT_TOKEN_RE.exec(code)) !== null) {
      const [full, ws, comment, quote, strBody, closingQuote, keyword, number, ident, bracket, punct] = m;
      if (ws) { out += full; continue; }
      if (comment) { out += `<span class="tok-comment">${escapeHtml(comment)}</span>`; continue; }
      if (quote) {
        const closed = closingQuote === quote;
        const str = escapeHtml(quote + (strBody || '') + (closingQuote || ''));
        out += `<span class="tok-string"${closed ? '' : ' style="text-decoration:underline wavy #ef4444"'}>${str}</span>`;
        continue;
      }
      if (keyword) { out += `<span class="tok-keyword">${keyword}</span>`; continue; }
      if (number) { out += `<span class="tok-number">${number}</span>`; continue; }
      if (ident) {
        const builtins = ['console', 'window', 'document', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise', 'fetch', 'localStorage', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'canvas', 'ctx'];
        if (builtins.includes(ident)) out += `<span class="tok-builtin">${ident}</span>`;
        else if (code.indexOf(`function ${ident}`) >= 0 || code.indexOf(`${ident}(`) >= 0) out += `<span class="tok-fn">${ident}</span>`;
        else out += ident;
        continue;
      }
      if (bracket) { out += `<span class="tok-punct">${bracket}</span>`; continue; }
      if (punct) {
        if (/[+\-*/%=<>!&|^~?:]/.test(punct)) out += `<span class="tok-operator">${punct}</span>`;
        else out += `<span class="tok-punct">${punct}</span>`;
        continue;
      }
      out += escapeHtml(full);
    }
    return out;
  }

  function highlightHtml(code) {
    return escapeHtml(code)
      .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="tok-keyword">$2</span>')
      .replace(/([a-zA-Z-]+)=(&quot;.*?&quot;)/g, '<span class="tok-builtin">$1</span>=<span class="tok-string">$2</span>')
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>');
  }

  function highlightCss(code) {
    return escapeHtml(code)
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
      .replace(/([.#]?[a-zA-Z_-][\w-]*)(\s*\{)/g, '<span class="tok-fn">$1</span>$2')
      .replace(/([a-zA-Z-]+)(\s*:)/g, '<span class="tok-keyword">$1</span>$2')
      .replace(/(:\s*)([^;{}\n]+)(;)/g, '$1<span class="tok-string">$2</span>$3');
  }

  // ==================================================================
  // [08] GEMINI AI COPILOT
  // ==================================================================
  const GEMINI_ENDPOINT = (model, key) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  async function geminiSend(promptText) {
    if (state.geminiBusy) { toast('Busy', 'Gemini is already responding. Please wait.', 'warn'); return; }
    if (!state.settings.geminiKey) {
      toast('No API key', 'Open the Gemini API key modal to add your key.', 'warn');
      openModal('geminiKeyModal');
      return;
    }
    const prompt = promptText.trim();
    if (!prompt) return;

    // Add user message to history
    state.geminiHistory.push({ role: 'user', body: prompt, ts: Date.now() });
    saveState();
    renderGeminiHistory();

    // Clear the input
    $('#geminiPrompt').value = '';

    // Build the request body
    const contents = state.geminiHistory.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.body }],
    }));

    // Optionally include the active file as context
    let contextPrefix = '';
    if (state.settings.geminiSendContext && state.activeTab) {
      const lang = langOfPath(state.activeTab);
      const code = state.files[state.activeTab] || '';
      contextPrefix = `Active file: ${state.activeTab}\nLanguage: ${lang}\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
      // Inject as a leading user part
      contents.unshift({ role: 'user', parts: [{ text: contextPrefix + 'Context above is the currently open file. Use it for follow-up questions.' }] });
    }

    const body = {
      contents,
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    };
    if (state.settings.geminiSystem) {
      body.systemInstruction = { parts: [{ text: state.settings.geminiSystem }] };
    }

    // Add a loading placeholder
    state.geminiBusy = true;
    $('#geminiSendBtn').disabled = true;
    const loadingMsg = { role: 'assistant', body: 'Thinking…', ts: Date.now(), loading: true };
    state.geminiHistory.push(loadingMsg);
    renderGeminiHistory();
    $('#geminiStatus').textContent = 'Sending…';

    try {
      const res = await fetch(GEMINI_ENDPOINT(state.settings.geminiModel, state.settings.geminiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      // Remove the loading placeholder
      state.geminiHistory = state.geminiHistory.filter(m => m !== loadingMsg);

      if (!res.ok) {
        const errMsg = data?.error?.message || `HTTP ${res.status} ${res.statusText}`;
        state.geminiHistory.push({ role: 'assistant', body: `Error: ${errMsg}`, ts: Date.now(), error: true });
        $('#geminiStatus').textContent = `Error: ${errMsg.slice(0, 60)}`;
        toast('Gemini error', errMsg, 'error', 5000);
      } else {
        const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '(no response)';
        state.geminiHistory.push({ role: 'assistant', body: text, ts: Date.now() });
        $('#geminiStatus').textContent = 'Ready';
      }
    } catch (e) {
      state.geminiHistory = state.geminiHistory.filter(m => m !== loadingMsg);
      state.geminiHistory.push({ role: 'assistant', body: `Network error: ${e.message}`, ts: Date.now(), error: true });
      $('#geminiStatus').textContent = `Network error`;
      toast('Network error', e.message, 'error', 5000);
    } finally {
      state.geminiBusy = false;
      $('#geminiSendBtn').disabled = false;
      saveState();
      renderGeminiHistory();
    }
  }

  function renderGeminiHistory() {
    const wrap = $('#geminiHistory');
    if (!state.geminiHistory.length) {
      wrap.innerHTML = `
        <div class="gemini-empty">
          <div class="gemini-empty-icon">✦</div>
          <p>Ask Gemini to refactor, explain, generate, or fix code.</p>
          <p class="gemini-empty-hint">Suggestions that include a code block will show <strong>Insert</strong> and <strong>Replace</strong> actions.</p>
        </div>`;
      return;
    }
    wrap.innerHTML = state.geminiHistory.map(m => {
      const roleClass = m.role === 'user' ? 'user' : 'assistant';
      const errorClass = m.error ? 'error' : '';
      const loadingClass = m.loading ? 'loading' : '';
      const roleLabel = m.role === 'user' ? 'You' : 'Gemini';
      const body = renderGeminiBody(m.body);
      const actions = m.role === 'assistant' && !m.loading ? renderGeminiActions(m.body) : '';
      return `<div class="gemini-msg ${roleClass} ${errorClass} ${loadingClass}">
        <div class="gm-role">${roleLabel}</div>
        <div class="gm-body">${body}</div>
        ${actions}
      </div>`;
    }).join('');
    wrap.scrollTop = wrap.scrollHeight;
  }

  function renderGeminiBody(text) {
    // Parse markdown: code blocks, inline code, paragraphs.
    const parts = [];
    const codeBlockRe = /```(\w+)?\n([\s\S]*?)```/g;
    let last = 0; let m;
    while ((m = codeBlockRe.exec(text)) !== null) {
      if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
      parts.push({ type: 'code', lang: m[1] || '', value: m[2] });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
    return parts.map(p => {
      if (p.type === 'code') {
        return `<pre><code>${escapeHtml(p.value)}</code></pre>`;
      }
      // Inline code
      const escaped = escapeHtml(p.value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      return `<div>${escaped}</div>`;
    }).join('');
  }

  function renderGeminiActions(body) {
    // Detect fenced code blocks and offer Insert/Replace.
    const has = /```\w*\n[\s\S]*?```/.test(body);
    if (!has) return '';
    return `<div class="gm-actions">
      <button class="gm-action-btn" data-gm-action="insert">Insert at cursor</button>
      <button class="gm-action-btn" data-gm-action="replace">Replace active file</button>
      <button class="gm-action-btn" data-gm-action="copy">Copy code</button>
    </div>`;
  }

  function extractFirstCodeBlock(text) {
    const m = /```(\w+)?\n([\s\S]*?)```/.exec(text);
    return m ? m[2] : null;
  }

  function geminiAction(action, msgBody) {
    const code = extractFirstCodeBlock(msgBody);
    if (!code) { toast('No code block', 'No fenced code block was found in this response.', 'warn'); return; }
    if (action === 'insert') {
      if (!state.activeTab) { toast('No file open', 'Open a file first to insert the code.', 'warn'); return; }
      const ta = $('#editorTextarea');
      const pos = ta.selectionStart;
      ta.value = ta.value.slice(0, pos) + code + ta.value.slice(pos);
      state.dirty[state.activeTab] = true;
      state.files[state.activeTab] = ta.value;
      saveState();
      refreshEditorHighlight();
      runLinter();
      renderTabs();
      renderTree();
      updateStatusbar();
      toast('Inserted', `Code inserted at cursor in ${state.activeTab}`, 'success');
    } else if (action === 'replace') {
      if (!state.activeTab) { toast('No file open', 'Open a file first to replace its contents.', 'warn'); return; }
      const ta = $('#editorTextarea');
      ta.value = code;
      state.dirty[state.activeTab] = true;
      state.files[state.activeTab] = code;
      saveState();
      refreshEditorHighlight();
      runLinter();
      renderTabs();
      renderTree();
      updateStatusbar();
      toast('Replaced', `Contents of ${state.activeTab} replaced with Gemini's suggestion.`, 'success');
    } else if (action === 'copy') {
      navigator.clipboard.writeText(code).then(() => toast('Copied', 'Code block copied to clipboard.', 'success', 2200));
    }
  }

  async function geminiTestConnection() {
    const key = $('#geminiKeyInput').value.trim();
    const model = $('#geminiModelSelect').value;
    if (!key) { setKeyStatus('Please enter an API key first.', 'err'); return; }
    setKeyStatus('Testing…', 'info');
    try {
      const res = await fetch(GEMINI_ENDPOINT(model, key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: OK' }] }],
          generationConfig: { maxOutputTokens: 8 },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKeyStatus(`Error: ${data?.error?.message || res.status}`, 'err');
        return;
      }
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(empty)';
      setKeyStatus(`Connected. Model replied: "${txt.trim()}"`, 'ok');
    } catch (e) {
      setKeyStatus(`Network error: ${e.message}`, 'err');
    }
  }

  function setKeyStatus(msg, kind) {
    const el = $('#geminiKeyStatus');
    el.textContent = msg;
    el.className = `key-status ${kind}`;
  }

  // ==================================================================
  // [09] LIVE PERFORMANCE PROFILER (canvas, 3 wave strips, RAF)
  // ==================================================================
  let profilerCanvas, profilerCtx;

  function initProfiler() {
    profilerCanvas = $('#profilerCanvas');
    profilerCtx = profilerCanvas.getContext('2d');
    resizeProfilerCanvas();
    window.addEventListener('resize', resizeProfilerCanvas);
    state.profiler.lastFrame = performance.now();
    state.profiler.lastFpsTs = performance.now();
    requestAnimationFrame(profilerTick);
  }

  function resizeProfilerCanvas() {
    if (!profilerCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = profilerCanvas.getBoundingClientRect();
    profilerCanvas.width = rect.width * dpr;
    profilerCanvas.height = rect.height * dpr;
    profilerCtx.setTransform(1, 0, 0, 1, 0, 0);
    profilerCtx.scale(dpr, dpr);
  }

  function profilerTick(now) {
    const dt = (now - state.profiler.lastFrame) / 1000;
    state.profiler.lastFrame = now;
    state.profiler.frameCount++;
    if (now - state.profiler.lastFpsTs >= 500) {
      state.profiler.fps = Math.round(state.profiler.frameCount * 1000 / (now - state.profiler.lastFpsTs));
      state.profiler.frameCount = 0;
      state.profiler.lastFpsTs = now;
    }

    if (state.profiler.running) {
      // Generate mock values with sine + noise + occasional spikes
      const t = now / 1000;
      const cpuBase = 30 + Math.sin(t * 0.6) * 18 + Math.sin(t * 1.7) * 8;
      const memBase = 120 + Math.sin(t * 0.3) * 30 + Math.sin(t * 0.9) * 12;
      const latBase = 14 + Math.sin(t * 1.2) * 6 + Math.sin(t * 2.4) * 3;
      const spike = Math.random() < 0.02 ? (Math.random() * 30) : 0;
      state.profiler.cpu = Math.max(2, Math.min(100, cpuBase + (Math.random() - 0.5) * 6 + spike));
      state.profiler.mem = Math.max(40, Math.min(400, memBase + (Math.random() - 0.5) * 10 + spike * 2));
      state.profiler.lat = Math.max(2, Math.min(80, latBase + (Math.random() - 0.5) * 4 + spike));
      // Push to history buffers
      state.profiler.cpuHist.push(state.profiler.cpu); state.profiler.cpuHist.shift();
      state.profiler.memHist.push(state.profiler.mem); state.profiler.memHist.shift();
      state.profiler.latHist.push(state.profiler.lat); state.profiler.latHist.shift();
    }

    drawProfiler();
    // Update stat readouts (throttled)
    if (state.profiler.frameCount % 6 === 0) {
      $('#psCpu').textContent = `${Math.round(state.profiler.cpu)}%`;
      $('#psMem').textContent = `${Math.round(state.profiler.mem)} MB`;
      $('#psLat').textContent = `${state.profiler.lat.toFixed(1)} ms`;
      $('#psFps').textContent = `${state.profiler.fps}`;
    }

    requestAnimationFrame(profilerTick);
  }

  function drawProfiler() {
    if (!profilerCtx) return;
    const w = profilerCanvas.width / (window.devicePixelRatio || 1);
    const h = profilerCanvas.height / (window.devicePixelRatio || 1);
    const ctx = profilerCtx;
    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Three wave strips — each takes 1/3 of the canvas height.
    const stripH = h / 3;
    drawWave(ctx, state.profiler.cpuHist, 0, stripH, w, '#6366f1', 'CPU %', v => v / 100);
    drawWave(ctx, state.profiler.memHist, stripH, stripH, w, '#22c55e', 'MEM MB', v => v / 400);
    drawWave(ctx, state.profiler.latHist, stripH * 2, stripH, w, '#f59e0b', 'LAT ms', v => v / 80);
  }

  function drawWave(ctx, hist, yOff, h, w, color, label, norm) {
    // Glow fill
    ctx.beginPath();
    const n = hist.length;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const y = yOff + h - (norm(hist[i]) * (h - 4)) - 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(w, yOff + h);
    ctx.lineTo(0, yOff + h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, yOff, 0, yOff + h);
    grad.addColorStop(0, color + '44');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const y = yOff + h - (norm(hist[i]) * (h - 4)) - 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = color;
    ctx.font = '10px "SF Mono", Menlo, monospace';
    ctx.fillText(label, 6, yOff + 12);
  }

  function toggleProfiler() {
    state.profiler.running = !state.profiler.running;
    $('#bsToggleProfiler').textContent = state.profiler.running ? '⏸ Profiler' : '▶ Profiler';
  }

  // ==================================================================
  // [10] VISUAL LAYOUT INSPECTOR
  // ==================================================================
  function openInspector() {
    openModal('inspectorModal');
    renderInspectorTree();
  }

  function renderInspectorTree() {
    const root = $('#inspectorTree');
    root.innerHTML = '';
    // Walk the live DOM of the IDE itself for inspection.
    const body = document.body;
    root.appendChild(buildInspectorNode(body, 0));
  }

  function buildInspectorNode(el, depth) {
    const li = document.createElement('li');
    const tag = el.tagName?.toLowerCase() || '#text';
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    li.innerHTML = `<span class="it-tag">${escapeHtml(tag)}</span>${id ? `<span class="it-id">${escapeHtml(id)}</span>` : ''}${cls ? `<span class="it-class">${escapeHtml(cls)}</span>` : ''}`;
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      $$('#inspectorTree li').forEach(x => x.classList.remove('selected'));
      li.classList.add('selected');
      renderInspectorProps(el);
    });
    if (el.children) {
      const ul = document.createElement('ul');
      Array.from(el.children).slice(0, 50).forEach(c => ul.appendChild(buildInspectorNode(c, depth + 1)));
      li.appendChild(ul);
    }
    return li;
  }

  function renderInspectorProps(el) {
    const wrap = $('#inspectorProps');
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const rows = [
      ['tagName', el.tagName],
      ['id', el.id || '—'],
      ['className', typeof el.className === 'string' ? el.className || '—' : '—'],
      ['display', cs.display],
      ['position', cs.position],
      ['width', `${rect.width.toFixed(1)} px`],
      ['height', `${rect.height.toFixed(1)} px`],
      ['color', cs.color],
      ['background', cs.backgroundColor],
      ['font-size', cs.fontSize],
      ['font-family', cs.fontFamily.split(',').slice(0, 2).join(',') + '…'],
      ['padding', cs.padding],
      ['margin', cs.margin],
      ['border', cs.border],
      ['border-radius', cs.borderRadius],
      ['opacity', cs.opacity],
      ['z-index', cs.zIndex],
      ['overflow', cs.overflow],
      ['backdrop-filter', cs.backdropFilter || cs.webkitBackdropFilter || 'none'],
      ['child count', el.children.length],
    ];
    wrap.innerHTML = rows.map(([k, v]) => `<div class="prop-row"><span class="prop-key">${escapeHtml(k)}</span><span class="prop-val">${escapeHtml(String(v))}</span></div>`).join('');
  }

  // ==================================================================
  // [11] GLOBAL SEARCH & REPLACE
  // ==================================================================
  function runGlobalSearch() {
    const find = $('#gsFind').value;
    const replace = $('#gsReplace').value;
    const useRegex = $('#gsRegex').checked;
    const caseSensitive = $('#gsCase').checked;
    if (!find) { toast('Empty query', 'Type something to find.', 'warn'); return; }

    let re;
    try {
      re = useRegex ? new RegExp(find, caseSensitive ? 'g' : 'gi') : new RegExp(escapeRegex(find), caseSensitive ? 'g' : 'gi');
    } catch (e) {
      $('#gsSummary').textContent = `Invalid regex: ${e.message}`;
      return;
    }

    const results = [];
    Object.keys(state.files).forEach(path => {
      const lines = state.files[path].split('\n');
      lines.forEach((line, i) => {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line)) !== null) {
          results.push({ path, line: i + 1, col: m.index + 1, text: line, match: m[0] });
          if (m.index === re.lastIndex) re.lastIndex++;
        }
      });
    });

    const summary = `${results.length} match${results.length === 1 ? '' : 'es'} across ${new Set(results.map(r => r.path)).size} file(s)`;
    $('#gsSummary').textContent = summary;

    const list = $('#gsResults');
    if (!results.length) {
      list.innerHTML = '<li style="text-align:center;color:var(--text-3);padding:18px;">No matches.</li>';
      return;
    }
    list.innerHTML = results.slice(0, 200).map((r, i) => {
      const escaped = escapeHtml(r.text);
      const matchEsc = escapeHtml(r.match);
      const highlighted = escaped.replace(new RegExp(escapeRegex(matchEsc), 'g'), `<mark>${matchEsc}</mark>`);
      return `<li data-idx="${i}">
        <span class="sr-file">${escapeHtml(r.path)}</span>
        <span class="sr-line">:${r.line}:${r.col}</span>
        <div class="sr-text">${highlighted}</div>
      </li>`;
    }).join('');

    $$('#gsResults li').forEach(li => {
      li.addEventListener('click', () => {
        const idx = +li.dataset.idx;
        const r = results[idx];
        openFile(r.path);
        setTimeout(() => {
          const ta = $('#editorTextarea');
          const lines = ta.value.split('\n');
          let pos = 0;
          for (let i = 0; i < r.line - 1; i++) pos += lines[i].length + 1;
          pos += r.col - 1;
          ta.focus();
          ta.setSelectionRange(pos, pos + r.match.length);
          syncEditorScroll();
        }, 60);
      });
    });

    // Stash for replace-all
    state._lastSearch = { results, replace, re, useRegex, caseSensitive };
  }

  function globalReplaceAll() {
    if (!state._lastSearch) { runGlobalSearch(); }
    const s = state._lastSearch;
    if (!s || !s.results.length) { toast('No matches', 'Run a search first.', 'warn'); return; }
    const replaceText = $('#gsReplace').value;
    let totalReplaced = 0;
    const byPath = {};
    s.results.forEach(r => {
      if (!byPath[r.path]) byPath[r.path] = state.files[r.path];
    });
    Object.keys(byPath).forEach(path => {
      const original = state.files[path];
      s.re.lastIndex = 0;
      const replaced = original.replace(s.re, () => { totalReplaced++; return replaceText; });
      if (replaced !== original) {
        state.files[path] = replaced;
        state.dirty[path] = true;
        if (state.activeTab === path) {
          $('#editorTextarea').value = replaced;
          refreshEditorHighlight();
          runLinter();
          updateStatusbar();
        }
      }
    });
    saveState();
    renderTabs();
    renderTree();
    toast('Replaced', `${totalReplaced} occurrence(s) across ${Object.keys(byPath).length} file(s).`, 'success');
    runGlobalSearch();
  }

  // ==================================================================
  // [12] OTA PACKAGER
  // ==================================================================
  function openPackager() {
    openModal('packagerModal');
    $('#pkgAppName').value = state.settings.appName;
    $('#pkgBundleId').value = state.settings.bundleId;
    $('#pkgVersion').value = state.settings.version;
    $('#pkgBuild').value = state.settings.buildNumber;
    $('#pkgTarget').value = state.settings.target;
    $('#pkgDevices').value = state.settings.devices;
    updatePkgPreview();
  }

  function updatePkgPreview() {
    const name = $('#pkgAppName').value;
    const bundle = $('#pkgBundleId').value;
    const ver = $('#pkgVersion').value;
    const build = $('#pkgBuild').value;
    const safeName = name.replace(/\s+/g, '').slice(0, 15);
    const preview = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>      <string>${name}</string>
  <key>CFBundleName</key>             <string>${safeName}</string>
  <key>CFBundleIdentifier</key>       <string>${bundle}</string>
  <key>CFBundleShortVersionString</key> <string>${ver}</string>
  <key>CFBundleVersion</key>          <string>${build}</string>
  <key>CFBundleExecutable</key>       <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundlePackageType</key>      <string>APPL</string>
  <key>CFBundleInfoDictionaryVersion</key> <string>6.0</string>
  <key>MinimumOSVersion</key>         <string>${$('#pkgTarget').value}</string>
  <key>TargetedDeviceFamily</key>     <array><integer>1</integer><integer>2</integer></array>
</dict>
</plist>`;
    $('#pkgPreview').textContent = preview;
  }

  function savePackager() {
    state.settings.appName = $('#pkgAppName').value || DEFAULTS.appName;
    state.settings.bundleId = $('#pkgBundleId').value || DEFAULTS.bundleId;
    state.settings.version = $('#pkgVersion').value || DEFAULTS.version;
    state.settings.buildNumber = +$('#pkgBuild').value || 1;
    state.settings.target = $('#pkgTarget').value;
    state.settings.devices = $('#pkgDevices').value;
    saveState();
    applySettingsToTopbar();
    toast('Saved', 'OTA packager settings applied.', 'success');
  }

  function resetPackager() {
    Object.assign(state.settings, {
      appName: DEFAULTS.appName, bundleId: DEFAULTS.bundleId,
      version: DEFAULTS.version, buildNumber: DEFAULTS.buildNumber,
      target: DEFAULTS.target, devices: DEFAULTS.devices,
    });
    saveState();
    openPackager();
    applySettingsToTopbar();
    toast('Reset', 'Packager settings restored to defaults.', 'info');
  }

  function exportCapacitorConfig() {
    const cfg = {
      appId: state.settings.bundleId,
      appName: state.settings.appName,
      webDir: 'www',
      backgroundColor: '#0B0F19',
      ios: {
        scheme: 'App',
        contentInset: 'always',
        backgroundColor: '#0B0F19',
        preferredContentMode: 'mobile',
        scrollEnabled: true,
        limitsNavigationsToAppBoundDomains: false,
        handleApplicationNotifications: true,
      },
      plugins: {
        SplashScreen: { launchShowDuration: 1000, backgroundColor: '#0B0F19', showSpinner: false, iosSpinnerStyle: 'small' },
        StatusBar: { style: 'DARK', backgroundColor: '#0B0F19', overlaysWebView: false },
        Keyboard: { resize: 'native', style: 'DARK', resizeOnFullScreen: true },
      },
      cordova: {},
    };
    const blob = new Blob([JSON.stringify(cfg, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'capacitor.config.json'; a.click();
    URL.revokeObjectURL(url);
    toast('Exported', 'capacitor.config.json downloaded.', 'success');
  }

  function applySettingsToTopbar() {
    $('#ppName').textContent = state.settings.appName;
    $('#ppBundle').textContent = state.settings.bundleId;
    $('#ppVersion').textContent = state.settings.version;
    $('#geminiModelLabel').textContent = state.settings.geminiModel;
    $('#geminiModelFoot').textContent = state.settings.geminiModel;
  }

  // ==================================================================
  // [13] CONSOLE + TERMINAL EMULATOR
  // ==================================================================
  function logToConsole(level, msg) {
    const body = $('#consoleBody');
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-ts">[${fmtTime()}]</span><span class="log-level ${level}">${level.toUpperCase()}</span><span class="log-msg">${msg}</span>`;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  function clearConsole() {
    $('#consoleBody').innerHTML = '';
    $('#terminalBody').innerHTML = '';
    paintTerminalBanner();
  }

  const TERM_COMMANDS = {
    help: () => [
      'iOS Studio Extreme — terminal command reference',
      '',
      '  help            Show this help',
      '  clear           Clear the terminal',
      '  status          Show current app identity & build settings',
      '  build [config]  Run a mock iOS build (config: release|debug, default: release)',
      '  cap sync        Mock Capacitor asset sync',
      '  xcodebuild ...  Mock xcodebuild invocation',
      '  ls [path]       List project files (mock)',
      '  cat <file>      Print a mock file',
      '  whoami          Print the active user',
      '  uname           Print the active system',
      '  date            Print current time',
      '  echo <text>     Echo text back',
      '  gemini <prompt> Send a prompt to Gemini',
      '  files           List all open files',
      '  exit            Show a friendly goodbye',
    ],
    clear: () => { $('#terminalBody').innerHTML = ''; return null; },
    status: () => [
      `App Name      : ${state.settings.appName}`,
      `Bundle ID     : ${state.settings.bundleId}`,
      `Version       : ${state.settings.version} (${state.settings.buildNumber})`,
      `Target        : iphoneos · arm64 · iOS ${state.settings.target}`,
      `Devices       : ${state.settings.devices === '1,2' ? 'iPhone + iPad' : state.settings.devices === '1' ? 'iPhone' : 'iPad'}`,
      `Runner        : macos-14 (Apple Silicon M1)`,
      `Xcode         : 15.4 (15F31d)`,
      `Node          : 20.x LTS`,
      `Gemini Model  : ${state.settings.geminiModel}`,
      `Builds run    : ${state.build.runs}`,
      `Open files    : ${state.openTabs.length}`,
    ],
    whoami: () => ['studio@extreme'],
    uname: () => ['Darwin codespace 23.4.0 (simulated macOS-14 runner; actual host is your browser)'],
    date: () => [new Date().toString()],
    files: () => state.openTabs.length ? state.openTabs : ['(no files open)'],
    exit: () => ['Session preserved. The terminal is purely a mock — close the tab any time.'],
  };

  async function runTerminalCommand(raw) {
    const input = raw.trim();
    if (!input) return;
    const body = $('#terminalBody');
    const histLine = document.createElement('div');
    histLine.className = 'line';
    histLine.innerHTML = `<span class="prompt">studio@extreme:~$</span> ${escapeHtml(input)}`;
    body.appendChild(histLine);
    state.terminalHistory.push(input);
    state.terminalCursor = state.terminalHistory.length;
    body.scrollTop = body.scrollHeight;

    const [cmd, ...args] = input.split(/\s+/);
    const rest = args.join(' ');

    if (cmd === 'build') {
      const cfg = (args[0] || 'release').toLowerCase();
      await runMockTerminalBuild(cfg === 'debug' ? 'Debug' : 'Release');
      return;
    }
    if (cmd === 'cap' && args[0] === 'sync') {
      appendTermLine('<span class="prompt">$ </span>', 'npx cap sync ios');
      await sleep(180);
      appendTermLine('<span class="ok">✔ </span>', 'Found 4 web assets in www/');
      appendTermLine('<span class="ok">✔ </span>', 'Copied www → ios/App/App/public');
      appendTermLine('<span class="ok">✔ </span>', 'iOS native project synced (Capacitor 6.1.2)');
      return;
    }
    if (cmd === 'xcodebuild') {
      await runMockTerminalBuild('Release');
      return;
    }
    if (cmd === 'ls') {
      const path = args[0] || '.';
      const items = Object.keys(state.files).sort();
      items.forEach(i => appendTermLine('', i));
      return;
    }
    if (cmd === 'cat') {
      if (!args[0]) { appendTermLine('', 'usage: cat <file>', 'err'); return; }
      const f = state.files[args[0]];
      if (f === undefined) { appendTermLine('', `cat: ${args[0]}: No such file`, 'err'); return; }
      f.split('\n').forEach(l => appendTermLine('', l, 'muted'));
      return;
    }
    if (cmd === 'echo') {
      appendTermLine('', rest);
      return;
    }
    if (cmd === 'gemini') {
      if (!rest) { appendTermLine('', 'usage: gemini <prompt>', 'err'); return; }
      appendTermLine('<span class="kw">✦ </span>', `Sending to Gemini: "${rest.slice(0, 80)}${rest.length > 80 ? '…' : ''}"`);
      await geminiSend(rest);
      return;
    }
    if (TERM_COMMANDS[cmd]) {
      const out = TERM_COMMANDS[cmd](args);
      if (out === null) return;
      out.forEach(l => appendTermLine('', l));
      return;
    }
    appendTermLine('', `zsh: command not found: ${cmd}`, 'err');
  }

  function appendTermLine(prefixHtml, text, cls = '') {
    const body = $('#terminalBody');
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `${prefixHtml}<span class="${cls}">${escapeHtml(text)}</span>`;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  async function runMockTerminalBuild(config) {
    const lines = [
      ['$ ', `npm run cap:sync -- --ios`],
      ['ok', 'Found 4 web assets in www/'],
      ['ok', 'Copied www → ios/App/App/public'],
      ['ok', 'iOS native project synced (Capacitor 6.1.2)'],
      ['',  ''],
      ['$ ', `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration ${config} -sdk iphoneos archive \\`],
      ['muted', `  -archivePath build/App.xcarchive \\`],
      ['muted', `  -destination 'generic/platform=iOS' \\`],
      ['muted', `  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`],
      ['',  ''],
      ['muted', 'CompileSwiftSources normal arm64'],
      ['muted', 'CompileSwift normal arm64 App.swift'],
      ['muted', 'Ld App.normal/App → linked'],
      ['warn', 'CodeSign (skipped — CODE_SIGNING_ALLOWED=NO)'],
      ['ok', 'Archive Succeeded'],
      ['',  ''],
      ['$ ', `zip -qry iOSStudioExtreme.ipa Payload build-info.txt`],
      ['ok', `IPA packaged: iOSStudioExtreme.ipa (14.2 MB)`],
      ['$ ', `shasum -a 256 iOSStudioExtreme.ipa`],
      ['muted', '8f4e2c1a9b7d6e3f5a8c2b1d4e7f9a3c6b0e2d5f8a1c4b7e0d3f6a9c2b5e8d1  iOSStudioExtreme.ipa'],
      ['',  ''],
      ['ok', `Build complete in ${24 + Math.floor(Math.random() * 12)}s.`],
    ];
    for (const [prefix, text] of lines) {
      if (!text && !prefix) { appendTermLine('', ''); continue; }
      const map = { '$ ': '<span class="prompt">$ </span>', ok: '<span class="ok">✔ </span>', muted: '<span class="muted">  </span>', warn: '<span class="warn">  </span>' };
      appendTermLine(map[prefix] || '', text, prefix === 'muted' || prefix === 'warn' ? prefix : '');
      await sleep(70 + Math.random() * 90);
    }
  }

  function paintTerminalBanner() {
    const body = $('#terminalBody');
    if (!body) return;
    body.innerHTML = '';
    const banner = [
      '╔══════════════════════════════════════════════════════════════════╗',
      '║  iOS Studio Extreme — Cloud Compilation Cockpit                  ║',
      '║  Runner: macos-14 (Apple Silicon M1) · Capacitor 6.1.2          ║',
      '║  Bundle: com.developer.iosstudioextreme · v1.0.0                ║',
      '╚══════════════════════════════════════════════════════════════════╝',
      '',
      'Type "help" for the command list, or "build" to run a mock iOS build.',
      '',
    ];
    banner.forEach(l => appendTermLine('', l, 'muted'));
  }

  // ==================================================================
  // [14] BUILD SIMULATOR (Compile IPA button → step-by-step logs)
  // ==================================================================
  const BUILD_STEPS = [
    { key: 'checkout',   label: 'Checkout repository',     logs: [
      'actions/checkout@v4 → fetch-depth=1',
      `Repository cloned to /Users/runner/work/${state.settings.bundleId.split('.').pop()}`,
      'Resolved 13 files, 134 KB total',
    ]},
    { key: 'node',       label: 'Setup Node.js 20',        logs: [
      'actions/setup-node@v4 → node-version=20',
      'Cache hit: npm dependencies',
      'npm install --no-audit --no-fund → 412 packages in 6.2s',
    ]},
    { key: 'capacitor',  label: 'Capacitor add + sync iOS', logs: [
      'npx cap add ios → ios/App scaffolded',
      'npx cap copy ios → www/* → ios/App/App/public',
      'npx cap sync ios → 4 plugins synced',
    ]},
    { key: 'patch',      label: 'Patch pbxproj + Info.plist', logs: [
      `sed -E "s|PRODUCT_BUNDLE_IDENTIFIER = [^;]*;|... = ${state.settings.bundleId};|g"`,
      `PlistBuddy -c "Set :CFBundleDisplayName ${state.settings.appName}" Info.plist`,
      `PlistBuddy -c "Set :CFBundleIdentifier ${state.settings.bundleId}" Info.plist`,
      `PlistBuddy -c "Set :CFBundleShortVersionString ${state.settings.version}" Info.plist`,
      `PlistBuddy -c "Set :CFBundleVersion ${state.settings.buildNumber}" Info.plist`,
      'Stripped CODE_SIGN_IDENTITY / DEVELOPMENT_TEAM lines',
    ]},
    { key: 'archive',    label: 'xcodebuild archive',     logs: [
      `xcodebuild -scheme App -configuration Release -sdk iphoneos \\`,
      `  -destination 'generic/platform=iOS' -archivePath build/App.xcarchive \\`,
      `  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`,
      'CompileSwiftSources → 14 sources compiled',
      'Ld App.normal/App → linked',
      'Validate (skipped — unsigned)',
      'CodeSign (skipped — unsigned)',
      'Archive Succeeded → build/App.xcarchive',
    ]},
    { key: 'package',    label: 'Assemble unsigned .ipa', logs: [
      'rm -rf build/ipa-staging && mkdir -p Payload',
      'cp -R build/App.xcarchive/Products/Applications/App.app Payload/',
      'rm -rf Payload/App.app/_CodeSignature',
      'zip -qry export/iOSStudioExtreme.ipa .',
      'shasum -a 256 → 8f4e2c1a9b7d6e3f5a8c2b1d4e7f9a3c6b0e2d5f8a1c4b7e0d3f6a9c2b5e8d1',
    ]},
    { key: 'upload',     label: 'Upload artifact',        logs: [
      'actions/upload-artifact@v4',
      'name: compiled-ios-app',
      'path: export/iOSStudioExtreme.ipa (+ .sha256, build log)',
      'retention-days: 30',
      'Artifact uploaded successfully',
    ]},
  ];

  async function dispatchBuild() {
    if (state.build.running) { toast('Build in progress', 'A build is already running.', 'warn'); return; }
    state.build.running = true;
    state.build.cancelled = false;
    $('#compileBtn').disabled = true;
    logToConsole('step', `▶ Dispatching build for ${state.settings.appName} (${state.settings.bundleId})`);
    logToConsole('info', `  Configuration: Release · Target: iOS ${state.settings.target} · Devices: ${state.settings.devices}`);

    const t0 = performance.now();
    for (let i = 0; i < BUILD_STEPS.length; i++) {
      if (state.build.cancelled) {
        logToConsole('err', '✗ Build cancelled by user.');
        break;
      }
      const step = BUILD_STEPS[i];
      logToConsole('step', `▶ [${i + 1}/${BUILD_STEPS.length}] ${step.label}`);
      for (const ln of step.logs) {
        if (state.build.cancelled) break;
        logToConsole('info', `  ${ln}`);
        await sleep(180 + Math.random() * 220);
      }
      if (state.build.cancelled) break;
      logToConsole('ok', `  ✔ ${step.label} — done`);
      await sleep(120);
    }

    const elapsed = performance.now() - t0;
    state.build.running = false;
    $('#compileBtn').disabled = false;
    if (!state.build.cancelled) {
      state.build.runs++;
      saveState();
      logToConsole('ok', `✔ Build succeeded in ${Math.round(elapsed / 1000)}s`);
      logToConsole('info', `  Artifact: compiled-ios-app (iOSStudioExtreme.ipa, 14.2 MB)`);
      logToConsole('info', `  SHA-256: 8f4e2c1a9b7d6e3f5a8c2b1d4e7f9a3c6b0e2d5f8a1c4b7e0d3f6a9c2b5e8d1`);
      toast('Build complete', `Unsigned .ipa ready in ${Math.round(elapsed / 1000)}s.`, 'success');
    } else {
      logToConsole('err', '✗ Build cancelled');
      toast('Build cancelled', 'The dispatch was interrupted.', 'warn');
    }
  }

  // ==================================================================
  // [15] COMMAND PALETTE (⌘K)
  // ==================================================================
  const COMMANDS = [
    { cat: 'File',     label: 'New file',           action: () => promptAndCreate('file') },
    { cat: 'File',     label: 'New folder',         action: () => promptAndCreate('folder') },
    { cat: 'File',     label: 'Save active file',   action: saveActiveTab, shortcut: '⌘S' },
    { cat: 'Edit',     label: 'Run linter',         action: runLinter, shortcut: '⌘L' },
    { cat: 'Edit',     label: 'Format code',        action: formatActiveFile },
    { cat: 'Edit',     label: 'Global search & replace', action: () => openModal('searchModal'), shortcut: '⌘⇧F' },
    { cat: 'View',     label: 'Toggle left drawer', action: () => toggleDrawer('left') },
    { cat: 'View',     label: 'Toggle right drawer',action: () => toggleDrawer('right') },
    { cat: 'View',     label: 'Toggle profiler',    action: toggleProfiler },
    { cat: 'View',     label: 'Clear console',      action: clearConsole },
    { cat: 'Tools',    label: 'Open OTA packager',  action: openPackager },
    { cat: 'Tools',    label: 'Open layout inspector', action: openInspector },
    { cat: 'Tools',    label: 'Configure Gemini API key', action: () => openModal('geminiKeyModal') },
    { cat: 'Tools',    label: 'Clear Gemini history', action: clearGeminiHistory },
    { cat: 'Build',    label: 'Compile IPA (mock)', action: dispatchBuild },
    { cat: 'Terminal', label: 'Run mock build in terminal', action: () => { switchBsTab('terminal'); runTerminalCommand('build release'); } },
  ];

  function promptAndCreate(kind) {
    const name = prompt(`New ${kind} name (e.g. ${kind === 'file' ? 'utils.js' : 'components'}):`, kind === 'file' ? 'new-file.js' : 'new-folder');
    if (!name) return;
    if (kind === 'file') createFile('', name); else createFolder('', name);
  }

  function openCommandPalette() {
    openModal('cmdModal');
    $('#cmdInput').value = '';
    renderCommandList('');
    setTimeout(() => $('#cmdInput').focus(), 60);
  }

  function renderCommandList(q) {
    const list = $('#cmdList');
    const ql = q.toLowerCase();
    const fileHits = Object.keys(state.files).filter(p => p.toLowerCase().includes(ql)).slice(0, 8).map(p => ({
      cat: 'File', label: `Open ${p}`, action: () => openFile(p),
    }));
    const cmdHits = COMMANDS.filter(c => c.label.toLowerCase().includes(ql));
    const hits = [...cmdHits, ...fileHits];
    if (!hits.length) {
      list.innerHTML = '<li style="text-align:center;color:var(--text-3);padding:18px;">No matches.</li>';
      return;
    }
    list.innerHTML = hits.map((h, i) => `<li data-idx="${i}">
      <span>${escapeHtml(h.label)}</span>
      <span class="cmd-cat">${escapeHtml(h.cat)}${h.shortcut ? ' · ' + h.shortcut : ''}</span>
    </li>`).join('');
    $$('#cmdList li').forEach((li, i) => {
      li.addEventListener('click', () => {
        closeModal('cmdModal');
        hits[i].action();
      });
    });
  }

  function clearGeminiHistory() {
    state.geminiHistory = [];
    saveState();
    renderGeminiHistory();
    toast('Cleared', 'Gemini chat history cleared.', 'info');
  }

  function formatActiveFile() {
    if (!state.activeTab) { toast('No file open', 'Open a file first.', 'warn'); return; }
    const ta = $('#editorTextarea');
    let v = ta.value;
    // Naive formatter: trim trailing ws, ensure newline at EOF, collapse 3+ blank lines.
    v = v.split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n');
    if (!v.endsWith('\n')) v += '\n';
    ta.value = v;
    state.files[state.activeTab] = v;
    state.dirty[state.activeTab] = true;
    saveState();
    refreshEditorHighlight();
    runLinter();
    renderTabs();
    renderTree();
    updateStatusbar();
    toast('Formatted', 'Trailing whitespace trimmed, blank lines collapsed.', 'success', 2200);
  }

  // ==================================================================
  // [16] RESIZERS & LAYOUT
  // ==================================================================
  function initResizers() {
    setupHorizontalResizer($('#resizerLeft'), 'left');
    setupHorizontalResizer($('#resizerRight'), 'right');
    setupVerticalResizer($('#bsHandle'));
  }

  function setupHorizontalResizer(el, side) {
    let dragging = false;
    const onDown = (e) => {
      dragging = true;
      el.classList.add('active');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const body = document.body;
      if (side === 'left') {
        const w = Math.max(180, Math.min(480, x));
        document.documentElement.style.setProperty('--left-w', `${w}px`);
      } else {
        const w = Math.max(220, Math.min(540, window.innerWidth - x));
        document.documentElement.style.setProperty('--right-w', `${w}px`);
      }
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('active');
      document.body.style.cursor = '';
    };
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }

  function setupVerticalResizer(el) {
    let dragging = false;
    const onDown = (e) => {
      dragging = true;
      el.classList.add('active');
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const h = Math.max(120, Math.min(window.innerHeight - 240, window.innerHeight - y));
      document.documentElement.style.setProperty('--bottom-h', `${h}px`);
      resizeProfilerCanvas();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('active');
      document.body.style.cursor = '';
    };
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }

  function toggleDrawer(side) {
    if (window.innerWidth <= 880) {
      const el = side === 'left' ? $('#leftDrawer') : $('#rightDrawer');
      el.classList.toggle('mobile-open');
      let bd = $('.drawer-backdrop');
      if (!bd) {
        bd = document.createElement('div');
        bd.className = 'drawer-backdrop';
        bd.addEventListener('click', () => {
          $('#leftDrawer').classList.remove('mobile-open');
          $('#rightDrawer').classList.remove('mobile-open');
          bd.classList.remove('show');
        });
        document.body.appendChild(bd);
      }
      bd.classList.toggle('show', $('#leftDrawer').classList.contains('mobile-open') || $('#rightDrawer').classList.contains('mobile-open'));
    } else {
      const el = side === 'left' ? $('#leftDrawer') : $('#rightDrawer');
      el.style.display = el.style.display === 'none' ? '' : 'none';
      const resizer = side === 'left' ? $('#resizerLeft') : $('#resizerRight');
      resizer.style.display = el.style.display === 'none' ? 'none' : '';
      // Reset grid template to single column when both hidden
      const left = $('#leftDrawer');
      const right = $('#rightDrawer');
      const body = $('.ide-body');
      if (left.style.display === 'none' && right.style.display === 'none') {
        body.style.gridTemplateColumns = '0 0 1fr 0 0';
      } else if (left.style.display === 'none') {
        body.style.gridTemplateColumns = '0 0 1fr 5px var(--right-w)';
      } else if (right.style.display === 'none') {
        body.style.gridTemplateColumns = 'var(--left-w) 5px 1fr 0 0';
      } else {
        body.style.gridTemplateColumns = '';
      }
    }
  }

  // ==================================================================
  // BOTTOM SHEET TABS
  // ==================================================================
  function switchBsTab(tab) {
    $$('.bs-tab').forEach(t => t.classList.toggle('active', t.dataset.bsTab === tab));
    $$('.bs-pane').forEach(p => p.classList.toggle('active', p.dataset.bsPane === tab));
  }

  function toggleBottomSheet() {
    const bs = $('#bottomSheet');
    if (bs.style.height === '36px') {
      bs.style.height = '';
      $('#bsCollapseBtn').textContent = '▾ Collapse';
    } else {
      bs.style.height = '36px';
      $('#bsCollapseBtn').textContent = '▴ Expand';
    }
  }

  // ==================================================================
  // MODAL HELPERS
  // ==================================================================
  function openModal(id) {
    $('#' + id).classList.add('show');
    $('#' + id).setAttribute('aria-hidden', 'false');
  }
  function closeModal(id) {
    $('#' + id).classList.remove('show');
    $('#' + id).setAttribute('aria-hidden', 'true');
  }

  // ==================================================================
  // [17] INIT & WIRE-UP
  // ==================================================================
  function bindEvents() {
    // Top bar
    $('#toggleLeftDrawer').addEventListener('click', () => toggleDrawer('left'));
    $('#toggleRightDrawer').addEventListener('click', () => toggleDrawer('right'));
    $('#cmdPalette').addEventListener('click', openCommandPalette);
    $('#searchBtn').addEventListener('click', () => openModal('searchModal'));
    $('#inspectorBtn').addEventListener('click', openInspector);
    $('#packagerBtn').addEventListener('click', openPackager);
    $('#geminiKeyBtn').addEventListener('click', () => openModal('geminiKeyModal'));
    $('#compileBtn').addEventListener('click', dispatchBuild);
    $('#profilePill').addEventListener('click', openPackager);

    // File manager
    $('#newFileBtn').addEventListener('click', () => {
      const name = prompt('New file name:', 'new-file.js');
      if (name) createFile('', name);
    });
    $('#newFolderBtn').addEventListener('click', () => {
      const name = prompt('New folder name:', 'new-folder');
      if (name) createFolder('', name);
    });
    $('#collapseAllBtn').addEventListener('click', () => {
      const collapse = (nodes) => nodes.forEach(n => { if (n.type === 'folder') { n.expanded = false; if (n.children) collapse(n.children); } });
      collapse(state.tree);
      saveState();
      renderTree();
    });
    $('#fileSearchInput').addEventListener('input', applyFileSearchFilter);

    // Context menu
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('scroll', hideContextMenu, true);
    $$('#ctxMenu .ctx-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.ctx;
        const path = state.ctxTargetPath;
        hideContextMenu();
        if (!path) return;
        if (action === 'open') openFile(path);
        else if (action === 'rename') {
          const node = findNode(path);
          if (!node) return;
          const newName = prompt('Rename to:', node.name);
          if (newName && newName !== node.name) renameNode(path, newName);
        } else if (action === 'duplicate') duplicateNode(path);
        else if (action === 'delete') {
          if (confirm(`Delete ${path}? This cannot be undone.`)) deleteNode(path);
        }
      });
    });

    // Editor
    const ta = $('#editorTextarea');
    ta.addEventListener('input', () => {
      if (!state.activeTab) return;
      state.files[state.activeTab] = ta.value;
      state.dirty[state.activeTab] = true;
      refreshEditorHighlight();
      renderLineNumbers(ta.value.split('\n').length);
      // Debounced lint
      clearTimeout(state._lintTimer);
      state._lintTimer = setTimeout(() => { runLinter(); }, 350);
      updateStatusbar();
      renderTabs();
      renderTree();
    });
    ta.addEventListener('scroll', syncEditorScroll);
    ta.addEventListener('keyup', () => { renderLineNumbers(ta.value.split('\n').length); updateStatusbar(); });
    ta.addEventListener('click', updateStatusbar);
    ta.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveActiveTab(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') { e.preventDefault(); runLinter(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
        state.files[state.activeTab] = ta.value;
        state.dirty[state.activeTab] = true;
        refreshEditorHighlight();
      }
    });
    $('#saveFileBtn').addEventListener('click', saveActiveTab);
    $('#runLinterBtn').addEventListener('click', runLinter);
    $('#formatBtn').addEventListener('click', formatActiveFile);

    // Gemini
    $('#geminiSendBtn').addEventListener('click', () => geminiSend($('#geminiPrompt').value));
    $('#geminiPrompt').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); geminiSend($('#geminiPrompt').value); }
    });
    $('#geminiClearBtn').addEventListener('click', clearGeminiHistory);
    $('#geminiSendContext').addEventListener('change', (e) => {
      state.settings.geminiSendContext = e.target.checked;
      saveState();
    });
    $('#geminiHistory').addEventListener('click', (e) => {
      const btn = e.target.closest('.gm-action-btn');
      if (!btn) return;
      const msg = btn.closest('.gemini-msg');
      const body = msg?.querySelector('.gm-body')?.textContent || '';
      if (btn.dataset.gmAction === 'insert') geminiAction('insert', body);
      else if (btn.dataset.gmAction === 'replace') geminiAction('replace', body);
      else if (btn.dataset.gmAction === 'copy') geminiAction('copy', body);
    });

    // Gemini key modal
    $('#geminiKeySaveBtn').addEventListener('click', () => {
      state.settings.geminiKey = $('#geminiKeyInput').value.trim();
      state.settings.geminiModel = $('#geminiModelSelect').value;
      state.settings.geminiSystem = $('#geminiSystemInput').value;
      saveState();
      applySettingsToTopbar();
      closeModal('geminiKeyModal');
      toast('Saved', 'Gemini API configuration saved.', 'success');
    });
    $('#geminiKeyTestBtn').addEventListener('click', geminiTestConnection);
    $('#geminiKeyClearBtn').addEventListener('click', () => {
      $('#geminiKeyInput').value = '';
      state.settings.geminiKey = '';
      saveState();
      setKeyStatus('API key cleared.', 'info');
    });

    // Packager
    ['#pkgAppName', '#pkgBundleId', '#pkgVersion', '#pkgBuild', '#pkgTarget', '#pkgDevices'].forEach(sel => {
      $(sel).addEventListener('input', updatePkgPreview);
    });
    $('#pkgSaveBtn').addEventListener('click', savePackager);
    $('#pkgResetBtn').addEventListener('click', resetPackager);
    $('#pkgExportBtn').addEventListener('click', exportCapacitorConfig);

    // Search modal
    $('#gsRunBtn').addEventListener('click', runGlobalSearch);
    $('#gsReplaceAllBtn').addEventListener('click', globalReplaceAll);
    $('#gsFind').addEventListener('keydown', (e) => { if (e.key === 'Enter') runGlobalSearch(); });

    // Modal close buttons
    $$('.modal-close, .modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          const id = el.dataset.close || el.id;
          if (id) closeModal(id);
        }
      });
    });
    // Prevent modal body clicks from closing
    $$('.modal').forEach(m => m.addEventListener('click', e => e.stopPropagation()));

    // Bottom sheet
    $$('.bs-tab').forEach(t => t.addEventListener('click', () => switchBsTab(t.dataset.bsTab)));
    $('#bsClearBtn').addEventListener('click', clearConsole);
    $('#bsToggleProfiler').addEventListener('click', toggleProfiler);
    $('#bsCollapseBtn').addEventListener('click', toggleBottomSheet);

    // Terminal
    $('#termInput').addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const v = e.target.value;
        e.target.value = '';
        await runTerminalCommand(v);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state.terminalCursor > 0) {
          state.terminalCursor--;
          e.target.value = state.terminalHistory[state.terminalCursor] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (state.terminalCursor < state.terminalHistory.length - 1) {
          state.terminalCursor++;
          e.target.value = state.terminalHistory[state.terminalCursor] || '';
        } else {
          state.terminalCursor = state.terminalHistory.length;
          e.target.value = '';
        }
      }
    });

    // Command palette
    $('#cmdInput').addEventListener('input', (e) => renderCommandList(e.target.value));
    $('#cmdInput').addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal('cmdModal');
      if (e.key === 'Enter') {
        const first = $('#cmdList li[data-idx="0"]');
        if (first) first.click();
      }
    });

    // Global hotkeys
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCommandPalette(); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); openModal('searchModal'); }
      if (e.key === 'Escape') {
        $$('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        hideContextMenu();
      }
    });
  }

  function applySettingsToDom() {
    document.documentElement.dataset.accent = state.settings.accent;
    document.documentElement.dataset.density = state.settings.density;
    document.documentElement.dataset.anim = state.settings.animations;
    $('#geminiSendContext').checked = state.settings.geminiSendContext;
  }

  function loadGeminiKeyForm() {
    $('#geminiKeyInput').value = state.settings.geminiKey || '';
    $('#geminiModelSelect').value = state.settings.geminiModel;
    $('#geminiSystemInput').value = state.settings.geminiSystem;
  }

  function init() {
    loadState();
    applySettingsToDom();
    applySettingsToTopbar();
    loadGeminiKeyForm();
    renderTree();
    renderTabs();
    loadActiveTabIntoEditor();
    renderGeminiHistory();
    renderProblemsList();
    paintTerminalBanner();
    initProfiler();
    initResizers();
    bindEvents();

    // Auto-open index.html on first load for a nice first impression.
    if (!state.openTabs.length) openFile('www/index.html');

    logToConsole('ok', 'iOS Studio Extreme booted.');
    logToConsole('info', `Bundle: ${state.settings.bundleId} · Version: ${state.settings.version}`);
    logToConsole('info', `Open files: ${state.openTabs.length} · Gemini model: ${state.settings.geminiModel}`);
    toast('Welcome', 'iOS Studio Extreme ready. Press ⌘K for commands.', 'info', 4000);
    console.log('%c iOS Studio Extreme ', 'background:#6366f1;color:white;padding:2px 8px;border-radius:4px;font-weight:bold;', 'booted.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
