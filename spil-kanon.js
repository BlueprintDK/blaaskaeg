/* Blå skæg – Kanondyst (vores eget artilleri-spil) for 2-4 spillere.
 * På sin tur sigter man (vinkel + kraft) og skyder. Vinden skifter hver tur. Granaterne sprænger kratere i terrænet,
 * og kanoner falder ned, hvis jorden under dem forsvinder. Sidste kanon med liv vinder (+5). Et nedskud giver +2.
 * Våben: Granat (ubegrænset), Storbombe (2 stk.), Trippelskud (2 stk.). 45 sek. pr. tur – ellers springes man over. */
(function () {
  const { esc, rnd } = BS;
  const VW = 1000, VH = 620, KOL = 4, NK = VW / KOL, TYNGDE = 260, FART = 7.6, DT = .016, FRIST = 45000;
  const VÅBEN = { std: { navn: 'Granat', r: 34, dmg: 42 }, stor: { navn: 'Storbombe', r: 64, dmg: 58, antal: 2 }, tre: { navn: 'Trippelskud', r: 26, dmg: 26, antal: 2 } };
  const jordVed = (J, x) => { const i = Math.max(0, Math.min(NK - 1, Math.round(x / KOL))); return J[i]; };
  function nytTerræn() {
    const p = [Math.random() * 6, Math.random() * 6, Math.random() * 6, Math.random() * 6], J = [];
    for (let i = 0; i < NK; i++) { const x = i * KOL; J.push(Math.max(190, Math.min(570, 410 + 85 * Math.sin(x * .0055 + p[0]) + 45 * Math.sin(x * .016 + p[1]) + 18 * Math.sin(x * .045 + p[2]) + 6 * Math.sin(x * .13 + p[3])))); }
    return J;
  }
  function sænk(G, t) { const ny = jordVed(G.jord, t.x); if (ny > t.y + 1) { const fald = ny - t.y; t.y = ny; if (fald > 24) { const s = Math.round((fald - 24) / 4); t.hp -= s; return s; } } else t.y = ny; return 0; }
  function næste(G) { const n = G.tanks.length; for (let k = 1; k <= n; k++) { const j = (G.tur + k) % n; if (G.tanks[j].hp > 0 && !G.tanks[j].ude) return j; } return G.tur; }

  function skyd(H, G, t) {
    const w = VÅBEN[t.våbenValg] || VÅBEN.std;
    const vinkler = t.våbenValg === 'tre' ? [t.vinkel - 6, t.vinkel, t.vinkel + 6] : [t.vinkel];
    const baner = [], eks = [];
    vinkler.forEach(vg => {
      const a = vg * Math.PI / 180, v = t.kraft * FART;
      let x = t.x + Math.cos(a) * 38, y = t.y - 24 - Math.sin(a) * 38, vx = Math.cos(a) * v, vy = -Math.sin(a) * v;
      const pts = [[Math.round(x), Math.round(y)]]; let ramt = null;
      for (let s = 0; s < 3000; s++) {
        vx += G.vind * DT; vy += TYNGDE * DT; x += vx * DT; y += vy * DT;
        if (s % 2 === 0) pts.push([Math.round(x), Math.round(y)]);
        if (x < -40 || x > VW + 40 || y > VH + 40) break;
        if (x >= 0 && x <= VW && y >= jordVed(G.jord, x)) { ramt = [x, jordVed(G.jord, x)]; break; }
        const tank = G.tanks.find(o => o.hp > 0 && Math.hypot(o.x - x, o.y - 14 - y) < 24 && (o !== t || s > 25));
        if (tank) { ramt = [x, y]; break; }
      }
      pts.push([Math.round(x), Math.round(y)]);
      baner.push(pts); eks.push(ramt ? { x: Math.round(ramt[0]), y: Math.round(ramt[1]), r: w.r } : null);   // én plads pr. granat
    });
    /* sprængninger: kratere + skade */
    const skade = {};
    eks.forEach(e => {
      if (!e) return;
      for (let i = 0; i < NK; i++) { const dx = i * KOL - e.x; if (Math.abs(dx) < e.r) { const bund = e.y + Math.sqrt(e.r * e.r - dx * dx); if (bund > G.jord[i]) G.jord[i] = Math.min(VH - 4, bund); } }
      G.tanks.forEach(o => { if (o.hp <= 0) return; const d = Math.hypot(o.x - e.x, o.y - 10 - e.y); if (d < e.r + 14) { const s = Math.round(w.dmg * (1 - d / (e.r + 14)) + 4); o.hp -= s; skade[o.e] = (skade[o.e] || 0) + s; } });
    });
    G.tanks.forEach(o => { if (o.hp > 0) { const s = sænk(G, o); if (s) skade[o.e] = (skade[o.e] || 0) + s; } });
    const døde = [];
    G.tanks.forEach(o => { if (o.hp <= 0 && !o.død) { o.hp = 0; o.død = true; døde.push(o.e); if (o.e !== t.e) H.giv(t.e, 2); } });
    if (t.våbenValg !== 'std') { t.våben[t.våbenValg]--; if (t.våben[t.våbenValg] <= 0) t.våbenValg = 'std'; }
    const varighed = Math.max(...baner.map(b => b.length)) * DT * 2;
    G.skud = { n: (G.skud ? G.skud.n : 0) + 1, af: t.e, baner, eks, skade, døde, varighed };
    G.lås = Date.now() + varighed * 1000 + 1700;
  }

  BS.registrer({
    id: 'kanon', navn: 'Kanondyst', e: '💣', min: 2, max: 4, tickMs: 250,
    d: 'Sigt med vinkel og kraft, regn med vinden og spræng de andre kanoner.',
    start(H) {
      const ps = H.spillere(), J = nytTerræn(), n = ps.length;
      const tanks = ps.map((p, i) => { const x = Math.round((i + .5) * VW / n + (Math.random() - .5) * 60); return { e: p.enhed, x, y: jordVed(J, x), hp: 100, vinkel: x < VW / 2 ? 50 : 130, kraft: 55, våben: { stor: 2, tre: 2 }, våbenValg: 'std' }; });
      tanks.forEach(t => { const i = Math.round(t.x / KOL); for (let k = -5; k <= 5; k++) if (J[i + k] != null) J[i + k] = t.y; });   // en lille flad plads til hver kanon
      return { jord: J, tanks, tur: rnd(n), vind: Math.round((Math.random() - .5) * 80), skud: null, lås: 0, frist: Date.now() + FRIST, slut: null };
    },
    tick(H, G) {
      if (G.slut) return false;
      if (G.lås && Date.now() > G.lås) {
        G.lås = 0;
        const levende = G.tanks.filter(t => t.hp > 0);
        if (levende.length <= 1) { G.slut = { vinder: levende[0] ? levende[0].e : null }; if (levende[0]) H.giv(levende[0].e, 5); return true; }
        G.tur = næste(G); G.vind = Math.round((Math.random() - .5) * 80); G.frist = Date.now() + FRIST; return true;
      }
      if (!G.lås && Date.now() > G.frist) { G.tur = næste(G); G.vind = Math.round((Math.random() - .5) * 80); G.frist = Date.now() + FRIST; G.sprang = (G.sprang || 0) + 1; return true; }
      return false;
    },
    kald(H, G, e, d) {
      if (G.slut || G.lås) return; const t = G.tanks[G.tur]; if (t.e !== e) return;
      if (d.sigt) { t.vinkel = Math.max(0, Math.min(180, Math.round(+d.sigt[0]))); t.kraft = Math.max(5, Math.min(100, Math.round(+d.sigt[1]))); }
      if (d.våben && VÅBEN[d.våben] && (d.våben === 'std' || t.våben[d.våben] > 0)) t.våbenValg = d.våben;
      if (d.fyr) skyd(H, G, t);
    },
    frakoblet(H, G, e) { const t = G.tanks.find(x => x.e === e); if (t) t.ude = true; if (G.tanks[G.tur].e === e && !G.lås) { G.tur = næste(G); G.frist = Date.now() + FRIST; } },
    skiftEnhed(H, G, gl, ny) { G.tanks.forEach(t => { if (t.e === gl) { t.e = ny; t.ude = false; } }); },
    felles: true,
    view(H, G) {
      return { jord: G.jord.map(Math.round), tanks: G.tanks.map(t => ({ e: t.e, x: t.x, y: Math.round(t.y), hp: t.hp, vinkel: t.vinkel, kraft: t.kraft, våben: t.våben, valg: t.våbenValg })),
        tur: G.tur, vind: G.vind, skud: G.skud, låst: !!G.lås, rest: G.lås ? FRIST : Math.max(0, G.frist - Date.now()), sprang: G.sprang || 0, slut: G.slut };
    },
    tegn(el, v, api) {
      if (!el.querySelector('#kd-cv')) {
        el.innerHTML = '<div id="kd-ban"></div><canvas id="kd-cv" width="1000" height="620" style="width:100%;display:block;border-radius:16px;touch-action:none"></canvas><div id="kd-ur"></div><div id="kd-styr"></div>';
        el._fx = { partikler: [], ryst: 0 }; el._vis = null;
        const cv = el.querySelector('#kd-cv');
        sigteStyring(el, cv, api);
        const løkke = () => { if (!cv.isConnected) return; tegnScene(el, cv, api); requestAnimationFrame(løkke); };
        requestAnimationFrame(løkke);
      }
      /* nyt skud: animér, og vis først det nye terræn/liv, når granaten er landet */
      if (!el._vis) el._vis = { jord: v.jord.slice(), tanks: JSON.parse(JSON.stringify(v.tanks)) };
      if (v.skud && el._skudN !== v.skud.n) { el._skudN = v.skud.n; el._anim = { s: v.skud, t0: performance.now(), efter: { jord: v.jord.slice(), tanks: JSON.parse(JSON.stringify(v.tanks)) }, bang: {} }; api.lyd.klik(); }
      else if (!el._anim) el._vis = { jord: v.jord.slice(), tanks: JSON.parse(JSON.stringify(v.tanks)) };
      else el._anim.efter = { jord: v.jord.slice(), tanks: JSON.parse(JSON.stringify(v.tanks)) };
      el._v = v;
      /* lokal sigte følger værtens, medmindre man selv sigter lige nu */
      const t = v.tanks[v.tur], min = !v.slut && !v.låst && t.e === api.mig;
      if (!el._sigter || !min) el._sigte = [t.vinkel, t.kraft];
      const ban = v.slut ? '<div class="banner min">🏆 ' + (v.slut.vinder ? esc(api.navn(v.slut.vinder)) + ' vandt Kanondysten!' : 'Alle blev sprængt i luften!') + '</div>'
        : v.låst ? '<div class="banner">💥 ' + esc(api.navn(v.skud.af)) + ' skyder…</div>'
        : '<div class="banner' + (min ? ' min' : '') + '">' + (min ? '🎯 Din tur – træk på banen for at sigte' : '⏳ ' + esc(api.navn(t.e)) + ' sigter') + '</div>';
      const b = el.querySelector('#kd-ban'); if (b._h !== ban) { b._h = ban; b.innerHTML = ban; }
      const ur = el.querySelector('#kd-ur'); if (!v.slut && !v.låst) { if (ur._f !== v.tur + ':' + (v.skud ? v.skud.n : 0) + ':' + v.sprang) { ur._f = v.tur + ':' + (v.skud ? v.skud.n : 0) + ':' + v.sprang; BS.turUr(ur, v.rest, FRIST); } } else if (ur._f !== '') { BS.turUr(document.createElement('div'), 0); ur.innerHTML = ''; ur._f = ''; }   // stop uret mens der skydes
      const kb = 'style="padding:10px 0;min-width:0;font-size:18px"';
      const st = min ? '<div style="display:grid;grid-template-columns:auto 1fr 1fr auto 1fr 1fr;gap:6px;align-items:center;margin-top:8px">'
        + '<span class="hint" style="font-weight:800">Vinkel</span><button class="btn sec" ' + kb + ' data-j="v:2">◀</button><button class="btn sec" ' + kb + ' data-j="v:-2">▶</button>'
        + '<span class="hint" style="font-weight:800;margin-left:6px">Kraft</span><button class="btn sec" ' + kb + ' data-j="k:-2">−</button><button class="btn sec" ' + kb + ' data-j="k:2">+</button></div>'
        + '<p class="hint center" style="margin:4px 0" id="kd-tal"></p>'
        + '<div class="row" style="flex-wrap:wrap;gap:6px">' + Object.entries(VÅBEN).map(([k, w]) => { const n = k === 'std' ? '∞' : t.våben[k]; return '<button class="btn ' + (t.valg === k ? '' : 'sec') + '" data-våben="' + k + '"' + (n === 0 ? ' disabled' : '') + ' style="flex:1;font-size:14px">' + ({ std: '💣', stor: '💥', tre: '🎆' })[k] + ' ' + w.navn + ' (' + n + ')</button>'; }).join('') + '</div>'
        + '<button class="btn big" id="kd-fyr" style="margin-top:10px;background:linear-gradient(135deg,#ef476f,#ff8c42);font-size:22px">🔥 FYR!</button>' : '';
      const sk = el.querySelector('#kd-styr'), sig = st + (min ? t.valg : '');
      if (sk._h !== sig) {
        sk._h = sig; sk.innerHTML = st;
        sk.querySelectorAll('[data-j]').forEach(x => { x.onclick = () => { const [k, n] = x.dataset.j.split(':'); const s = el._sigte; if (k === 'v') s[0] = Math.max(0, Math.min(180, s[0] + +n)); else s[1] = Math.max(5, Math.min(100, s[1] + +n)); api.kald({ sigt: s.slice() }); api.vib(6); }; });
        sk.querySelectorAll('[data-våben]').forEach(x => { x.onclick = () => api.kald({ våben: x.dataset.våben }); });
        const f = sk.querySelector('#kd-fyr'); if (f) f.onclick = () => { f.disabled = true; api.kald({ sigt: el._sigte.slice(), fyr: 1 }); api.vib([30, 30, 60]); };
      }
      if (v.slut && el._slut !== 1) { el._slut = 1; v.slut.vinder === api.mig ? api.lyd.vind() : api.lyd.fejl(); }
      if (min && el._minT !== v.tur + ':' + (v.skud ? v.skud.n : 0)) { el._minT = v.tur + ':' + (v.skud ? v.skud.n : 0); api.vib(40); }
    },
  });

  /* ---------- sigte: træk på banen (retning = vinkel, afstand = kraft) ---------- */
  function sigteStyring(el, cv, api) {
    let aktiv = false, sidst = 0;
    const opd = e => {
      const v = el._v, t = v && v.tanks[v.tur]; if (!t) return;
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * VW, y = (e.clientY - r.top) / r.height * VH;
      let a = Math.atan2(t.y - 24 - y, x - t.x) * 180 / Math.PI; if (a < 0) a = a < -90 ? 180 : 0;
      const k = Math.max(5, Math.min(100, Math.hypot(x - t.x, y - t.y + 24) / 3.6));
      el._sigte = [Math.round(a), Math.round(k)];
      const nu = Date.now(); if (nu - sidst > 90) { sidst = nu; api.kald({ sigt: el._sigte.slice() }); }
    };
    const kan = () => { const v = el._v; return v && !v.slut && !v.låst && v.tanks[v.tur].e === api.mig; };
    cv.addEventListener('pointerdown', e => { if (!kan()) return; aktiv = true; el._sigter = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} opd(e); });
    cv.addEventListener('pointermove', e => { if (aktiv) opd(e); });
    const slip = () => { if (!aktiv) return; aktiv = false; el._sigter = false; api.kald({ sigt: el._sigte.slice() }); };
    cv.addEventListener('pointerup', slip); cv.addEventListener('pointercancel', slip);
  }

  /* ---------- grafik ---------- */
  let HIMMEL = null, JORDTEX = null;
  function himmel() {
    if (HIMMEL) return HIMMEL;
    const c0 = document.createElement('canvas'); c0.width = VW; c0.height = VH; const c = c0.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#070b2a'); g.addColorStop(.45, '#2b1b5a'); g.addColorStop(.75, '#a23b72'); g.addColorStop(1, '#f6a15b');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    const sol = c.createRadialGradient(760, 430, 10, 760, 430, 190); sol.addColorStop(0, 'rgba(255,236,170,1)'); sol.addColorStop(.18, 'rgba(255,190,110,.9)'); sol.addColorStop(1, 'rgba(255,120,90,0)');
    c.fillStyle = sol; c.fillRect(0, 0, VW, VH);
    let seed = 3; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 160; i++) { c.fillStyle = 'rgba(255,255,255,' + (.3 + r() * .7) + ')'; c.fillRect(r() * VW, r() * 260, r() < .1 ? 2 : 1.3, r() < .1 ? 2 : 1.3); }
    [['rgba(60,30,90,.75)', 330, 90, .004], ['rgba(40,20,70,.9)', 380, 70, .007]].forEach(([f, base, amp, fr]) => {
      const ph = r() * 9; c.fillStyle = f; c.beginPath(); c.moveTo(0, VH);
      for (let x = 0; x <= VW; x += 8) c.lineTo(x, base - amp * Math.abs(Math.sin(x * fr + ph)) - amp * .4 * Math.sin(x * fr * 3.1 + ph));
      c.lineTo(VW, VH); c.closePath(); c.fill();
    });
    HIMMEL = c0; return c0;
  }
  function jordTex() {
    if (JORDTEX) return JORDTEX;
    const c0 = document.createElement('canvas'); c0.width = VW; c0.height = VH; const c = c0.getContext('2d');
    const g = c.createLinearGradient(0, 180, 0, VH); g.addColorStop(0, '#8a5a2b'); g.addColorStop(.5, '#6b3f1d'); g.addColorStop(1, '#3a2010');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    let seed = 9; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 240; y < VH; y += 26) { c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= VW; x += 20) c.lineTo(x, y + Math.sin(x * .02 + y) * 6); c.stroke(); }
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < .5 ? 'rgba(0,0,0,.18)' : 'rgba(255,220,170,.12)'; const s = 1 + r() * 4; c.beginPath(); c.arc(r() * VW, 180 + r() * (VH - 180), s, 0, 7); c.fill(); }
    JORDTEX = c0; return c0;
  }
  function tegnScene(el, cv, api) {
    const v = el._v; if (!v) return;
    const c = cv.getContext('2d'), nu = performance.now(), fx = el._fx;
    /* animation af skud */
    let skal = null, spor = [];
    const A = el._anim;
    if (A) {
      const t = (nu - A.t0) / 1000, idx = Math.floor(t / (DT * 2));
      A.s.baner.forEach((b, bi) => {
        const e = A.s.eks[bi];
        if (idx < b.length) { skal = skal || []; skal.push(b[idx]); spor.push(b.slice(Math.max(0, idx - 18), idx + 1)); }
        else if (!A.bang[bi] && !e) A.bang[bi] = true;
        else if (e && !A.bang[bi]) {
          A.bang[bi] = true; api.lyd.ram(); fx.ryst = 14;
          for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 260; fx.partikler.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, liv: 1 + Math.random() * .6, f: Math.random() < .5 ? '#ffd166' : '#ff6b3d', st: 2 + Math.random() * 3 }); }
          for (let k = 0; k < 14; k++) fx.partikler.push({ x: e.x + (Math.random() - .5) * e.r, y: e.y - Math.random() * 20, vx: (Math.random() - .5) * 30, vy: -20 - Math.random() * 40, liv: 2.2, røg: true, st: 14 + Math.random() * 16 });
          fx.ild = (fx.ild || []).concat([{ x: e.x, y: e.y, r: e.r, t0: nu }]);
          el._vis = A.efter;                 // krateret og skaden vises, når granaten rammer
        }
      });
      if (t > A.s.varighed + 1.2) { el._vis = A.efter; el._anim = null; if (A.s.døde.length) api.lyd.sænket(); }
    }
    const V = el._vis;
    c.save();
    if (fx.ryst > .3) { c.translate((Math.random() - .5) * fx.ryst, (Math.random() - .5) * fx.ryst); fx.ryst *= .88; }
    c.drawImage(himmel(), 0, 0);
    /* blinkende stjerner */
    for (let i = 0; i < 12; i++) { const a = .5 + .5 * Math.sin(nu / 400 + i * 2.1); c.fillStyle = 'rgba(255,255,255,' + a + ')'; c.fillRect((i * 83 + 40) % VW, (i * 47 + 20) % 220, 2, 2); }
    /* terræn */
    c.save(); c.beginPath(); c.moveTo(0, VH); V.jord.forEach((y, i) => c.lineTo(i * KOL, y)); c.lineTo(VW, V.jord[NK - 1]); c.lineTo(VW, VH); c.closePath(); c.clip();
    c.drawImage(jordTex(), 0, 0); c.restore();
    c.beginPath(); V.jord.forEach((y, i) => i ? c.lineTo(i * KOL, y) : c.moveTo(0, y)); c.lineTo(VW, V.jord[NK - 1]);
    c.strokeStyle = '#3f7d22'; c.lineWidth = 10; c.lineJoin = 'round'; c.stroke(); c.strokeStyle = '#7ccf4a'; c.lineWidth = 5; c.stroke();
    /* kanoner */
    V.tanks.forEach((t, i) => {
      const live = v.tanks[i] || t, vink = (i === v.tur && live.e === api.mig && el._sigte) ? el._sigte[0] : live.vinkel;
      tegnKanon(c, t, api.farve(t.e), t.hp > 0 ? vink : null, i === v.tur && !v.slut, api.navn(t.e), nu);
    });
    /* sigtelinje for den, der har tur */
    const tt = v.tanks[v.tur];
    if (!v.slut && !v.låst && !A && tt.hp > 0) {
      const [ang, kr] = tt.e === api.mig && el._sigte ? el._sigte : [tt.vinkel, tt.kraft];
      const a = ang * Math.PI / 180, x0 = tt.x + Math.cos(a) * 40, y0 = tt.y - 24 - Math.sin(a) * 40, L = 30 + kr * 1.6;
      c.setLineDash([8, 8]); c.lineDashOffset = -nu / 30; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + Math.cos(a) * L, y0 - Math.sin(a) * L); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#fff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText(ang + '° · ' + kr, x0 + Math.cos(a) * (L + 22), y0 - Math.sin(a) * (L + 22));
      const tal = el.querySelector('#kd-tal'); if (tal && tt.e === api.mig) tal.textContent = 'Vinkel ' + ang + '° · Kraft ' + kr;
    }
    /* granater med lysende hale */
    spor.forEach(s => { s.forEach(([x, y], k) => { c.fillStyle = 'rgba(255,200,120,' + (k / s.length * .6) + ')'; c.beginPath(); c.arc(x, y, 2 + k / s.length * 4, 0, 7); c.fill(); }); });
    (skal || []).forEach(([x, y]) => { const g = c.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, '#fff'); g.addColorStop(.3, '#ffd166'); g.addColorStop(1, 'rgba(255,120,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 16, 0, 7); c.fill(); });
    /* ildkugler */
    fx.ild = (fx.ild || []).filter(f => {
      const t = (nu - f.t0) / 600; if (t > 1) return false;
      const r = f.r * (.4 + Math.min(1, t * 2.5) * .9), g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, 'rgba(255,255,220,' + (1 - t) + ')'); g.addColorStop(.35, 'rgba(255,190,70,' + (1 - t) + ')'); g.addColorStop(.7, 'rgba(240,80,40,' + (.8 - t * .8) + ')'); g.addColorStop(1, 'rgba(120,30,20,0)');
      c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, r, 0, 7); c.fill(); return true;
    });
    /* partikler: gnister og røg */
    const dt = 1 / 60;
    fx.partikler = fx.partikler.filter(p => {
      p.liv -= dt; if (p.liv <= 0) return false; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.røg) { p.st += 12 * dt; c.fillStyle = 'rgba(70,60,80,' + Math.min(.45, p.liv * .25) + ')'; }
      else { p.vy += 400 * dt; c.fillStyle = p.f; c.globalAlpha = Math.min(1, p.liv); }
      c.beginPath(); c.arc(p.x, p.y, p.st, 0, 7); c.fill(); c.globalAlpha = 1; return true;
    });
    c.restore();
    /* vind */
    const vs = v.vind; c.fillStyle = 'rgba(0,0,0,.35)'; rund(c, VW / 2 - 110, 12, 220, 44, 14); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillText('Vind ' + (vs === 0 ? '–' : Math.abs(vs)), VW / 2, 42);
    if (vs) { const d = Math.sign(vs), L = 16 + Math.abs(vs) * .7; c.strokeStyle = '#9fe3ff'; c.lineWidth = 5; c.beginPath(); c.moveTo(VW / 2 + 60 * d, 34); c.lineTo(VW / 2 + (60 + L) * d, 34); c.lineTo(VW / 2 + (52 + L) * d, 26); c.moveTo(VW / 2 + (60 + L) * d, 34); c.lineTo(VW / 2 + (52 + L) * d, 42); c.stroke(); }
  }
  /* kanonen tegnes 1,5× større end i fysikken, så den kan ses på en telefon */
  function tegnKanon(c, t, f, vinkel, aktiv, navn, nu) {
    c.save(); c.translate(t.x, t.y); c.scale(1.5, 1.5); c.translate(-t.x, -t.y);
    kanon(c, t, f, vinkel, aktiv, navn, nu);
    c.restore();
  }
  function kanon(c, t, f, vinkel, aktiv, navn, nu) {
    const x = t.x, y = t.y;
    if (t.hp <= 0) { c.fillStyle = '#2b2b33'; rund(c, x - 18, y - 10, 36, 10, 4); c.fill(); c.fillStyle = 'rgba(80,80,90,.5)'; c.beginPath(); c.arc(x + Math.sin(nu / 300) * 3, y - 24 - (nu / 40 % 20), 8, 0, 7); c.fill(); return; }
    if (aktiv) { const g = c.createRadialGradient(x, y - 10, 5, x, y - 10, 46); g.addColorStop(0, 'rgba(255,209,102,.45)'); g.addColorStop(1, 'rgba(255,209,102,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y - 10, 46, 0, 7); c.fill(); }
    /* løb */
    const a = vinkel * Math.PI / 180;
    c.strokeStyle = '#2d3240'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x + Math.cos(a) * 26, y - 16 - Math.sin(a) * 26); c.stroke();
    c.strokeStyle = '#5a6275'; c.lineWidth = 3; c.stroke();
    /* larvefødder */
    c.fillStyle = '#23262f'; rund(c, x - 20, y - 9, 40, 10, 5); c.fill();
    c.fillStyle = '#4a4f5c'; for (let k = -15; k <= 15; k += 7.5) { c.beginPath(); c.arc(x + k, y - 4, 3.2, 0, 7); c.fill(); }
    /* skrog og tårn */
    const g = c.createLinearGradient(0, y - 22, 0, y - 8); g.addColorStop(0, f); g.addColorStop(1, 'rgba(0,0,0,.35)');
    c.fillStyle = f; c.beginPath(); c.moveTo(x - 18, y - 9); c.lineTo(x - 13, y - 17); c.lineTo(x + 13, y - 17); c.lineTo(x + 18, y - 9); c.closePath(); c.fill();
    c.fillStyle = g; c.fill();
    c.fillStyle = f; c.beginPath(); c.arc(x, y - 17, 9, Math.PI, 0); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(x - 3, y - 20, 3, 0, 7); c.fill();
    /* navn og liv */
    c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(navn, x, y - 46); c.fillStyle = '#fff'; c.fillText(navn, x, y - 46);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 22, y - 40, 44, 7); c.fillStyle = t.hp > 50 ? '#06d6a0' : t.hp > 25 ? '#ffd166' : '#ef476f'; c.fillRect(x - 21, y - 39, 42 * t.hp / 100, 5);
  }
  function rund(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
})();
