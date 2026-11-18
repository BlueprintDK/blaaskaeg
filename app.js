/* Blå skæg – kerne: lobby, netværk og spilmotor.
 *
 * Telefonerne forbindes direkte med PeerJS (WebRTC). Den, der opretter rummet, er vært:
 * værtens telefon kører alle spillene (regler, tur, hemmeligheder, realtidsfysik) og sender
 * hver spiller sin egen visning. De andre sender kun deres handlinger.
 *
 * Et spil registreres med BS.registrer({ id, navn, e, d, min, max,
 *   start(H, opt) -> G            (vært: ny spiltilstand)
 *   kald(H, G, enhed, d)          (vært: en spillers handling)
 *   tick(H, G) -> bool, tickMs    (vært, realtid: et skridt; true = send ud)
 *   view(H, G, enhed) -> v        (vært: hvad netop denne spiller må se)
 *   felles: true                  (view er ens for alle – regnes kun én gang)
 *   tegn(el, v, api)              (alle: tegn visningen i el) })
 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = localStorage.getItem('bs_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem('bs_' + k) : localStorage.setItem('bs_' + k, JSON.stringify(v)); } catch (e) {} };
  const rnd = n => Math.floor(Math.random() * n);
  const bland = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  let toastT;
  function toast(t, ms) { const el = document.getElementById('toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), ms || 2400); }
  const FARVER = ['#4cc9f0', '#ff5d8f', '#ffd166', '#06d6a0'];
  const MAX = 4;

  let enhed = lsGet('enhed', '');
  if (!enhed) { enhed = 'e' + Math.random().toString(36).slice(2, 10); lsSet('enhed', enhed); }

  /* ---------------- lyd (telefonvenlig: mellemtone + støj gennem kompressor) ---------------- */
  let AC = null, MG = null, NB = null;
  function ac() {
    try {
      if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C();
        const k = AC.createDynamicsCompressor(); k.threshold.value = -20; k.ratio.value = 10; k.attack.value = .002; k.release.value = .25;
        MG = AC.createGain(); MG.gain.value = 1.6; MG.connect(k); k.connect(AC.destination); }
      if (AC.state === 'suspended') AC.resume(); return AC;
    } catch (e) { return null; }
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, ac, { passive: true }));
  function tone(f, d, type, vol, slide, delay) { const a = ac(); if (!a) return; try {
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    o.connect(g); g.connect(MG); o.start(t); o.stop(t + d + .05); } catch (e) {} }
  function noise(d, vol, ft, f0, f1, delay) { const a = ac(); if (!a) return; try {
    if (!NB) { const n = a.sampleRate * 1.6 | 0; NB = a.createBuffer(1, n, a.sampleRate); const x = NB.getChannelData(0); for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1; }
    const t = a.currentTime + (delay || 0), s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = NB; fl.type = ft; fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + d);
    s.connect(fl); fl.connect(g); g.connect(MG); s.start(t); s.stop(t + d + .05); } catch (e) {} }
  const lyd = {
    plask() { noise(.45, .45, 'bandpass', 2200, 400); tone(760, .2, 'sine', .18, 260); },
    ram() { noise(.06, 1, 'highpass', 2500); noise(.7, 1, 'lowpass', 4000, 250); tone(1200, .12, 'square', .22, 350); tone(260, .4, 'square', .4, 80); vib([90, 40, 120]); },
    sænket() { lyd.ram(); noise(1.4, 1, 'lowpass', 2500, 90, .22); tone(520, .9, 'sawtooth', .3, 60, .22); vib([90, 40, 120, 80, 300]); },
    klik() { tone(900, .05, 'square', .12); },
    ok() { tone(660, .12, 'sine', .25); tone(990, .18, 'sine', .25, null, .1); },
    fejl() { tone(220, .25, 'square', .22, 140); },
    vind() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .22, 'triangle', .28, null, i * .12)); },
    død() { noise(.5, .9, 'lowpass', 3000, 200); tone(300, .5, 'sawtooth', .3, 60); vib(120); },
  };

  /* ---------------- vært: rum og spilmotor ---------------- */
  let R = null, ticker = null;
  const find = e => R.spillere.find(p => p.enhed === e);
  const H = {
    spillere: () => R.spillere.filter(p => p.online),
    alle: () => R.spillere,
    find: e => find(e),
    navn: e => { const p = find(e); return p ? p.navn : '?'; },
    giv: (e, n) => { const p = find(e); if (p) p.point += n; },
    udsend: () => udsend(),
  };
  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }
  function startSpil(id, opt) {
    const def = BS.spil[id]; if (!def) return;
    const n = H.spillere().length;
    if (n < (def.min || 1)) return 'Spillet kræver mindst ' + def.min + ' spillere';
    stopTicker();
    R.fase = 'spil'; R.nr = (R.nr || 0) + 1;
    R.spil = { id, opt: opt || {}, G: def.start(H, opt || {}) };
    if (def.tick) ticker = setInterval(() => { try { if (R && R.spil && R.spil.id === id && def.tick(H, R.spil.G)) udsend(); } catch (e) { console.warn(e); } }, def.tickMs || 100);
  }
  function serverKald(e, c) {
    if (!R || !c) return;
    const p = find(e), erV = e === R.vaert;
    switch (c.h) {
      case 'deltag': {
        const navn = String(c.navn || '').trim().slice(0, 14) || 'Spiller';
        if (p) { p.online = true; return; }
        const gammel = R.spillere.find(x => !x.online && x.navn.toLowerCase() === navn.toLowerCase());
        if (gammel) { const old = gammel.enhed; gammel.enhed = e; gammel.online = true; const def = R.spil && BS.spil[R.spil.id]; if (def && def.skiftEnhed) def.skiftEnhed(H, R.spil.G, old, e); return; }
        if (R.spillere.filter(x => x.online).length >= MAX) return 'fuld';
        R.spillere = R.spillere.filter(x => x.online);   // gamle frakoblede pladser gives videre
        const brugt = new Set(R.spillere.map(x => x.farve));
        const brugte = new Set(R.spillere.map(x => x.navn)); let u = navn, k = 2; while (brugte.has(u)) u = navn + ' ' + (k++);
        R.spillere.push({ enhed: e, navn: u, farve: FARVER.find(f => !brugt.has(f)) || FARVER[0], point: 0, online: true });
        return;
      }
      case 'forlad': {
        R.spillere = R.spillere.filter(x => x.enhed !== e);
        const def = R.spil && BS.spil[R.spil.id]; if (def && def.forlad) def.forlad(H, R.spil.G, e);
        return;
      }
      case 'start': if (erV) return startSpil(c.id, c.opt); return;
      case 'lobby':
      /* 18/11-2026 (Michael): alle spillere kan stoppe det igangværende spil og gå tilbage til lobbyen */
      case 'stop': if (p && R.spil) { stopTicker(); R.fase = 'lobby'; R.spil = null; if (c.h === 'stop') R.stop = { af: p.navn, n: (R.stop ? R.stop.n : 0) + 1 }; } return;
      case 'nulstil': if (erV) R.spillere.forEach(x => { x.point = 0; }); return;
      case 'spil': { if (!p || !R.spil) return; const def = BS.spil[R.spil.id]; if (def && def.kald) def.kald(H, R.spil.G, e, c.d || {}); return; }
    }
  }
  function grund(e) {
    return { kode: R.kode, vaert: R.vaert, mig: e, fase: R.fase, nr: R.nr || 0, stop: R.stop || null,
      spillere: R.spillere.map(p => ({ enhed: p.enhed, navn: p.navn, farve: p.farve, point: p.point, online: p.online })) };
  }
  function visningFor(e, fælles) {
    const v = grund(e);
    if (R.spil) {
      const def = BS.spil[R.spil.id];
      v.spil = { id: R.spil.id, opt: R.spil.opt, v: fælles !== undefined ? fælles : def.view(H, R.spil.G, e) };
    }
    return v;
  }
  function udsend() {
    if (!R) return;
    const def = R.spil && BS.spil[R.spil.id];
    const fælles = def && def.felles ? def.view(H, R.spil.G, null) : undefined;
    conns.forEach(cn => { if (cn.open && cn.enhed) { try { cn.send({ t: 'v', v: visningFor(cn.enhed, fælles) }); } catch (e) {} } });
    vis(visningFor(enhed, fælles));
  }

  /* ---------------- netværk ---------------- */
  const PFX = 'blaaskaeg-v1-';
  let peer = null, conns = [], tilVaert = null, visning = null;
  function lukNet() {
    stopTicker();
    conns.forEach(cn => { try { cn.close(); } catch (e) {} }); conns = [];
    try { tilVaert && tilVaert.close(); } catch (e) {} tilVaert = null;
    try { peer && peer.destroy(); } catch (e) {} peer = null;
    R = null;
  }
  const ingenNet = () => new Error('Netværksdelen kunne ikke hentes – tjek internettet');
  function opretRum(navn) {
    return new Promise((res, rej) => {
      if (typeof Peer === 'undefined') return rej(ingenNet());
      lukNet();
      const kode = String(1000 + rnd(9000));
      const p = new Peer(PFX + kode); peer = p; let klar = false;
      p.on('open', () => {
        klar = true;
        R = { kode, vaert: enhed, fase: 'lobby', spillere: [], spil: null, nr: 0 };
        serverKald(enhed, { h: 'deltag', navn });
        lsSet('rum', null); udsend(); res();
      });
      p.on('connection', cn => {
        cn.on('data', m => {
          if (!m || m.t !== 'k' || !R) return;
          if (!cn.enhed) {
            const e = String(m.e || '').slice(0, 24) || ('x' + rnd(1e6));
            const svar = serverKald(e, m.c);
            if (svar === 'fuld') { try { cn.send({ t: 'fuld' }); } catch (x) {} setTimeout(() => { try { cn.close(); } catch (x) {} }, 300); return; }
            cn.enhed = e;
            conns.filter(x => x !== cn && x.enhed === e).forEach(x => { try { x.close(); } catch (y) {} });
            conns = conns.filter(x => x.enhed !== e); conns.push(cn);
            udsend(); return;
          }
          const svar = serverKald(cn.enhed, m.c);
          if (typeof svar === 'string' && svar !== 'fuld') { try { cn.send({ t: 'besked', b: svar }); } catch (x) {} }
          if (!(R.spil && BS.spil[R.spil.id] && BS.spil[R.spil.id].realtid && m.c && m.c.h === 'spil')) udsend();
        });
        cn.on('close', () => {
          conns = conns.filter(x => x !== cn);
          if (R && cn.enhed && !conns.some(x => x.enhed === cn.enhed)) {
            const sp = find(cn.enhed); if (sp) sp.online = false;
            const def = R.spil && BS.spil[R.spil.id]; if (def && def.frakoblet) def.frakoblet(H, R.spil.G, cn.enhed);
            udsend();
          }
        });
      });
      p.on('error', e => { if (!klar) { lukNet(); rej(new Error(e.type === 'unavailable-id' ? 'Prøv igen – koden var optaget' : 'Netværksfejl (' + e.type + ')')); } });
      p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} });
    });
  }
  function deltagRum(kode, navn) {
    return new Promise((res, rej) => {
      if (typeof Peer === 'undefined') return rej(ingenNet());
      lukNet();
      const p = new Peer(); peer = p; let ok = false;
      const fejl = t => { if (!ok) { ok = true; lukNet(); rej(new Error(t)); } };
      p.on('open', () => {
        const cn = p.connect(PFX + kode, { reliable: true }); tilVaert = cn;
        cn.on('open', () => { cn.send({ t: 'k', e: enhed, c: { h: 'deltag', navn } }); });
        cn.on('data', m => {
          if (!m) return;
          if (m.t === 'v') { if (!ok) { ok = true; lsSet('rum', kode); res(); } vis(m.v); }
          else if (m.t === 'fuld') fejl('Rummet er fuldt – der kan højst være ' + MAX + ' spillere');
          else if (m.t === 'besked') toast(m.b);
        });
        cn.on('close', () => {
          if (tilVaert !== cn) return;
          tilVaert = null; if (ok) { lsSet('rum', null); vis(null); toast('Forbindelsen til rummet er lukket'); }
        });
      });
      p.on('error', e => fejl(e.type === 'peer-unavailable' ? 'Fandt ikke rummet – tjek koden' : 'Netværksfejl (' + e.type + ')'));
      setTimeout(() => fejl('Kunne ikke forbinde – prøv igen'), 15000);
    });
  }
  function kald(c) {
    if (R) { const s = serverKald(enhed, c); if (typeof s === 'string') toast(s); if (!(c.h === 'spil' && R.spil && BS.spil[R.spil.id].realtid)) udsend(); return; }
    if (tilVaert && tilVaert.open) { try { tilVaert.send({ t: 'k', e: enhed, c }); } catch (e) { toast('Kunne ikke sende'); } }
  }
  function forlad() {
    if (R) lukNet(); else { kald({ h: 'forlad' }); setTimeout(lukNet, 300); }
    lsSet('rum', null); vis(null);
  }

  /* ---------------- skærme ---------------- */
  const app = () => document.getElementById('app');
  let skærm = '', spilNøgle = '';
  const erVært = v => v && v.vaert === v.mig;
  const navnPå = (v, e) => { const p = v.spillere.find(x => x.enhed === e); return p ? p.navn : '?'; };
  const farvePå = (v, e) => { const p = v.spillere.find(x => x.enhed === e); return p ? p.farve : '#888'; };

  let sidsteStop = null;
  function vis(v) {
    visning = v;
    if (!v) { skærm = ''; return tegnStart(); }
    if (v.stop && sidsteStop !== null && v.stop.n !== sidsteStop) toast('⏹ ' + v.stop.af + ' stoppede spillet');
    sidsteStop = v.stop ? v.stop.n : 0;
    if (v.fase !== 'spil' || !v.spil) { skærm = 'lobby'; return tegnLobby(v); }
    tegnSpilSkærm(v);
  }

  function tegnStart() {
    const navn = lsGet('navn', '');
    app().innerHTML = '<div class="sprogvalg"><button data-sprog="da" class="' + (BS.sprog === 'da' ? 'on' : '') + '">🇩🇰 Dansk</button><button data-sprog="en" class="' + (BS.sprog === 'en' ? 'on' : '') + '">🇬🇧 English</button></div>'
      + '<h1>🧔🏻 Blå skæg</h1><p class="sub">Spil sammen – hver på sin telefon. 2–4 spillere.</p>'
      + '<div class="card"><label for="navn">Dit navn</label><input class="in" id="navn" maxlength="14" autocomplete="off" value="' + esc(navn) + '">'
      + '<div style="height:14px"></div><button class="btn big ok" id="opret">➕ Opret nyt rum</button></div>'
      + '<div class="card"><label for="kode">Deltag med kode</label><div class="row"><input class="in" id="kode" inputmode="numeric" maxlength="4" placeholder="1234" style="text-align:center;letter-spacing:.25em;font-size:22px">'
      + '<button class="btn" id="deltag" style="flex:0 0 36%">Deltag</button></div></div>'
      + '<p class="hint center" id="msg" style="min-height:1.4em;color:var(--gold)"></p>'
      + '<div class="card"><p class="hint" style="margin:0 0 8px">Spil i Blå skæg:</p><div class="chips">'
      + BS.rækkefølge.map(id => '<span class="chip">' + BS.spil[id].e + ' ' + esc(BS.spil[id].navn) + '</span>').join('') + '</div></div>'
      + bundLinks();
    const $ = id => document.getElementById(id);
    app().querySelectorAll('[data-sprog]').forEach(b => { b.onclick = () => { BS.sætSprog(b.dataset.sprog); tegnStart(); }; });
    bindBundLinks(app());
    const hent = () => { const n = $('navn').value.trim(); if (!n) { $('msg').textContent = 'Skriv dit navn først.'; $('navn').focus(); return null; } lsSet('navn', n); return n; };
    const travl = (b, t) => { $('opret').disabled = $('deltag').disabled = !!t; if (t) b.textContent = t; };
    $('opret').onclick = () => { const n = hent(); if (!n) return; travl($('opret'), 'Opretter…'); opretRum(n).catch(e => { tegnStart(); toast(e.message); }); };
    const deltag = () => {
      const n = hent(); if (!n) return; const k = $('kode').value.trim();
      if (!/^\d{4}$/.test(k)) { $('msg').textContent = 'Skriv den 4-cifrede kode fra værten.'; return; }
      travl($('deltag'), '…'); deltagRum(k, n).catch(e => { tegnStart(); toast(e.message); });
    };
    $('deltag').onclick = deltag; $('kode').onkeydown = e => { if (e.key === 'Enter') deltag(); };
  }

  function topHTML(v, titel) {
    return '<div class="top"><div class="tt">' + titel + '</div><span class="hint" style="font-weight:800">Rum ' + esc(v.kode) + '</span>'
      + (v.fase === 'spil' ? '<button class="btn gh" id="stop" title="Stop spillet">⏹ Stop</button>' : '')
      + '<button class="btn gh" id="forlad">' + (erVært(v) ? 'Luk' : 'Forlad') + '</button></div>';
  }
  function chipsHTML(v, point) {
    return '<div class="chips">' + v.spillere.map(p => '<span class="chip' + (p.enhed === v.mig ? ' mig' : '') + (p.online ? '' : ' off') + '"><i style="background:' + p.farve + '"></i>'
      + (p.enhed === v.vaert ? '👑 ' : '') + esc(p.navn) + (point ? ' · ' + p.point : '') + '</span>').join('') + '</div>';
  }
  function bindTop(root, v) {
    const f = root.querySelector('#forlad');
    if (f) f.onclick = () => { if (confirm(T(erVært(v) ? 'Luk rummet for alle?' : 'Forlad rummet?'))) forlad(); };
    const s = root.querySelector('#stop');
    if (s) s.onclick = () => { if (confirm(T('Stop spillet for alle og gå tilbage til lobbyen?'))) kald({ h: 'stop' }); };
    root.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => kald({ h: b.dataset.c }); });
  }

  function tegnLobby(v) {
    spilNøgle = '';
    const vært = erVært(v), n = v.spillere.filter(p => p.online).length;
    let h = topHTML(v, '🧔🏻 Lobby');
    if (vært) h += '<p class="hint center" style="margin:2px 0 6px">Del koden – de andre åbner Blå skæg og skriver den:</p><div class="kode">' + esc(v.kode) + '</div>';
    h += '<h3>Spillere (' + n + '/' + MAX + ')</h3>' + chipsHTML(v, true);
    h += '<h3>' + (vært ? 'Vælg et spil' : '⏳ Venter på, at ' + esc(navnPå(v, v.vaert)) + ' vælger et spil…') + '</h3><div class="spilgrid">';
    BS.rækkefølge.forEach(id => {
      const s = BS.spil[id], kan = vært && n >= (s.min || 1);
      const gemt = lsGet('valg_' + id, null);
      h += '<div class="sk" role="button" tabindex="0" data-start="' + id + '"' + (kan ? '' : ' disabled') + '><span class="e">' + s.e + '</span><b>' + esc(s.navn) + '</b><small>' + esc(s.d)
        + (n < (s.min || 1) ? ' (mindst ' + s.min + ' spillere)' : '') + '</small>'
        + (s.valg && vært ? '<select data-valg="' + id + '" style="margin-top:8px;width:100%;padding:8px;border-radius:10px;background:#0b1630;color:#fff;border:1px solid #2a4180;font:inherit">'
          + s.valg.liste.map(([k, t]) => '<option value="' + k + '"' + (gemt === k ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>' : '')
        + '</div>';
    });
    h += '</div>' + (vært ? '<div class="hostbar"><button class="btn gh" data-c="nulstil">↺ Nulstil point</button></div>' : '') + bundLinks();
    app().innerHTML = h;
    bindTop(app(), v); bindBundLinks(app());
    app().querySelectorAll('[data-valg]').forEach(s => { s.onclick = e => e.stopPropagation(); s.onchange = () => lsSet('valg_' + s.dataset.valg, s.value); });
    app().querySelectorAll('[data-start]').forEach(b => {
      b.onclick = () => {
        if (b.hasAttribute('disabled')) return;
        const id = b.dataset.start, s = BS.spil[id], sel = b.querySelector('select'), opt = {};
        if (s.valg && sel) opt[s.valg.navn] = sel.value;
        kald({ h: 'start', id, opt });
      };
    });
  }

  function tegnSpilSkærm(v) {
    const def = BS.spil[v.spil.id];
    const nøgle = v.spil.id + ':' + v.nr;
    if (skærm !== 'spil' || spilNøgle !== nøgle) {
      skærm = 'spil'; spilNøgle = nøgle;
      app().innerHTML = '<div id="topp"></div><div id="spil"></div><div id="bund"></div>';
    }
    const top = document.getElementById('topp');
    const tsig = JSON.stringify([v.kode, v.vaert, v.mig]);
    if (top.dataset.s !== tsig) { top.dataset.s = tsig; top.innerHTML = topHTML(v, def.e + ' ' + esc(def.navn)); bindTop(top, v); }
    const api = {
      kald: d => kald({ h: 'spil', d }), mig: v.mig, vært: erVært(v), spillere: v.spillere,
      navn: e => navnPå(v, e), farve: e => farvePå(v, e), esc, lyd, vib, toast,
    };
    try { def.tegn(document.getElementById('spil'), v.spil.v, api); } catch (e) { console.warn('tegn', e); }
    const bund = document.getElementById('bund');
    const slut = v.spil.v && v.spil.v.slut;
    const bsig = JSON.stringify([v.spillere.map(p => [p.navn, p.point, p.online]), !!slut, erVært(v)]);
    if (bund.dataset.s !== bsig) {
      bund.dataset.s = bsig;
      bund.innerHTML = (slut && erVært(v) ? '<div class="hostbar"><button class="btn ok" id="igen">🔁 Spil igen</button><button class="btn sec" data-c="lobby">🏠 Lobby</button></div>' : '')
        + (slut && !erVært(v) ? '<p class="hint center">' + esc(navnPå(v, v.vaert)) + ' vælger, hvad der skal ske nu.</p>' : '')
        + '<div class="stilling">' + v.spillere.slice().sort((a, b) => b.point - a.point).map(p => '<span class="chip' + (p.enhed === v.mig ? ' mig' : '') + '"><i style="background:' + p.farve + '"></i>' + esc(p.navn) + ' ' + p.point + '</span>').join('') + '</div>';
      bindTop(bund, v);
      const ig = bund.querySelector('#igen'); if (ig) ig.onclick = () => kald({ h: 'start', id: v.spil.id, opt: v.spil.opt });
    }
  }

  /* links nederst på start- og lobbyskærmen: feedback (og senere støt) */
  /* 18/11-2026 (Michael): STØT_URL sættes til donationslinket (fx Ko-fi), når kontoen er oprettet – tom = knappen skjules */
  const STØT_URL = 'https://ko-fi.com/blaaskaeg';
  function bundLinks() { return '<div class="bundlinks"><button class="btn gh" id="feedbackknap">💬 Giv feedback</button>'
    + (STØT_URL ? '<a class="btn gh" href="' + esc(STØT_URL) + '" target="_blank" rel="noopener">☕ Støt Blå skæg</a>' : '') + '</div>'; }
  function bindBundLinks(root) { const f = root.querySelector('#feedbackknap'); if (f) f.onclick = () => BS.feedback && BS.feedback(); }

  /* sprog: dansk er grundsproget i koden; sprog.js oversætter til engelsk */
  function T(s) { return BS.t ? BS.t(s) : s; }

  /* Tur-ur: viser de sekunder, der er tilbage af en tur. Værten sender «rest» (ms); hver telefon
     regner sin egen sluttid ud fra modtagelsen, så urene ikke skal være stillet ens. */
  let urInt = null, urSlut = 0, urEl = null, urTotal = 30000;
  function turUr(el, rest, total) {
    urEl = el; urSlut = Date.now() + Math.max(0, rest || 0); urTotal = total || 30000;
    const opd = () => {
      if (!urEl || !urEl.isConnected) { clearInterval(urInt); urInt = null; return; }
      const ms = Math.max(0, urSlut - Date.now()), s = Math.ceil(ms / 1000);
      urEl.innerHTML = '<div class="turur' + (s <= 10 ? ' lav' : '') + '"><i style="width:' + (ms / urTotal * 100).toFixed(1) + '%"></i><span>⏱ ' + s + ' sek</span></div>';
    };
    opd(); if (!urInt) urInt = setInterval(opd, 250);
  }
  const urCss = document.createElement('style');
  urCss.textContent = '.turur{position:relative;height:24px;border-radius:12px;background:var(--panel);overflow:hidden;margin:0 0 10px}'
    + '.turur i{position:absolute;left:0;top:0;bottom:0;background:var(--blue);transition:width .25s linear}.turur.lav i{background:var(--bad)}'
    + '.turur span{position:relative;display:block;text-align:center;font-weight:800;font-size:13px;line-height:24px}';
  document.head.appendChild(urCss);

  const BS = window.BS = {
    turUr,
    spil: {}, rækkefølge: [],
    registrer(def) { this.spil[def.id] = def; this.rækkefølge.push(def.id); },
    esc, rnd, bland, lyd, vib, toast, FARVER,
    start() {
      const kode = lsGet('rum', null), navn = lsGet('navn', '');
      tegnStart();
      if (kode && navn) deltagRum(kode, navn).catch(() => { lsSet('rum', null); tegnStart(); });
    },
    get visning() { return visning; },
  };
})();
