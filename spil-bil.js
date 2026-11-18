/* Blå skæg – Bilbane set oppefra for 1-4 spillere. 3 omgange. 1. plads +5, 2. +3, 3. +1.
 * Speederen er automatisk; man styrer ved at trække fingeren til venstre/højre (som et rat). Kører man i græsset, går det langsomt. */
(function () {
  const { esc } = BS;
  const VW = 1000, VH = 700, BRED = 66, OMG = 3;
  const KP = [[150, 360], [175, 165], [370, 95], [515, 205], [650, 110], [860, 140], [915, 330], [790, 445], [870, 590], [640, 640], [470, 520], [310, 630], [125, 565]];
  /* Catmull-Rom-kurve gennem kontrolpunkterne → 600 punkter langs banen */
  const N = 600, BANE = (() => {
    const p = [], n = KP.length;
    for (let i = 0; i < n; i++) {
      const p0 = KP[(i - 1 + n) % n], p1 = KP[i], p2 = KP[(i + 1) % n], p3 = KP[(i + 2) % n];
      for (let t = 0; t < 1; t += n / N) {
        const t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        p.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return p;
  })();
  const NB = BANE.length;
  function nærmeste(x, y, fra) {
    let bi = fra || 0, bd = 1e9;
    const søg = (a, b) => { for (let k = a; k <= b; k++) { const i = (k + NB) % NB, d = (BANE[i][0] - x) ** 2 + (BANE[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } } };
    if (fra == null) søg(0, NB - 1); else søg(fra - 40, fra + 40);
    return [bi, Math.sqrt(bd)];
  }
  const vinkel = i => { const a = BANE[i], b = BANE[(i + 3) % NB]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };

  BS.registrer({
    id: 'bil', navn: 'Bilbane', e: '🏎️', min: 1, max: 4, tickMs: 33, felles: true, realtid: true,
    d: 'Ræs 3 omgange rundt om banen. Træk fingeren til siden for at styre.',
    start(H) {
      const ps = H.spillere(), a0 = vinkel(0);
      return { fase: 'nedtæl', t: 3000, tid: 0, mål: [], sluttid: 0, slut: null,
        biler: ps.map((p, i) => {
          const række = (i / 2) | 0, side = i % 2 ? 1 : -1, bi = (NB - 12 - række * 14) % NB, [bx, by] = BANE[bi], n = a0 + Math.PI / 2;
          return { e: p.enhed, x: bx + Math.cos(n) * side * 15, y: by + Math.sin(n) * side * 15, a: a0, v: 0, s: 0, idx: bi, omg: 0, cp: false, mål: 0, ude: false };
        }) };
    },
    kald(H, G, e, d) { const b = G.biler.find(x => x.e === e); if (b && d.s != null) b.s = Math.max(-1, Math.min(1, +d.s || 0)); },
    tick(H, G) {
      const dt = .033;
      if (G.fase === 'slut') return false;
      if (G.fase === 'nedtæl') { G.t -= 33; if (G.t <= 0) G.fase = 'kører'; return true; }
      G.tid += dt;
      G.biler.forEach(b => {
        if (b.mål) { b.v *= .96; }
        const [i, d] = nærmeste(b.x, b.y, b.idx), påBane = d < BRED / 2 + 4;
        const vmax = b.mål ? 120 : påBane ? 330 : 135;
        if (!b.mål) b.v += (b.v < vmax ? 300 : -400) * dt;
        b.v = Math.max(0, Math.min(b.v, påBane ? 340 : Math.max(135, b.v - 500 * dt)));
        b.a += b.s * 2.7 * dt * Math.min(1, b.v / 110);
        b.x += Math.cos(b.a) * b.v * dt; b.y += Math.sin(b.a) * b.v * dt;
        b.x = Math.max(10, Math.min(VW - 10, b.x)); b.y = Math.max(10, Math.min(VH - 10, b.y));
        const [ni] = nærmeste(b.x, b.y, i);
        if (ni > NB * .4 && ni < NB * .6) b.cp = true;
        if (b.idx > NB - 30 && ni < 30 && b.cp && !b.mål) { b.omg++; b.cp = false; if (b.omg >= OMG) { b.mål = G.mål.length + 1; G.mål.push(b.e); if (!G.sluttid) G.sluttid = G.tid + 20; } }
        if (b.idx < 30 && ni > NB - 30 && b.omg > 0 && !b.cp) {}   // baglæns over stregen tæller ikke
        b.idx = ni; b.på = påBane;
      });
      for (let i = 0; i < G.biler.length; i++) for (let j = i + 1; j < G.biler.length; j++) {
        const a = G.biler[i], b = G.biler[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 24 && d > 0) { const p = (24 - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; a.v *= .97; b.v *= .97; G.bump = (G.bump || 0) + 1; }
      }
      const kørende = G.biler.filter(b => !b.mål && (H.find(b.e) || {}).online);
      if (!kørende.length || (G.sluttid && G.tid > G.sluttid)) {
        G.fase = 'slut';
        const rest = G.biler.filter(b => !b.mål).sort((a, b) => (b.omg * NB + b.idx) - (a.omg * NB + a.idx)).map(b => b.e);
        const ræk = G.mål.concat(rest); [5, 3, 1].forEach((p, k) => { if (ræk[k] && ræk.length > 1) H.giv(ræk[k], p); });
        if (ræk.length === 1 && G.mål.length) H.giv(ræk[0], 1);
        G.slut = { ræk, tid: G.tid };
      }
      return true;
    },
    frakoblet() {},
    skiftEnhed(H, G, gl, ny) { G.biler.forEach(b => { if (b.e === gl) b.e = ny; }); G.mål = G.mål.map(x => x === gl ? ny : x); },
    view(H, G) {
      const r = n => Math.round(n * 10) / 10;
      const pl = G.biler.slice().sort((a, b) => (b.mål ? 1e6 - b.mål : 0) - (a.mål ? 1e6 - a.mål : 0) || (b.omg * NB + b.idx) - (a.omg * NB + a.idx)).map(b => b.e);
      return { fase: G.fase, t: G.t, tid: r(G.tid), sluttid: G.sluttid, biler: G.biler.map(b => ({ e: b.e, x: r(b.x), y: r(b.y), a: Math.round(b.a * 100) / 100, v: Math.round(b.v), omg: b.omg, mål: b.mål, på: b.på })),
        pl, bump: G.bump || 0, slut: G.slut };
    },
    tegn(el, v, api) {
      if (!el.querySelector('#bl-cv')) {
        el.innerHTML = '<div class="rt-ban"></div><canvas id="bl-cv" width="1000" height="700" style="width:100%;border-radius:14px"></canvas>'
          + '<div id="bl-rat" style="height:min(26vh,200px);margin-top:10px;border-radius:18px;background:#14244a;border:2px dashed #2a4180;display:grid;place-items:center;position:relative;touch-action:none;overflow:hidden">'
          + '<div class="hint center" style="pointer-events:none;position:relative;z-index:1;background:rgba(20,36,74,.85);padding:6px 10px;border-radius:10px">👆 Træk til venstre / højre for at styre<br><small>speederen er automatisk</small></div><div id="bl-viser" style="position:absolute;top:10px;bottom:10px;width:8px;left:50%;margin-left:-4px;border-radius:4px;background:#ffd166;opacity:.55;pointer-events:none;transition:left .08s"></div></div>'
          + '<p class="hint center">Hele skærmen kan bruges som rat · pc: ← →</p>';
        bilStyring(el, api);
      }
      const mig = v.biler.find(b => b.e === api.mig), plads = v.pl.indexOf(api.mig) + 1;
      let ban;
      if (v.fase === 'nedtæl') ban = '<div class="banner min" style="font-size:28px">' + ['🔴', '🟡', '🟢'][Math.max(0, 3 - Math.ceil(v.t / 1000))] + ' ' + Math.max(1, Math.ceil(v.t / 1000)) + '</div>';
      else if (v.fase === 'slut') ban = '<div class="banner min">🏁 ' + v.slut.ræk.slice(0, 3).map((e, k) => ['🥇', '🥈', '🥉'][k] + ' ' + esc(api.navn(e))).join('  ') + '</div>';
      else if (mig && mig.mål) ban = '<div class="banner min">🏁 I mål som nr. ' + mig.mål + '!' + (v.sluttid ? ' · løbet slutter om ' + Math.max(0, Math.ceil(v.sluttid - v.tid)) + ' sek' : '') + '</div>';
      else ban = '<div class="banner min">🏎️ Omgang ' + Math.min(OMG, (mig ? mig.omg : 0) + 1) + '/' + OMG + ' · nr. ' + plads + ' af ' + v.biler.length + (v.sluttid ? ' · ⏱ ' + Math.max(0, Math.ceil(v.sluttid - v.tid)) : '') + '</div>';
      const b = el.querySelector('.rt-ban'); if (b._h !== ban) { b._h = ban; b.innerHTML = ban; }
      tegnBane(el.querySelector('#bl-cv'), v, api);
      if (el._bump !== v.bump) { if (el._bump != null && v.bump - el._bump > 3) api.lyd.klik(); el._bump = v.bump; }
      if (v.fase === 'slut' && el._slut !== 1) { el._slut = 1; v.slut.ræk[0] === api.mig ? api.lyd.vind() : api.lyd.ok(); }
    },
  });

  /* ---------- grafik ---------- */
  let BAG = null;
  function baggrund() {
    if (BAG) return BAG;
    const c0 = document.createElement('canvas'); c0.width = VW; c0.height = VH; const c = c0.getContext('2d');
    let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    c.fillStyle = '#2f8f3a'; c.fillRect(0, 0, VW, VH);
    for (let x = 0; x < VW; x += 50) { c.fillStyle = (x / 50) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.035)'; c.fillRect(x, 0, 50, VH); }
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < .5 ? 'rgba(20,80,25,.35)' : 'rgba(120,200,90,.18)'; c.fillRect(r() * VW, r() * VH, 2, 2); }
    const sti = () => { c.beginPath(); BANE.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
    c.lineJoin = 'round'; c.lineCap = 'round';
    /* skygge + kantsten (rød/hvid) + asfalt */
    c.save(); c.translate(0, 4); sti(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = BRED + 18; c.stroke(); c.restore();
    sti(); c.strokeStyle = '#fff'; c.lineWidth = BRED + 14; c.stroke();
    sti(); c.strokeStyle = '#e63946'; c.lineWidth = BRED + 14; c.setLineDash([16, 16]); c.stroke(); c.setLineDash([]);
    sti(); c.strokeStyle = '#3d424b'; c.lineWidth = BRED; c.stroke();
    for (let i = 0; i < 260; i++) { const k = BANE[(r() * NB) | 0]; c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(k[0] + (r() - .5) * BRED * .8, k[1] + (r() - .5) * BRED * .8, 3, 3); }
    sti(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5; c.setLineDash([18, 22]); c.stroke(); c.setLineDash([]);
    /* ternet målstreg */
    const [sx, sy] = BANE[0], a = vinkel(0);
    c.save(); c.translate(sx, sy); c.rotate(a);
    for (let k = 0; k < 2; k++) for (let j = 0; j < 8; j++) { c.fillStyle = (j + k) % 2 ? '#111' : '#fff'; c.fillRect(-8 + k * 8, -BRED / 2 + j * (BRED / 8), 8, BRED / 8); }
    c.restore();
    /* tilskuertribune ved start */
    c.save(); c.translate(sx, sy); c.rotate(a); c.fillStyle = '#5b6474'; c.fillRect(-70, -BRED / 2 - 46, 140, 22);
    for (let j = 0; j < 22; j++) { c.fillStyle = ['#ffd166', '#ef476f', '#4cc9f0', '#fff', '#06d6a0'][j % 5]; c.beginPath(); c.arc(-64 + j * 6.2, -BRED / 2 - 35 + (j % 2) * 5, 2.6, 0, 7); c.fill(); }
    c.restore();
    /* træer udenfor banen */
    for (let t = 0; t < 70; t++) {
      const x = 20 + r() * (VW - 40), y = 20 + r() * (VH - 40); if (nærmeste(x, y)[1] < BRED / 2 + 34) continue;
      const s = 10 + r() * 12;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + 5, y + 6, s, 0, 7); c.fill();
      c.fillStyle = '#1f6b2a'; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
      c.fillStyle = '#2e8b3a'; c.beginPath(); c.arc(x - s * .3, y - s * .3, s * .6, 0, 7); c.fill();
    }
    BAG = c0; return BAG;
  }
  /* kameraet følger din bil med 2× zoom (blødt), og et minikort i hjørnet viser hele banen */
  const ZOOM = 2;
  function tegnBane(cv, v, api) {
    const c = cv.getContext('2d');
    const mål = v.biler.find(b => b.e === api.mig) || v.biler.find(b => b.e === v.pl[0]) || v.biler[0];
    const vw = VW / ZOOM, vh = VH / ZOOM;
    const tx = Math.max(0, Math.min(VW - vw, mål.x - vw / 2)), ty = Math.max(0, Math.min(VH - vh, mål.y - vh / 2));
    const cam = cv._cam || (cv._cam = { x: tx, y: ty }); cam.x += (tx - cam.x) * .35; cam.y += (ty - cam.y) * .35;
    c.save(); c.scale(ZOOM, ZOOM); c.translate(-cam.x, -cam.y);
    c.drawImage(baggrund(), 0, 0);
    tegnBiler(c, v, api);
    c.restore();
    /* minikort */
    const mw = 240, mh = mw * VH / VW, mx = VW - mw - 14, my = 14;
    c.save(); c.globalAlpha = .9; c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(mx - 4, my - 4, mw + 8, mh + 8); c.drawImage(baggrund(), mx, my, mw, mh); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.strokeRect(mx + cam.x * mw / VW, my + cam.y * mh / VH, vw * mw / VW, vh * mh / VH);
    v.biler.forEach(b => { c.fillStyle = api.farve(b.e); c.beginPath(); c.arc(mx + b.x * mw / VW, my + b.y * mh / VH, b.e === api.mig ? 7 : 5, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); });
    c.restore();
  }
  function tegnBiler(c, v, api) {
    v.biler.forEach(b => {
      const f = api.farve(b.e);
      c.save(); c.translate(b.x, b.y); c.rotate(b.a);
      c.fillStyle = 'rgba(0,0,0,.35)'; rund(c, -15, -7, 34, 18, 6); c.fill();               // skygge
      c.fillStyle = '#111'; [[-10, -10], [6, -10], [-10, 7], [6, 7]].forEach(([x, y]) => c.fillRect(x, y, 7, 3));   // hjul
      c.fillStyle = f; rund(c, -16, -8, 32, 16, 6); c.fill();                                 // karosseri
      c.fillStyle = 'rgba(0,0,0,.25)'; rund(c, -16, 2, 32, 6, 3); c.fill();
      c.fillStyle = '#0b1630'; rund(c, -2, -6, 10, 12, 3); c.fill();                          // forrude
      c.fillStyle = 'rgba(255,255,255,.75)'; rund(c, -11, -6, 7, 12, 2); c.fill();            // tag
      c.fillStyle = '#ffe9a6'; c.fillRect(14, -6, 3, 4); c.fillRect(14, 2, 3, 4);             // forlygter
      c.restore();
      if (b.e === api.mig) { c.strokeStyle = '#ffd166'; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, 22, 0, 7); c.stroke(); }
      c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 3;
      c.strokeText(api.navn(b.e), b.x, b.y - 22); c.fillText(api.navn(b.e), b.x, b.y - 22);
    });
  }
  function rund(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function bilStyring(el, api) {
    el.style.touchAction = 'none';
    const viser = el.querySelector('#bl-viser'), rat = el.querySelector('#bl-rat');
    let id = null, sx = 0, s = 0, sendt = null, sidst = 0;
    const send = (tv) => { const r = Math.round(s * 20) / 20; const nu = Date.now(); if (r === sendt || (!tv && nu - sidst < 50)) return; sidst = nu; sendt = r; api.kald({ s: r }); viser.style.left = (50 + r * 45) + '%'; };
    el.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; id = e.pointerId; sx = e.clientX; try { el.setPointerCapture(id); } catch (x) {} });
    el.addEventListener('pointermove', e => { if (e.pointerId !== id) return; s = Math.max(-1, Math.min(1, (e.clientX - sx) / 70)); send(); });
    const slip = e => { if (e.pointerId !== id) return; id = null; s = 0; send(true); };
    el.addEventListener('pointerup', slip); el.addEventListener('pointercancel', slip);
    const taster = {};
    const opd = () => { s = (taster.ArrowRight || taster.d ? 1 : 0) - (taster.ArrowLeft || taster.a ? 1 : 0); send(true); };
    document.addEventListener('keydown', e => { if (!el.isConnected || !/^(ArrowLeft|ArrowRight|a|d)$/.test(e.key) || taster[e.key]) return; taster[e.key] = 1; e.preventDefault(); opd(); });
    document.addEventListener('keyup', e => { if (!el.isConnected || !taster[e.key]) return; delete taster[e.key]; opd(); });
    rat.addEventListener('contextmenu', e => e.preventDefault());
  }
})();
