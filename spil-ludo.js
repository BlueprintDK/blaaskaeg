/* Blå skæg – Ludo for 2-4 spillere.
 * Regler: slå 6 for at komme ud. 6 giver et ekstra slag. Lander du på en modstander, ryger den hjem
 * (undtagen på startfelterne, som er fredet). Man skal ramme målet præcist. Først med alle 4 brikker i mål vinder (+5).
 * 18/11-2026 (Michael): tegnes nu som et ægte ludobræt på canvas med 3D-brikker, der går felt for felt. */
(function () {
  const { esc, rnd } = BS;
  /* 52 felter rundt om pladen (15×15), startende ved spiller A's startfelt */
  const BANE = [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]];
  const START = [0, 13, 26, 39];
  const HJEM = [[[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]];
  /* gården: fire runde pladser i hvert hjørne (i cellekoordinater, kan være halve) */
  const GÅRD = [[[1.75, 1.75], [1.75, 3.25], [3.25, 1.75], [3.25, 3.25]], [[1.75, 10.75], [1.75, 12.25], [3.25, 10.75], [3.25, 12.25]],
    [[10.75, 10.75], [10.75, 12.25], [12.25, 10.75], [12.25, 12.25]], [[10.75, 1.75], [10.75, 3.25], [12.25, 1.75], [12.25, 3.25]]];
  const MÅLPOS = [[7, 6.25], [6.25, 7], [7, 7.75], [7.75, 7]];
  const MÅL = 57;          // 0..51 bane, 52..56 hjemmesti, 57 = mål
  const SÆDER = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
  const banefelt = (sæde, rel) => (START[sæde] + rel) % 52;
  function pos(sæde, b, i) { if (b < 0) return GÅRD[sæde][i]; if (b <= 51) return BANE[banefelt(sæde, b)]; if (b < MÅL) return HJEM[sæde][b - 52]; return MÅLPOS[sæde]; }
  function lovlige(G, si, slag) {
    const s = G.sp[si]; return s.b.map(b => { if (b === MÅL) return false; if (b < 0) return slag === 6; return b + slag <= MÅL; });
  }
  const næsteTur = (H, G) => { const n = G.sp.length; for (let k = 1; k <= n; k++) { const j = (G.tur + k) % n; if ((H.find(G.sp[j].e) || {}).online && !G.sp[j].færdig) return j; } return G.tur; };

  BS.registrer({
    id: 'ludo', navn: 'Ludo', e: '🎯', min: 2, max: 4,
    d: 'Slå 6 for at komme ud, smid de andre hjem og få alle fire brikker i mål.',
    start(H) {
      const ps = H.spillere(), sæder = SÆDER[ps.length];
      return { sp: ps.map((p, i) => ({ e: p.enhed, sæde: sæder[i], b: [-1, -1, -1, -1], færdig: false })), tur: 0, slag: 0, harSlået: false, log: '', nr: 0, slut: null };
    },
    kald(H, G, e, d) {
      if (G.slut) return; const s = G.sp[G.tur]; if (s.e !== e) return;
      const navn = H.navn(e);
      if (d.slå && !G.harSlået) {
        G.slag = 1 + rnd(6); G.harSlået = true; G.nr++;
        const l = lovlige(G, G.tur, G.slag);
        if (!l.some(Boolean)) { G.log = navn + ' slog ' + G.slag + ' – kan ikke rykke'; G.harSlået = false; if (G.slag !== 6) G.tur = næsteTur(H, G); }
        else G.log = navn + ' slog ' + G.slag;
        return;
      }
      if (d.brik != null && G.harSlået) {
        const i = +d.brik, l = lovlige(G, G.tur, G.slag); if (!l[i]) return;
        s.b[i] = s.b[i] < 0 ? 0 : s.b[i] + G.slag;
        let tekst = navn + ' rykkede ' + (s.b[i] === 0 ? 'en brik ud' : G.slag);
        if (s.b[i] <= 51) {
          const felt = banefelt(s.sæde, s.b[i]);
          if (!START.includes(felt)) G.sp.forEach(o => { if (o === s) return; o.b.forEach((ob, j) => { if (ob >= 0 && ob <= 51 && banefelt(o.sæde, ob) === felt) { o.b[j] = -1; tekst += ' og sendte ' + H.navn(o.e) + ' hjem! 💥'; G.slagHjem = (G.slagHjem || 0) + 1; } }); });
        }
        if (s.b[i] === MÅL) tekst += ' – i mål! 🏁';
        G.log = tekst; G.harSlået = false; G.træk = (G.træk || 0) + 1;
        if (s.b.every(b => b === MÅL)) { s.færdig = true; G.slut = { vinder: e }; H.giv(e, 5); return; }
        if (G.slag !== 6) G.tur = næsteTur(H, G);
      }
    },
    frakoblet(H, G, e) { if (!G.slut && G.sp[G.tur].e === e) { G.harSlået = false; G.tur = næsteTur(H, G); } },
    skiftEnhed(H, G, gl, ny) { G.sp.forEach(s => { if (s.e === gl) s.e = ny; }); if (G.slut && G.slut.vinder === gl) G.slut.vinder = ny; },
    felles: true,
    view(H, G) { return { sp: G.sp, tur: G.tur, slag: G.slag, harSlået: G.harSlået, log: G.log, nr: G.nr, træk: G.træk || 0, slut: G.slut, slagHjem: G.slagHjem || 0 }; },
    tegn(el, v, api) {
      if (!el.querySelector('#lu-cv')) {
        el.innerHTML = '<div id="lu-ban"></div><canvas id="lu-cv" width="900" height="900" style="width:100%;display:block;border-radius:18px;touch-action:manipulation"></canvas>'
          + '<div style="display:flex;gap:14px;align-items:center;justify-content:center;margin-top:12px"><div id="lu-terning"></div><button class="btn ok big" id="lu-slå" style="flex:1">🎲 Slå</button></div><p class="hint center" id="lu-log"></p>';
        el._vis = {}; el._anim = [];
        const cv = el.querySelector('#lu-cv');
        cv.addEventListener('click', e => {
          const s = el._v; if (!s) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 900, y = (e.clientY - r.top) / r.height * 900;
          const ts = s.sp[s.tur]; if (ts.e !== api.mig || !s.harSlået) return;
          const lovl = lovlige(s, s.tur, s.slag); let bedst = -1, bd = 1e9;
          ts.b.forEach((b, i) => { if (!lovl[i]) return; const p = el._vis[s.tur + ':' + i]; if (!p) return; const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; bedst = i; } });
          if (bedst >= 0 && bd < 60) api.kald({ brik: bedst });
        });
        el.querySelector('#lu-slå').onclick = () => { el.querySelector('#lu-slå').disabled = true; api.kald({ slå: 1 }); };
        const løkke = () => { if (!cv.isConnected) return; tegnBræt(el, cv, api); requestAnimationFrame(løkke); };
        requestAnimationFrame(løkke);
      }
      /* animation: brikker, der har flyttet sig, går felt for felt; slåede brikker flyver hjem */
      if (el._v) v.sp.forEach((s, si) => s.b.forEach((b, i) => {
        const før = el._v.sp[si] ? el._v.sp[si].b[i] : b; if (før === b) return;
        const vej = [];
        if (b < 0) vej.push(cxy(pos(s.sæde, b, i)));
        else if (før < 0) vej.push(cxy(pos(s.sæde, 0, i)));
        else for (let k = før + 1; k <= b; k++) vej.push(cxy(pos(s.sæde, k, i)));
        el._anim.push({ nøgle: si + ':' + i, fra: el._vis[si + ':' + i] || vej[0], vej, t0: performance.now(), hjem: b < 0 });
      }));
      el._v = v;
      const ts = v.sp[v.tur], min = !v.slut && ts.e === api.mig;
      const ban = v.slut ? '<div class="banner min">🏆 ' + esc(api.navn(v.slut.vinder)) + ' vandt Ludo!</div>'
        : '<div class="banner' + (min ? ' min' : '') + '">' + (min ? (v.harSlået ? '🎯 Tryk på en brik (du slog ' + v.slag + ')' : '🎯 Din tur – slå!') : '⏳ ' + esc(api.navn(ts.e)) + 's tur') + '</div>';
      const b = el.querySelector('#lu-ban'); if (b._h !== ban) { b._h = ban; b.innerHTML = ban; }
      const knap = el.querySelector('#lu-slå'); knap.style.display = min && !v.harSlået ? '' : 'none'; knap.disabled = false;
      el.querySelector('#lu-log').textContent = v.log || '';
      const tn = el.querySelector('#lu-terning');
      if (tn._nr !== v.nr) { tn._nr = v.nr; tn.innerHTML = terning(v.slag || 1, api.farve(ts.e), v.nr > 0); if (v.nr) api.lyd.klik(); }
      if (el._hj !== v.slagHjem) { if (el._hj != null) api.lyd.ram(); el._hj = v.slagHjem; }
      if (el._tr !== v.træk) { if (el._tr != null) api.lyd.ok(); el._tr = v.træk; }
      if (min && el._minNr !== v.nr + ':' + v.harSlået) { el._minNr = v.nr + ':' + v.harSlået; api.vib(30); }
      if (v.slut && v.slut.vinder === api.mig && el._vundet !== 1) { el._vundet = 1; api.lyd.vind(); }
    },
  });

  /* ---------- grafik ---------- */
  const S = 60;                                  // pixels pr. felt på et 900×900-lærred
  const cxy = ([r, c]) => [c * S + S / 2, r * S + S / 2];
  const NEUTRAL = '#c3c8d4';
  function mørkere(hex, f) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * f, g = ((n >> 8) & 255) * f, b = (n & 255) * f; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
  const BRÆT = {};
  function bræt(farver) {
    const nøgle = farver.join(); if (BRÆT[nøgle]) return BRÆT[nøgle];
    const c0 = document.createElement('canvas'); c0.width = c0.height = 900; const c = c0.getContext('2d');
    /* træramme og hvid plade */
    const træ = c.createLinearGradient(0, 0, 900, 900); træ.addColorStop(0, '#8a5a2b'); træ.addColorStop(.5, '#b07a3f'); træ.addColorStop(1, '#6f4520');
    c.fillStyle = træ; c.fillRect(0, 0, 900, 900);
    c.fillStyle = '#fbf8f0'; c.fillRect(10, 10, 880, 880);
    const k = (r, c2, w, h) => [c2 * S, r * S, w * S, h * S];
    /* gårde */
    [[0, 0], [0, 9], [9, 9], [9, 0]].forEach(([r, cc], sæde) => {
      const f = farver[sæde]; const [x, y, w, h] = k(r, cc, 6, 6);
      const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, f); g.addColorStop(1, mørkere(f, .8)); c.fillStyle = g; c.fillRect(x + (cc ? 0 : 10), y + (r ? 0 : 10), w - 10, h - 10);
      c.fillStyle = '#fbf8f0'; rundRect(c, x + S * .85, y + S * .85, S * 4.3, S * 4.3, 26); c.fill();
      c.strokeStyle = mørkere(f, .7); c.lineWidth = 3; c.stroke();
      GÅRD[sæde].forEach(p => { const [px, py] = cxy(p); c.fillStyle = mørkere(f, .95); c.beginPath(); c.arc(px, py, S * .5, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(px, py + 3, S * .38, 0, 7); c.fill(); c.fillStyle = f; c.beginPath(); c.arc(px, py, S * .36, 0, 7); c.fill(); });
    });
    /* banefelter */
    const felt = (r, cc, f) => { c.fillStyle = f; c.fillRect(cc * S + 1, r * S + 1, S - 2, S - 2); };
    BANE.forEach(([r, cc]) => felt(r, cc, '#ffffff'));
    HJEM.forEach((l, sæde) => l.forEach(([r, cc]) => felt(r, cc, farver[sæde])));
    START.forEach((i, sæde) => { const [r, cc] = BANE[i]; felt(r, cc, farver[sæde]); stjerne(c, cc * S + S / 2, r * S + S / 2, S * .3, '#fff'); });
    [8, 21, 34, 47].forEach(i => { const [r, cc] = BANE[i]; stjerne(c, cc * S + S / 2, r * S + S / 2, S * .28, '#c9ccd6'); });
    /* gitter */
    c.strokeStyle = '#9aa1b2'; c.lineWidth = 1.5;
    BANE.concat(...HJEM).forEach(([r, cc]) => c.strokeRect(cc * S + .5, r * S + .5, S - 1, S - 1));
    /* pile ind mod hjemmesti */
    [[7, 0, 0], [0, 7, Math.PI / 2], [7, 14, Math.PI], [14, 7, -Math.PI / 2]].forEach(([r, cc, a], sæde) => { c.save(); c.translate(cc * S + S / 2, r * S + S / 2); c.rotate(a); c.fillStyle = farver[sæde]; c.beginPath(); c.moveTo(-14, -12); c.lineTo(16, 0); c.lineTo(-14, 12); c.closePath(); c.fill(); c.restore(); });
    /* midten: fire trekanter */
    const mx = 7.5 * S, my = 7.5 * S, x0 = 6 * S, y0 = 6 * S, x1 = 9 * S, y1 = 9 * S;
    [[[x0, y0], [x0, y1], 0], [[x0, y0], [x1, y0], 1], [[x1, y0], [x1, y1], 2], [[x0, y1], [x1, y1], 3]].forEach(([a, b2, sæde]) => {
      c.fillStyle = farver[sæde]; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b2[0], b2[1]); c.lineTo(mx, my); c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    });
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(mx, my, 22, 0, 7); c.fill(); c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#0b1630'; c.fillText('🏁', mx, my + 1);
    BRÆT[nøgle] = c0; return c0;
  }
  function stjerne(c, x, y, r, f) { c.fillStyle = f; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function rundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function brik(c, x, y, f, løft, glød) {
    const r = S * .3;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x + 3, y + r * .95, r * 1.05, r * .38, 0, 0, 7); c.fill();
    y -= løft;
    if (glød) { c.fillStyle = 'rgba(255,209,102,' + (.35 + .25 * Math.sin(performance.now() / 160)) + ')'; c.beginPath(); c.arc(x, y, r * 1.75, 0, 7); c.fill(); }
    /* fod */
    const fod = c.createLinearGradient(x - r, 0, x + r, 0); fod.addColorStop(0, mørkere(f, .65)); fod.addColorStop(.5, f); fod.addColorStop(1, mørkere(f, .55));
    c.fillStyle = fod; c.beginPath(); c.ellipse(x, y + r * .7, r, r * .38, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(x - r * .95, y + r * .65); c.quadraticCurveTo(x - r * .35, y + r * .1, x - r * .32, y - r * .35); c.lineTo(x + r * .32, y - r * .35); c.quadraticCurveTo(x + r * .35, y + r * .1, x + r * .95, y + r * .65); c.closePath(); c.fill();
    /* hoved */
    const hd = c.createRadialGradient(x - r * .2, y - r * .85, r * .08, x, y - r * .6, r * .62); hd.addColorStop(0, '#ffffff'); hd.addColorStop(.25, f); hd.addColorStop(1, mørkere(f, .55));
    c.fillStyle = hd; c.beginPath(); c.arc(x, y - r * .62, r * .55, 0, 7); c.fill();
    c.strokeStyle = mørkere(f, .45); c.lineWidth = 1.5; c.stroke();
  }
  function tegnBræt(el, cv, api) {
    const v = el._v; if (!v) return;
    const farver = [0, 1, 2, 3].map(sæde => { const s = v.sp.find(x => x.sæde === sæde); return s ? api.farve(s.e) : NEUTRAL; });
    const c = cv.getContext('2d'); c.drawImage(bræt(farver), 0, 0);
    const nu = performance.now(), ts = v.sp[v.tur], min = !v.slut && ts.e === api.mig, lovl = min && v.harSlået ? lovlige(v, v.tur, v.slag) : null;
    /* aktuelle positioner (med animation) */
    const pl = [];
    v.sp.forEach((s, si) => s.b.forEach((b, i) => {
      const nøgle = si + ':' + i; let [x, y] = cxy(pos(s.sæde, b, i)), løft = 0;
      const a = el._anim.find(q => q.nøgle === nøgle);
      if (a) {
        const trin = a.hjem ? 420 : 140, t = (nu - a.t0) / trin, n = a.vej.length;
        if (t >= n) el._anim = el._anim.filter(q => q !== a);
        else { const k = Math.floor(t), f = t - k, fra = k === 0 ? a.fra : a.vej[k - 1], til = a.vej[k]; x = fra[0] + (til[0] - fra[0]) * f; y = fra[1] + (til[1] - fra[1]) * f; løft = Math.sin(f * Math.PI) * (a.hjem ? 60 : 14); }
      }
      pl.push({ si, i, x, y, løft, f: api.farve(s.e), glød: lovl && si === v.tur && lovl[i], b });
    }));
    /* flere brikker på samme felt: spred dem lidt */
    const grupper = {}; pl.forEach(p => { const k = Math.round(p.x) + ',' + Math.round(p.y); (grupper[k] = grupper[k] || []).push(p); });
    Object.values(grupper).forEach(g => { if (g.length > 1) g.forEach((p, n) => { p.x += (n % 2 ? 1 : -1) * 9; p.y += (n > 1 ? 1 : -1) * 7; }); });
    pl.sort((a, b) => a.y - b.y).forEach(p => {
      const hop = p.glød ? Math.abs(Math.sin(nu / 180)) * 8 : 0;
      brik(c, p.x, p.y, p.f, p.løft + hop, p.glød);
      el._vis[p.si + ':' + p.i] = [p.x, p.y];
    });
  }
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function terning(x, f, ryst) {
    return '<div style="width:66px;height:66px;border-radius:16px;padding:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:3px;background:linear-gradient(145deg,#fff,#dfe6f3);box-shadow:0 5px 0 ' + f + ',0 8px 16px rgba(0,0,0,.4);'
      + (ryst ? 'animation:luRul .55s ease-out' : '') + '">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(p => '<i style="border-radius:50%;background:' + (PIPS[x].includes(p) ? '#0b1630' : 'transparent') + '"></i>').join('') + '</div>';
  }
  const st = document.createElement('style'); st.textContent = '@keyframes luRul{0%{transform:rotate(-200deg) scale(.4)}60%{transform:rotate(15deg) scale(1.1)}100%{transform:rotate(0) scale(1)}}'; document.head.appendChild(st);
})();
