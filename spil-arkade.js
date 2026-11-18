/* Blå skæg – arkadespil i realtid: Airhockey (1 mod 1 / 2 mod 2) og Stjerneværn (co-op mod rumvæsner).
 * 18/11-2026 (Michael): erstatter Bilbane («kører nemt af banen») og Forsvar borgen («dårligt»).
 * Værten kører fysikken (tickMs 33) og sender tilstanden ud; telefonerne sender kun, hvor fingeren er. */
(function () {
  const { esc } = BS;
  const NEDTÆL = 3000;
  const ban = (el, html) => { const b = el.querySelector('.ak-ban'); if (b && b._h !== html) { b._h = html; b.innerHTML = html; } };
  /* fingerstyring: send position (i spillets koordinater) mens fingeren er nede – højst hver 30. ms */
  function fingerStyring(cv, tilSpil, send, lokal) {
    let sidst = 0, nede = false;
    const pos = e => { const r = cv.getBoundingClientRect(); return tilSpil((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); };
    const flyt = (e, tving) => { const p = pos(e); lokal(p); const nu = Date.now(); if (tving || nu - sidst > 30) { sidst = nu; send(p); } };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); nede = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} flyt(e, true); });
    cv.addEventListener('pointermove', e => { if (nede) flyt(e); });
    const slip = e => { if (nede) { nede = false; flyt(e, true); lokal(null); } };
    cv.addEventListener('pointerup', slip); cv.addEventListener('pointercancel', slip);
  }

  /* ==================== AIRHOCKEY ====================
   * Bord 60 × 100. Hold A (spiller 1 og 3) forsvarer målet nederst, hold B (spiller 2 og 4) øverst.
   * Hver telefon vender bordet, så ens eget mål er nederst. Man styrer sin kølle ved at trække – kun på egen halvdel.
   * Først til 7. Vinderholdet får +3 hver i stillingen. */
  const AW = 60, AH = 100, PUK = 2.6, KØLLE = 4.4, MÅL = 24, MAXV = 150, KFART = 170, TIL = 7;
  const holdAf = i => (i % 2 === 0 ? 'A' : 'B');
  function nyPuk(G, mod) { G.puk = { x: AW / 2, y: mod === 'A' ? AH * .62 : mod === 'B' ? AH * .38 : AH / 2, vx: 0, vy: 0 }; G.pause = 900; }
  BS.registrer({
    id: 'airhockey', navn: 'Airhockey', e: '🏒', min: 2, max: 4, spillertekst: '1 mod 1 eller 2 mod 2', tickMs: 33, felles: true, realtid: true,
    d: 'Skub pucken i de andres mål – 1 mod 1 eller 2 mod 2. Først til 7.',
    start(H) {
      const ps = H.spillere();
      const kø = ps.map((p, i) => { const h = holdAf(i), n = ps.filter((_, j) => holdAf(j) === h && j < i).length, mange = ps.filter((_, j) => holdAf(j) === h).length;
        const x = mange > 1 ? (n ? AW * .72 : AW * .28) : AW / 2, y = h === 'A' ? AH - 12 : 12; return { e: p.enhed, hold: h, x, y, mx: x, my: y, vx: 0, vy: 0 }; });
      const G = { fase: 'nedtæl', t: NEDTÆL, køller: kø, score: { A: 0, B: 0 }, mål: 0, slag: 0, vinder: null };
      nyPuk(G); return G;
    },
    kald(H, G, e, d) {
      const k = G.køller.find(x => x.e === e); if (!k || !d.m) return;
      k.mx = Math.max(KØLLE, Math.min(AW - KØLLE, +d.m[0] || 0)); k.my = +d.m[1] || 0;
    },
    tick(H, G) {
      const dt = .033;
      if (G.fase === 'slut') return false;
      if (G.fase === 'nedtæl') { G.t -= 33; if (G.t <= 0) G.fase = 'spil'; return true; }
      // køller: følg fingeren med max fart, kun på egen halvdel
      G.køller.forEach(k => {
        const lo = k.hold === 'A' ? AH / 2 + KØLLE : KØLLE, hi = k.hold === 'A' ? AH - KØLLE : AH / 2 - KØLLE;
        const tx = k.mx, ty = Math.max(lo, Math.min(hi, k.my)), dx = tx - k.x, dy = ty - k.y, d = Math.hypot(dx, dy), m = KFART * dt;
        const nx = d > m ? k.x + dx / d * m : tx, ny = d > m ? k.y + dy / d * m : ty;
        k.vx = (nx - k.x) / dt; k.vy = (ny - k.y) / dt; k.x = nx; k.y = ny;
      });
      if (G.pause > 0) { G.pause -= 33; return true; }
      const p = G.puk, SUB = 4, sdt = dt / SUB;
      for (let s = 0; s < SUB; s++) {
        p.x += p.vx * sdt; p.y += p.vy * sdt;
        if (p.x < PUK) { p.x = PUK; p.vx = Math.abs(p.vx) * .9; } if (p.x > AW - PUK) { p.x = AW - PUK; p.vx = -Math.abs(p.vx) * .9; }
        const iMål = Math.abs(p.x - AW / 2) < MÅL / 2 - PUK * .3;
        if (p.y < PUK && !iMål) { p.y = PUK; p.vy = Math.abs(p.vy) * .9; } if (p.y > AH - PUK && !iMål) { p.y = AH - PUK; p.vy = -Math.abs(p.vy) * .9; }
        if (p.y < -PUK * 1.5 || p.y > AH + PUK * 1.5) {
          const scorer = p.y < 0 ? 'A' : 'B'; G.score[scorer]++; G.mål++; G.sidsteMål = scorer;
          if (G.score[scorer] >= TIL) { G.fase = 'slut'; G.vinder = scorer; G.køller.filter(k => k.hold === scorer).forEach(k => H.giv(k.e, 3)); return true; }
          nyPuk(G, scorer === 'A' ? 'B' : 'A'); return true;
        }
        G.køller.forEach(k => {
          const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy), m = PUK + KØLLE;
          if (d < m && d > 0) {
            const nx = dx / d, ny = dy / d; p.x = k.x + nx * m; p.y = k.y + ny * m;
            const rvx = p.vx - k.vx, rvy = p.vy - k.vy, dot = rvx * nx + rvy * ny;
            if (dot < 0) { p.vx -= 1.9 * dot * nx; p.vy -= 1.9 * dot * ny; G.slag++; }
          }
        });
        const v = Math.hypot(p.vx, p.vy); if (v > MAXV) { p.vx *= MAXV / v; p.vy *= MAXV / v; }
      }
      p.vx *= .996; p.vy *= .996;
      return true;
    },
    frakoblet(H, G, e) { const k = G.køller.find(x => x.e === e); if (k) { k.mx = AW / 2; k.my = k.hold === 'A' ? AH - 8 : 8; } },
    skiftEnhed(H, G, gl, ny) { G.køller.forEach(k => { if (k.e === gl) k.e = ny; }); },
    view(H, G) {
      const r = n => Math.round(n * 10) / 10;
      return { fase: G.fase, t: G.t, puk: [r(G.puk.x), r(G.puk.y)], k: G.køller.map(k => [k.e, k.hold, r(k.x), r(k.y)]), score: G.score, mål: G.mål, sidsteMål: G.sidsteMål || null, slag: G.slag,
        slut: G.fase === 'slut' ? { vinder: G.vinder } : null, vinder: G.vinder };
    },
    tegn(el, v, api) {
      el._v = v;   // til fejlfinding
      const mit = (v.k.find(k => k[0] === api.mig) || [0, 'A'])[1], vend = mit === 'B';   // hold B ser bordet drejet 180°
      if (!el.querySelector('#ah-cv')) {
        el.innerHTML = '<div class="ak-ban"></div><canvas id="ah-cv" width="600" height="1000" style="width:auto;height:auto;max-width:100%;max-height:72vh;display:block;margin:0 auto;border-radius:22px;touch-action:none"></canvas>'
          + '<p class="hint center" style="margin:8px 0 0">👆 Træk din kølle rundt på din egen halvdel</p>';
        const cv = el.querySelector('#ah-cv');
        fingerStyring(cv, (fx, fy) => { let x = fx * AW, y = fy * AH; if (el._vend) { x = AW - x; y = AH - y; } return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]; },
          p => api.kald({ m: p }), p => { el._lokal = p; });
      }
      el._vend = vend;
      const holdNavn = x => v.k.filter(k => k[1] === x).map(k => esc(api.navn(k[0]))).join(' + ');
      ban(el, v.fase === 'nedtæl' ? '<div class="banner min" style="font-size:26px">' + Math.max(1, Math.ceil(v.t / 1000)) + '</div>'
        : v.slut ? '<div class="banner min">🏆 ' + holdNavn(v.vinder) + ' vandt ' + v.score[v.vinder] + '–' + v.score[v.vinder === 'A' ? 'B' : 'A'] + '!</div>'
        : '<div class="banner' + (v.score[mit] >= v.score[mit === 'A' ? 'B' : 'A'] ? ' min' : '') + '">' + holdNavn(mit) + ' ' + v.score[mit] + ' – ' + v.score[mit === 'A' ? 'B' : 'A'] + ' ' + holdNavn(mit === 'A' ? 'B' : 'A') + '</div>');
      if (el._mål !== v.mål) { if (el._mål != null) { v.sidsteMål === mit ? api.lyd.vind() : api.lyd.fejl(); api.vib(v.sidsteMål === mit ? 60 : [40, 40, 40]); } el._mål = v.mål; }
      if (el._slag !== v.slag) { if (el._slag != null) api.lyd.klik(); el._slag = v.slag; }
      const cv = el.querySelector('#ah-cv'), c = cv.getContext('2d'), s = cv.width / AW;
      const P = (x, y) => vend ? [(AW - x) * s, (AH - y) * s] : [x * s, y * s];
      // bord
      let g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#dff3ff'); g.addColorStop(1, '#bfe3ff');
      c.fillStyle = '#0b1630'; c.fillRect(0, 0, cv.width, cv.height);
      c.fillStyle = g; c.beginPath(); c.roundRect(8, 8, cv.width - 16, cv.height - 16, 40); c.fill();
      c.strokeStyle = 'rgba(58,134,255,.25)'; c.lineWidth = 2; for (let i = 1; i < 12; i++) for (let j = 1; j < 20; j++) { c.fillStyle = 'rgba(58,134,255,.18)'; c.fillRect(i * 50 - 1, j * 50 - 1, 2, 2); }   // lufthuller
      c.strokeStyle = '#ef476f'; c.lineWidth = 6; c.beginPath(); c.moveTo(8, cv.height / 2); c.lineTo(cv.width - 8, cv.height / 2); c.stroke();
      c.beginPath(); c.arc(cv.width / 2, cv.height / 2, 90, 0, 7); c.stroke();
      c.strokeStyle = '#3a86ff'; [[cv.height - 8, 1], [8, -1]].forEach(([y, d]) => { c.beginPath(); c.arc(cv.width / 2, y, MÅL / 2 * s + 30, d > 0 ? Math.PI : 0, d > 0 ? 0 : Math.PI); c.stroke(); });
      // mål (eget nederst = blåt, de andres øverst = rødt)
      [['#3a86ff', cv.height - 14], ['#ef476f', 0]].forEach(([f, y]) => { c.fillStyle = f; c.shadowColor = f; c.shadowBlur = 18; c.fillRect(cv.width / 2 - MÅL / 2 * s, y, MÅL * s, 14); c.shadowBlur = 0; });
      // køller
      v.k.forEach(([e, hold, x, y]) => {
        const [px, py] = P(x, y), f = api.farve(e), r = KØLLE * s;
        c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(px + 4, py + 6, r, 0, 7); c.fill();
        g = c.createRadialGradient(px - r * .3, py - r * .3, 2, px, py, r); g.addColorStop(0, '#fff'); g.addColorStop(.25, f); g.addColorStop(1, f);
        c.fillStyle = g; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(px, py, r * .42, 0, 7); c.fill();
        if (e === api.mig) { c.strokeStyle = '#ffd166'; c.lineWidth = 5; c.beginPath(); c.arc(px, py, r + 6, 0, 7); c.stroke(); }
        c.fillStyle = '#0b1630'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText(api.navn(e), px, py - r - 12);
      });
      // puck
      const [qx, qy] = P(v.puk[0], v.puk[1]), qr = PUK * s;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(qx + 3, qy + 5, qr, 0, 7); c.fill();
      c.fillStyle = '#14141a'; c.beginPath(); c.arc(qx, qy, qr, 0, 7); c.fill(); c.strokeStyle = '#3a3a48'; c.lineWidth = 4; c.beginPath(); c.arc(qx, qy, qr * .62, 0, 7); c.stroke();
    },
  });

  /* ==================== STJERNEVÆRN (co-op) ====================
   * Alle styrer et lille rumskib nederst (træk sideværts – skuddene går af sig selv) og forsvarer sammen mod bølger
   * af rumvæsner, der svinger frem og tilbage og rykker nedad. Holdet har 5 fælles liv. En faldende ⭐ giver
   * dobbelt- og hurtigskud i 8 sek. Spillet slutter, når livene er brugt, eller rumvæsnerne når jorden.
   * Point i stillingen: +1 pr. klaret bølge til alle, +2 til den med flest træffere.
   * 18/11-2026: skud hvert 0,62 s (0,24 med ⭐), fjendeskud og fart skruet op – første test var for nem (18 af 21 væk på 9 s uden at flytte sig). */
  const SW = 100, SH = 140, SKIB_Y = 130, SKIB_FART = 95, SKUD_FART = 120, FJ_FART = 46, LIV = 5;
  function nyBølge(G) {
    G.bølge++; const rk = Math.min(5, 2 + Math.ceil(G.bølge / 2)), kol = 7;
    G.fjender = []; for (let r = 0; r < rk; r++) for (let k = 0; k < kol; k++) G.fjender.push({ x: 16 + k * 11, y: 14 + r * 9, type: r % 3, liv: r === 0 && G.bølge > 2 ? 2 : 1 });
    G.retning = 1; G.fart = 9 + G.bølge * 2.6; G.fjSkud = []; G.pauseBølge = 0;
  }
  BS.registrer({
    id: 'stjernevaern', navn: 'Stjerneværn', e: '🛸', min: 1, max: 4, spillertekst: 'co-op', tickMs: 33, felles: true, realtid: true,
    d: 'Co-op: forsvar jorden sammen mod bølger af rumvæsner. Træk for at flytte – skuddene går af sig selv.',
    start(H) {
      const ps = H.spillere();
      const G = { fase: 'nedtæl', t: NEDTÆL, skibe: ps.map((p, i) => ({ e: p.enhed, x: (i + .5) * SW / ps.length, mx: (i + .5) * SW / ps.length, cd: 0, inv: 0, kraft: 0, ramt: 0 })),
        skud: [], fjSkud: [], fjender: [], liv: LIV, bølge: 0, stjerne: null, næsteStjerne: 9 + Math.random() * 6, bang: 0, tab: 0, slut: null };
      nyBølge(G); return G;
    },
    kald(H, G, e, d) { const s = G.skibe.find(x => x.e === e); if (s && d.x != null) s.mx = Math.max(4, Math.min(SW - 4, +d.x || 0)); },
    tick(H, G) {
      const dt = .033;
      if (G.fase === 'slut') return false;
      if (G.fase === 'nedtæl') { G.t -= 33; if (G.t <= 0) G.fase = 'spil'; return true; }
      // skibe + automatiske skud
      G.skibe.forEach(s => {
        const d = s.mx - s.x, m = SKIB_FART * dt; s.x += Math.abs(d) > m ? Math.sign(d) * m : d;
        s.inv = Math.max(0, s.inv - dt); s.kraft = Math.max(0, s.kraft - dt); s.cd -= dt;
        if (s.cd <= 0 && !G.pauseBølge) { s.cd = s.kraft ? .24 : .62; (s.kraft ? [-2.2, 2.2] : [0]).forEach(o => G.skud.push({ x: s.x + o, y: SKIB_Y - 4, e: s.e })); }
      });
      G.skud = G.skud.filter(b => { b.y -= SKUD_FART * dt; if (b.y < -2) return false;
        for (const f of G.fjender) if (f.liv > 0 && Math.abs(f.x - b.x) < 4.2 && Math.abs(f.y - b.y) < 3.6) { f.liv--; if (f.liv <= 0) { G.bang++; const s = G.skibe.find(x => x.e === b.e); if (s) s.ramt++; } return false; }
        return true; });
      G.fjender = G.fjender.filter(f => f.liv > 0);
      // formationen svinger og rykker ned ved kanten
      if (!G.pauseBølge && G.fjender.length) {
        const fart = G.fart * (1 + (35 - G.fjender.length) / 40);
        G.fjender.forEach(f => { f.x += G.retning * fart * dt; });
        const minX = Math.min(...G.fjender.map(f => f.x)), maxX = Math.max(...G.fjender.map(f => f.x));
        if ((G.retning > 0 && maxX > SW - 5) || (G.retning < 0 && minX < 5)) { G.retning *= -1; G.fjender.forEach(f => { f.y += 3.5; }); }
        if (Math.random() < .026 + G.bølge * .007) { const f = G.fjender[Math.floor(Math.random() * G.fjender.length)]; G.fjSkud.push({ x: f.x, y: f.y + 3 }); }
        if (Math.max(...G.fjender.map(f => f.y)) > SKIB_Y - 8) { G.liv = 0; }
      }
      G.fjSkud = G.fjSkud.filter(b => { b.y += FJ_FART * dt; if (b.y > SH) return false;
        for (const s of G.skibe) if (!s.inv && Math.abs(s.x - b.x) < 4 && Math.abs(SKIB_Y - b.y) < 3.5) { s.inv = 2; G.liv--; G.tab++; return false; }
        return true; });
      // stjerne (kraft): falder ned et tilfældigt sted
      G.næsteStjerne -= dt;
      if (!G.stjerne && G.næsteStjerne <= 0) { G.stjerne = { x: 8 + Math.random() * (SW - 16), y: 0 }; G.næsteStjerne = 12 + Math.random() * 8; }
      if (G.stjerne) { G.stjerne.y += 30 * dt; const s = G.skibe.find(x => Math.abs(x.x - G.stjerne.x) < 5 && Math.abs(SKIB_Y - G.stjerne.y) < 5); if (s) { s.kraft = 8; G.stjerne = null; G.kraftN = (G.kraftN || 0) + 1; } else if (G.stjerne.y > SH) G.stjerne = null; }
      // bølge klaret / slut
      if (!G.fjender.length) { if (!G.pauseBølge) G.pauseBølge = 2; G.pauseBølge -= dt; if (G.pauseBølge <= 0) { G.klaret = G.bølge; nyBølge(G); } }
      if (G.liv <= 0) {
        G.fase = 'slut'; const klaret = G.bølge - (G.fjender.length ? 1 : 0); G.slut = { bølger: klaret };
        G.skibe.forEach(s => H.giv(s.e, klaret)); const top = G.skibe.slice().sort((a, b) => b.ramt - a.ramt)[0]; if (top && top.ramt > 0) { H.giv(top.e, 2); G.slut.top = top.e; }
      }
      return true;
    },
    frakoblet(H, G, e) { const s = G.skibe.find(x => x.e === e); if (s) s.inv = 999; },
    skiftEnhed(H, G, gl, ny) { G.skibe.forEach(s => { if (s.e === gl) { s.e = ny; s.inv = 2; } }); G.skud.forEach(b => { if (b.e === gl) b.e = ny; }); },
    view(H, G) {
      const r = n => Math.round(n * 10) / 10;
      return { fase: G.fase, t: G.t, liv: G.liv, bølge: G.bølge, pause: G.pauseBølge > 0, bang: G.bang, tab: G.tab, kraftN: G.kraftN || 0,
        s: G.skibe.map(s => [s.e, r(s.x), s.inv > 0 && s.inv < 900 ? 1 : 0, s.kraft > 0 ? 1 : 0, s.ramt]),
        b: G.skud.map(b => [r(b.x), r(b.y)]), fb: G.fjSkud.map(b => [r(b.x), r(b.y)]), f: G.fjender.map(f => [r(f.x), r(f.y), f.type, f.liv]),
        st: G.stjerne ? [r(G.stjerne.x), r(G.stjerne.y)] : null, slut: G.slut };
    },
    tegn(el, v, api) {
      el._v = v;
      if (!el.querySelector('#sv-cv')) {
        el.innerHTML = '<div class="ak-ban"></div><canvas id="sv-cv" width="600" height="840" style="width:auto;height:auto;max-width:100%;max-height:72vh;display:block;margin:0 auto;border-radius:18px;touch-action:none"></canvas>'
          + '<p class="hint center" style="margin:8px 0 0">👆 Træk til siden for at flytte dit skib – skuddene går af sig selv · fang ⭐</p>';
        const cv = el.querySelector('#sv-cv');
        fingerStyring(cv, fx => Math.round(fx * SW * 10) / 10, x => api.kald({ x }), () => {});
        el._stj = Array.from({ length: 70 }, (_, i) => [((i * 97) % 600), ((i * 211) % 840), 1 + (i % 3)]);
      }
      ban(el, v.fase === 'nedtæl' ? '<div class="banner min" style="font-size:26px">' + Math.max(1, Math.ceil(v.t / 1000)) + '</div>'
        : v.slut ? '<div class="banner" style="background:#ef476f;color:#fff">💥 Jorden faldt efter ' + v.slut.bølger + ' bølger' + (v.slut.top ? ' · bedste skytte: ' + esc(api.navn(v.slut.top)) : '') + '</div>'
        : '<div class="banner min">🛸 Bølge ' + v.bølge + ' · ' + '❤️'.repeat(Math.max(0, v.liv)) + '</div>');
      if (el._bang !== v.bang) { if (el._bang != null) api.lyd.klik(); el._bang = v.bang; }
      if (el._tab !== v.tab) { if (el._tab != null) { api.lyd.ram(); } el._tab = v.tab; }
      if (el._kraft !== v.kraftN) { if (el._kraft != null) api.lyd.ok(); el._kraft = v.kraftN; }
      if (v.slut && !el._slut) { el._slut = 1; api.lyd.død(); }
      const cv = el.querySelector('#sv-cv'), c = cv.getContext('2d'), k = cv.width / SW, nu = performance.now();
      const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#05061a'); g.addColorStop(1, '#1b1046'); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      el._stj.forEach(([x, y, z]) => { c.fillStyle = 'rgba(255,255,255,' + (.25 + z * .2) + ')'; c.fillRect(x, (y + nu / (60 / z)) % cv.height, z, z); });
      // jorden nederst
      c.fillStyle = '#1f6f5c'; c.beginPath(); c.ellipse(cv.width / 2, cv.height + 260, cv.width, 300, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(6,214,160,.25)'; c.fillRect(0, (SKIB_Y - 8) * k, cv.width, 2);
      // rumvæsner (egne tegninger: runde væsner med antenner og øjne)
      const FARVE = ['#ef476f', '#ffd166', '#06d6a0'];
      v.f.forEach(([x, y, type, liv]) => {
        const px = x * k, py = y * k, vip = Math.sin(nu / 220 + x) * 2, f = FARVE[type];
        c.strokeStyle = f; c.lineWidth = 3; c.beginPath(); c.moveTo(px - 8, py - 12); c.lineTo(px - 12, py - 22 + vip); c.moveTo(px + 8, py - 12); c.lineTo(px + 12, py - 22 - vip); c.stroke();
        c.fillStyle = f; c.beginPath(); c.arc(px - 12, py - 22 + vip, 3.5, 0, 7); c.arc(px + 12, py - 22 - vip, 3.5, 0, 7); c.fill();
        c.beginPath(); c.ellipse(px, py, 17, 13, 0, 0, 7); c.fill();
        for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(px + i * 9, py + 12, 4, 5 + (i === 0 ? vip : -vip) * .6, 0, 0, 7); c.fill(); }
        c.fillStyle = '#fff'; c.beginPath(); c.arc(px - 6, py - 2, 5, 0, 7); c.arc(px + 6, py - 2, 5, 0, 7); c.fill();
        c.fillStyle = '#14213d'; c.beginPath(); c.arc(px - 5, py - 1, 2.4, 0, 7); c.arc(px + 7, py - 1, 2.4, 0, 7); c.fill();
        if (liv > 1) { c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py, 20, 16, 0, 0, 7); c.stroke(); }
      });
      // skud
      c.fillStyle = '#9fe3ff'; c.shadowColor = '#9fe3ff'; c.shadowBlur = 8; v.b.forEach(([x, y]) => c.fillRect(x * k - 2, y * k - 9, 4, 14));
      c.fillStyle = '#ff6b3d'; c.shadowColor = '#ff6b3d'; v.fb.forEach(([x, y]) => { c.beginPath(); c.arc(x * k, y * k, 5, 0, 7); c.fill(); }); c.shadowBlur = 0;
      // stjerne (kraft)
      if (v.st) { c.font = '34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('⭐', v.st[0] * k, v.st[1] * k + Math.sin(nu / 150) * 3); }
      // skibe
      v.s.forEach(([e, x, inv, kraft, ramt]) => {
        const px = x * k, py = SKIB_Y * k, f = api.farve(e);
        if (inv && Math.floor(nu / 120) % 2) return;
        c.fillStyle = 'rgba(255,170,60,.85)'; c.beginPath(); c.moveTo(px - 6, py + 16); c.lineTo(px, py + 26 + Math.random() * 8); c.lineTo(px + 6, py + 16); c.fill();   // flamme
        c.fillStyle = f; c.beginPath(); c.moveTo(px, py - 20); c.quadraticCurveTo(px + 12, py - 4, px + 10, py + 16); c.lineTo(px - 10, py + 16); c.quadraticCurveTo(px - 12, py - 4, px, py - 20); c.fill();
        c.beginPath(); c.moveTo(px - 9, py + 4); c.lineTo(px - 20, py + 18); c.lineTo(px - 9, py + 16); c.moveTo(px + 9, py + 4); c.lineTo(px + 20, py + 18); c.lineTo(px + 9, py + 16); c.fill();
        c.fillStyle = '#e9f6ff'; c.beginPath(); c.arc(px, py - 4, 5, 0, 7); c.fill();
        if (kraft) { c.strokeStyle = '#ffd166'; c.lineWidth = 3; c.beginPath(); c.arc(px, py, 26 + Math.sin(nu / 100) * 2, 0, 7); c.stroke(); }
        if (e === api.mig) { c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(px, py + 34); c.lineTo(px - 7, py + 44); c.lineTo(px + 7, py + 44); c.fill(); }
        c.fillStyle = '#fff'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(api.navn(e) + ' · ' + ramt, px, py - 28);
      });
      if (v.pause && !v.slut) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, cv.height / 2 - 50, cv.width, 100); c.fillStyle = '#ffd166'; c.font = '900 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(BS.t('Bølge klaret!'), cv.width / 2, cv.height / 2); }
    },
  });
})();
