/* Blå skæg – realtidsspil: Snake, Lysbaner og Diskos-arena (2-4 spillere).
 * Værtens telefon kører spillet (fysik, kollisioner) og sender tilstanden ud mange gange i sekundet.
 * De andre telefoner sender kun styring (retning / joystick / kast). Sidste overlevende får +3. */
(function () {
  const { esc, rnd } = BS;
  const RET = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  const NEDTÆL = 3000;

  /* ---------- fælles: styring (swipe, piletaster, knapper) til gitter-spil ---------- */
  function gitterStyring(el, api) {
    if (el._styr) return; el._styr = true;
    const send = r => { api.kald({ r }); api.vib(8); };
    const tast = e => { const k = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r' }[e.key]; if (k && el.isConnected) { e.preventDefault(); send(k); } };
    document.addEventListener('keydown', tast);
    const cv = el.querySelector('canvas'); let sx = 0, sy = 0;
    cv.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    cv.addEventListener('pointerup', e => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return; send(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u')); });
    el.querySelectorAll('[data-r]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); send(b.dataset.r); }));
  }
  const PAD = '<div class="pad"><span></span><button data-r="u">▲</button><span></span><button data-r="l">◀</button><button data-r="d">▼</button><button data-r="r">▶</button></div>'
    + '<p class="hint center" style="margin:6px 0 0">Swipe på banen eller brug pilene</p>';
  function statusLinje(v, api, ord) {
    if (v.fase === 'nedtæl') return '<div class="banner min" style="font-size:26px">' + Math.max(1, Math.ceil(v.t / 1000)) + '</div>';
    if (v.fase === 'slut') return '<div class="banner min">' + (v.vinder ? '🏆 ' + esc(api.navn(v.vinder)) + ' vandt!' : '🤝 Uafgjort – alle røg ud') + '</div>';
    const mig = (v.sp || []).find(s => s.e === api.mig);
    return '<div class="banner' + (mig && mig.liv ? ' min' : '') + '">' + (mig ? (mig.liv ? ord : '💀 Du er ude – se med') : '👀 Du ser med') + '</div>';
  }
  function bannerOpdater(el, html) { const b = el.querySelector('.rt-ban'); if (b && b._h !== html) { b._h = html; b.innerHTML = html; } }
  function slutTjek(H, G, min) {
    const levende = G.sp.filter(s => s.liv);
    if (levende.length <= min) {
      G.fase = 'slut'; G.vinder = levende.length === 1 && G.sp.length > 1 ? levende[0].e : (G.sp.length === 1 ? null : null);
      if (G.vinder) H.giv(G.vinder, 3);
      return true;
    }
    return false;
  }
  const startPos = (n, w, h) => [[3, 3, 'r'], [w - 4, h - 4, 'l'], [w - 4, 3, 'd'], [3, h - 4, 'u']].slice(0, n);
  const farveAf = (api, e) => api.farve(e);

  /* ==================== SNAKE ====================
   * 17/11-2026: lavet om til fælles kamp på tid (Michael: «spiller kun én ad gangen»).
   * Før sluttede runden, så snart én slange døde – med 2 spillere varede et spil få sekunder.
   * Nu: 2 minutter, alle spiller hele tiden, død = tilbage efter 3 sek. Æble +1, en anden kører ind i dig +2.
   * Flest point, når tiden er gået, vinder (+3 i stillingen). */
  const SW = 28, SH = 28, SNAKE_TID = (/[?&]kort=1/.test(location.search) ? 20000 : 120000), GENFØD = 3000, STEP = 120;
  function nyMad(G) {
    const opt = new Set(); G.sp.forEach(s => s.krop.forEach(([x, y]) => opt.add(x + ',' + y))); G.mad.forEach(([x, y]) => opt.add(x + ',' + y));
    for (let t = 0; t < 200; t++) { const x = rnd(SW), y = rnd(SH); if (!opt.has(x + ',' + y)) { G.mad.push([x, y]); return; } }
  }
  function placer(G, s, fast) {
    const opt = new Set(); G.sp.forEach(o => o.krop.forEach(([x, y]) => opt.add(x + ',' + y)));
    for (let t = 0; t < 300; t++) {
      const [x, y, r] = fast && t === 0 ? fast : [3 + rnd(SW - 6), 3 + rnd(SH - 6), 'udlr'[rnd(4)]];
      const [dx, dy] = RET[r], krop = [[x, y], [x - dx, y - dy], [x - 2 * dx, y - 2 * dy]];
      const frit = krop.every(([a, b]) => a >= 0 && b >= 0 && a < SW && b < SH && !opt.has(a + ',' + b))
        && [1, 2, 3, 4].every(k => { const a = x + dx * k, b = y + dy * k; return a >= 0 && b >= 0 && a < SW && b < SH && !opt.has(a + ',' + b); });
      if (frit) { Object.assign(s, { krop, ret: r, kø: [], liv: true, vækst: 0, gen: 0 }); return; }
    }
  }
  BS.registrer({
    id: 'snake', navn: 'Snake', e: '🐍', min: 1, max: 4, tickMs: STEP, felles: true,
    d: 'Alle kører samtidig i 2 minutter. Spis æbler – flest point vinder.',
    start(H) {
      const ps = H.spillere(), pos = startPos(ps.length, SW, SH);
      const G = { fase: 'nedtæl', t: NEDTÆL, tid: SNAKE_TID, mad: [], vinder: null, score: {}, sp: [] };
      ps.forEach((p, i) => { const s = { e: p.enhed, krop: [] }; G.sp.push(s); G.score[p.enhed] = 0; placer(G, s, pos[i]); });
      for (let i = 0; i < 6; i++) nyMad(G);
      return G;
    },
    kald(H, G, e, d) {
      const s = G.sp.find(x => x.e === e); if (!s || !s.liv || !RET[d.r]) return;
      const sidste = s.kø.length ? s.kø[s.kø.length - 1] : s.ret;
      const [a, b] = RET[sidste], [c, dd] = RET[d.r];
      if (a + c === 0 && b + dd === 0) return; if (d.r === sidste) return;
      if (s.kø.length < 3) s.kø.push(d.r);
    },
    tick(H, G) {
      if (G.fase === 'slut') return false;
      if (G.fase === 'nedtæl') { G.t -= STEP; if (G.t <= 0) G.fase = 'kører'; return true; }
      G.tid -= STEP;
      /* døde slanger kommer tilbage efter 3 sekunder (kun spillere, der stadig er med) */
      G.sp.forEach(s => { if (!s.liv && !s.ude) { s.gen -= STEP; if (s.gen <= 0) placer(G, s); } });
      const levende = G.sp.filter(s => s.liv);
      levende.forEach(s => { if (s.kø.length) s.ret = s.kø.shift(); const [dx, dy] = RET[s.ret]; s.ny = [s.krop[0][0] + dx, s.krop[0][1] + dy]; });
      levende.forEach(s => { const i = G.mad.findIndex(([x, y]) => x === s.ny[0] && y === s.ny[1]); if (i >= 0) { G.mad.splice(i, 1); s.vækst += 2; G.score[s.e] = (G.score[s.e] || 0) + 1; G.ædt = (G.ædt || 0) + 1; if (G.mad.length < 6) nyMad(G); } });
      levende.forEach(s => { s.krop.unshift(s.ny); if (s.vækst > 0) s.vækst--; else s.krop.pop(); });
      const ejer = {}; G.sp.forEach(s => s.krop.forEach(([x, y], i) => { const k = x + ',' + y; (ejer[k] = ejer[k] || []).push(s); }));
      const døde = levende.filter(s => { const [x, y] = s.krop[0]; return x < 0 || y < 0 || x >= SW || y >= SH || ejer[x + ',' + y].length > 1; });
      døde.forEach(s => {
        const [x, y] = s.krop[0], ramt = (ejer[x + ',' + y] || []).find(o => o !== s);
        if (ramt && !døde.includes(ramt)) G.score[ramt.e] = (G.score[ramt.e] || 0) + 2;     // en anden kørte ind i dig: +2
        s.krop.forEach(([a, b], i) => { if (i % 2 === 0 && a >= 0 && b >= 0 && a < SW && b < SH) G.mad.push([a, b]); });
        Object.assign(s, { liv: false, krop: [], gen: GENFØD }); G.død = (G.død || 0) + 1;
      });
      if (G.tid <= 0) {
        G.fase = 'slut'; const top = Math.max(...Object.values(G.score).concat([0]));
        const vindere = Object.keys(G.score).filter(e => G.score[e] === top && top > 0);
        G.vinder = vindere.length === 1 ? vindere[0] : null; G.vindere = vindere;
        vindere.forEach(e => H.giv(e, 3));
      }
      return true;
    },
    frakoblet(H, G, e) { const s = G.sp.find(x => x.e === e); if (s) { s.liv = false; s.krop = []; s.ude = true; } },
    skiftEnhed(H, G, gl, ny) { G.sp.forEach(s => { if (s.e === gl) { s.e = ny; s.ude = false; } }); if (gl in G.score) { G.score[ny] = G.score[gl]; delete G.score[gl]; } if (G.vinder === gl) G.vinder = ny; },
    view(H, G) {
      return { fase: G.fase, t: G.t, tid: Math.max(0, G.tid), mad: G.mad, vinder: G.vinder, vindere: G.vindere || [], score: G.score, død: G.død || 0, ædt: G.ædt || 0,
        sp: G.sp.map(s => ({ e: s.e, krop: s.krop, liv: s.liv, gen: s.liv ? 0 : Math.max(0, s.gen || 0) })), slut: G.fase === 'slut' ? { vinder: G.vinder } : null };
    },
    tegn(el, v, api) {
      if (!el.querySelector('#sn-cv')) {
        el.innerHTML = '<div class="rt-ban"></div><div id="sn-score" class="chips" style="justify-content:center;margin:0 0 8px"></div>'
          + '<canvas id="sn-cv" width="560" height="560" style="width:100%;aspect-ratio:1;border-radius:14px"></canvas>' + PAD;
        gitterStyring(el, api);
      }
      const mig = v.sp.find(s => s.e === api.mig), ur = Math.ceil(v.tid / 1000), mmss = Math.floor(ur / 60) + ':' + String(ur % 60).padStart(2, '0');
      let ban;
      if (v.fase === 'nedtæl') ban = '<div class="banner min" style="font-size:26px">' + Math.max(1, Math.ceil(v.t / 1000)) + '</div>';
      else if (v.fase === 'slut') ban = '<div class="banner min">⏱ Tiden er gået – ' + (v.vindere.length === 1 ? '🏆 ' + esc(api.navn(v.vindere[0])) + ' vandt!' : v.vindere.length ? '🤝 Uafgjort: ' + v.vindere.map(e => esc(api.navn(e))).join(' og ') : 'ingen point') + '</div>';
      else if (mig && !mig.liv) ban = '<div class="banner">💀 Du er tilbage om ' + Math.max(1, Math.ceil(mig.gen / 1000)) + ' … · ⏱ ' + mmss + '</div>';
      else ban = '<div class="banner' + (mig ? ' min' : '') + '">🐍 ⏱ ' + mmss + ' · spis æbler!</div>';
      bannerOpdater(el, ban);
      const sc = el.querySelector('#sn-score'), sh = v.sp.slice().sort((a, b) => (v.score[b.e] || 0) - (v.score[a.e] || 0))
        .map(s => '<span class="chip' + (s.e === api.mig ? ' mig' : '') + '"><i style="background:' + farveAf(api, s.e) + '"></i>' + esc(api.navn(s.e)) + ' ' + (v.score[s.e] || 0) + '</span>').join('');
      if (sc._h !== sh) { sc._h = sh; sc.innerHTML = sh; }
      if (el._død !== v.død) { if (el._død != null) api.lyd.død(); el._død = v.død; }
      if (el._ædt !== v.ædt) { if (el._ædt != null) api.lyd.klik(); el._ædt = v.ædt; }
      const cv = el.querySelector('#sn-cv'), c = cv.getContext('2d'), k = cv.width / SW;
      c.fillStyle = '#0d1d40'; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = 'rgba(255,255,255,.04)'; for (let i = 1; i < SW; i++) { c.beginPath(); c.moveTo(i * k, 0); c.lineTo(i * k, cv.height); c.moveTo(0, i * k); c.lineTo(cv.width, i * k); c.stroke(); }
      v.mad.forEach(([x, y]) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x * k + k / 2, y * k + k / 2, k * .38, 0, Math.PI * 2); c.fill(); c.fillStyle = '#06d6a0'; c.fillRect(x * k + k * .48, y * k + k * .05, k * .12, k * .25); });
      v.sp.forEach(s => {
        const f = farveAf(api, s.e);
        s.krop.forEach(([x, y], i) => { c.fillStyle = f; c.globalAlpha = i === 0 ? 1 : .85 - Math.min(.4, i * .01); const p = i === 0 ? 1 : 2; c.fillRect(x * k + p, y * k + p, k - 2 * p, k - 2 * p); });
        c.globalAlpha = 1;
        if (s.krop[0]) { const [x, y] = s.krop[0]; c.fillStyle = '#0b1630'; c.beginPath(); c.arc(x * k + k * .35, y * k + k * .4, k * .1, 0, 7); c.arc(x * k + k * .65, y * k + k * .4, k * .1, 0, 7); c.fill(); }
      });
      if (v.fase === 'slut' && el._slut !== 'x') { el._slut = 'x'; v.vindere.includes(api.mig) ? api.lyd.vind() : api.lyd.fejl(); }
    },
  });

  /* ==================== LYSBANER ==================== */
  const LW = 72, LH = 72;
  BS.registrer({
    id: 'lysbaner', navn: 'Lysbaner', e: '🏍️', min: 2, max: 4, tickMs: 65, felles: true,
    d: 'Kør på lys-motorcykel og efterlad en mur. Ram ingen mure – sidste kører vinder.',
    start(H) {
      const ps = H.spillere(), pos = [[8, 8, 'r'], [LW - 9, LH - 9, 'l'], [LW - 9, 8, 'd'], [8, LH - 9, 'u']];
      const G = { fase: 'nedtæl', t: NEDTÆL, grid: new Uint8Array(LW * LH), vinder: null, sp: ps.map((p, i) => {
        const [x, y, r] = pos[i]; return { e: p.enhed, x, y, ret: r, kø: [], liv: true, pts: [[x, y]] }; }) };
      G.sp.forEach((s, i) => { G.grid[s.y * LW + s.x] = i + 1; });
      return G;
    },
    kald(H, G, e, d) {
      const s = G.sp.find(x => x.e === e); if (!s || !s.liv || !RET[d.r]) return;
      const sidste = s.kø.length ? s.kø[s.kø.length - 1] : s.ret, [a, b] = RET[sidste], [c, dd] = RET[d.r];
      if ((a + c === 0 && b + dd === 0) || d.r === sidste) return;
      if (s.kø.length < 2) s.kø.push(d.r);
    },
    tick(H, G) {
      if (G.fase === 'slut') return false;
      if (G.fase === 'nedtæl') { G.t -= 65; if (G.t <= 0) G.fase = 'kører'; return G.t % 260 < 65; }
      const lev = G.sp.filter(s => s.liv);
      lev.forEach(s => { if (s.kø.length) { const r = s.kø.shift(); if (r !== s.ret) { s.pts.push([s.x, s.y]); s.ret = r; } } const [dx, dy] = RET[s.ret]; s.nx = s.x + dx; s.ny = s.y + dy; });
      const hoveder = {}; lev.forEach(s => { const k = s.nx + ',' + s.ny; hoveder[k] = (hoveder[k] || 0) + 1; });
      lev.forEach(s => { s.dør = s.nx < 0 || s.ny < 0 || s.nx >= LW || s.ny >= LH || G.grid[s.ny * LW + s.nx] > 0 || hoveder[s.nx + ',' + s.ny] > 1; });
      lev.forEach(s => {
        if (s.dør) { s.liv = false; s.pts.push([s.x, s.y]); G.død = (G.død || 0) + 1; return; }
        s.x = s.nx; s.y = s.ny; G.grid[s.y * LW + s.x] = G.sp.indexOf(s) + 1;
      });
      slutTjek(H, G, 1);
      return true;
    },
    frakoblet(H, G, e) { const s = G.sp.find(x => x.e === e); if (s && s.liv && G.fase !== 'slut') { s.liv = false; } },
    skiftEnhed(H, G, gl, ny) { G.sp.forEach(s => { if (s.e === gl) s.e = ny; }); if (G.vinder === gl) G.vinder = ny; },
    view(H, G) { return { fase: G.fase, t: G.t, vinder: G.vinder, død: G.død || 0, sp: G.sp.map(s => ({ e: s.e, liv: s.liv, pts: s.pts, x: s.x, y: s.y })), slut: G.fase === 'slut' ? { vinder: G.vinder } : null }; },
    tegn(el, v, api) {
      if (!el.querySelector('#lb-cv')) { el.innerHTML = '<div class="rt-ban"></div><canvas id="lb-cv" width="576" height="576" style="width:100%;aspect-ratio:1;border-radius:14px"></canvas>' + PAD; gitterStyring(el, api); }
      bannerOpdater(el, statusLinje(v, api, '🏍️ Undgå murene!'));
      if (el._død !== v.død) { if (el._død != null) api.lyd.død(); el._død = v.død; }
      const cv = el.querySelector('#lb-cv'), c = cv.getContext('2d'), k = cv.width / LW;
      c.fillStyle = '#050b1c'; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = 'rgba(58,134,255,.12)'; c.lineWidth = 1;
      for (let i = 0; i <= LW; i += 6) { c.beginPath(); c.moveTo(i * k, 0); c.lineTo(i * k, cv.height); c.moveTo(0, i * k); c.lineTo(cv.width, i * k); c.stroke(); }
      v.sp.forEach(s => {
        const f = farveAf(api, s.e), pts = s.pts.concat(s.liv ? [[s.x, s.y]] : []);
        c.lineCap = 'square'; c.lineJoin = 'miter';
        c.shadowColor = f; c.shadowBlur = 12; c.strokeStyle = f; c.globalAlpha = s.liv ? 1 : .35; c.lineWidth = k * .7;
        c.beginPath(); pts.forEach(([x, y], i) => { const X = x * k + k / 2, Y = y * k + k / 2; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke();
        c.shadowBlur = 0; c.globalAlpha = 1;
        if (s.liv) { c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x * k + k / 2, s.y * k + k / 2, k * .65, 0, 7); c.fill(); }
      });
      if (v.fase === 'slut' && el._slut !== v.vinder + '') { el._slut = v.vinder + ''; v.vinder === api.mig ? api.lyd.vind() : api.lyd.fejl(); }
    },
  });

  /* ==================== DISKOS-ARENA ==================== */
  const AW = 100, AH = 70, PR = 2.6, DR = 1.1, FART = 26, DFART = 62, LIV = 3;
  const SØJLER = [{ x: 30, y: 35, r: 5.5 }, { x: 70, y: 35, r: 5.5 }, { x: 50, y: 14, r: 3.5 }, { x: 50, y: 56, r: 3.5 }];
  BS.registrer({
    id: 'diskos', navn: 'Diskos-arena', e: '🥏', min: 2, max: 4, tickMs: 33, felles: true,
    d: 'Kast lysende diske, der preller af væggene. Tre træffere, og du er ude.',
    start(H) {
      const ps = H.spillere(), pos = [[8, 8], [AW - 8, AH - 8], [AW - 8, 8], [8, AH - 8]];
      return { fase: 'nedtæl', t: NEDTÆL, vinder: null, diske: [], sp: ps.map((p, i) => ({ e: p.enhed, x: pos[i][0], y: pos[i][1], fx: i % 2 ? -1 : 1, fy: 0, jx: 0, jy: 0, liv: LIV, inv: 0, cd: 0 })) };
    },
    kald(H, G, e, d) {
      const s = G.sp.find(x => x.e === e); if (!s || s.liv <= 0) return;
      if (d.j) { let [x, y] = d.j.map(Number); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } s.jx = x || 0; s.jy = y || 0; if (l > .2) { s.fx = x / Math.max(l, 1e-6) * Math.min(1, l) / Math.min(1, l); s.fy = y / Math.max(l, 1e-6); const n = Math.hypot(s.fx, s.fy) || 1; s.fx /= n; s.fy /= n; } }
      if (d.kast && G.fase === 'kører' && s.cd <= 0 && !G.diske.some(x => x.e === e)) {
        G.diske.push({ e, x: s.x + s.fx * (PR + DR + .5), y: s.y + s.fy * (PR + DR + .5), vx: s.fx * DFART, vy: s.fy * DFART, b: 0, t: 0 }); s.cd = .35; G.kast = (G.kast || 0) + 1;
      }
    },
    tick(H, G) {
      const dt = .033;
      if (G.fase === 'slut') return false;
      if (G.fase === 'nedtæl') { G.t -= 33; if (G.t <= 0) G.fase = 'kører'; }
      G.sp.forEach(s => {
        if (s.liv <= 0) return; s.inv = Math.max(0, s.inv - dt); s.cd = Math.max(0, s.cd - dt);
        if (G.fase !== 'kører') return;
        s.x = Math.max(PR, Math.min(AW - PR, s.x + s.jx * FART * dt)); s.y = Math.max(PR, Math.min(AH - PR, s.y + s.jy * FART * dt));
        SØJLER.forEach(o => { const dx = s.x - o.x, dy = s.y - o.y, d = Math.hypot(dx, dy), m = o.r + PR; if (d < m && d > 0) { s.x = o.x + dx / d * m; s.y = o.y + dy / d * m; } });
      });
      G.diske = G.diske.filter(d => {
        d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.x < DR) { d.x = DR; d.vx = Math.abs(d.vx); d.b++; } if (d.x > AW - DR) { d.x = AW - DR; d.vx = -Math.abs(d.vx); d.b++; }
        if (d.y < DR) { d.y = DR; d.vy = Math.abs(d.vy); d.b++; } if (d.y > AH - DR) { d.y = AH - DR; d.vy = -Math.abs(d.vy); d.b++; }
        SØJLER.forEach(o => { const dx = d.x - o.x, dy = d.y - o.y, dist = Math.hypot(dx, dy), m = o.r + DR;
          if (dist < m) { const nx = dx / dist, ny = dy / dist, dot = d.vx * nx + d.vy * ny; if (dot < 0) { d.vx -= 2 * dot * nx; d.vy -= 2 * dot * ny; d.b++; } d.x = o.x + nx * m; d.y = o.y + ny * m; } });
        if (d.b > 3 || d.t > 3.2) return false;
        for (const s of G.sp) {
          if (s.liv <= 0 || s.inv > 0 || (s.e === d.e && d.t < .4)) continue;
          if (Math.hypot(s.x - d.x, s.y - d.y) < PR + DR) {
            if (s.e === d.e) return false;          // fanger sin egen disk
            s.liv--; s.inv = 1.2; G.ramt = (G.ramt || 0) + 1; H.giv(d.e, 1); return false;
          }
        }
        return true;
      });
      if (G.fase === 'kører') slutTjek(H, G, 1);
      return true;
    },
    frakoblet(H, G, e) { const s = G.sp.find(x => x.e === e); if (s) { s.liv = 0; } },
    skiftEnhed(H, G, gl, ny) { G.sp.forEach(s => { if (s.e === gl) s.e = ny; }); G.diske.forEach(d => { if (d.e === gl) d.e = ny; }); if (G.vinder === gl) G.vinder = ny; },
    view(H, G) {
      const r = n => Math.round(n * 10) / 10;
      return { fase: G.fase, t: G.t, vinder: G.vinder, ramt: G.ramt || 0, kast: G.kast || 0,
        sp: G.sp.map(s => ({ e: s.e, x: r(s.x), y: r(s.y), fx: r(s.fx), fy: r(s.fy), liv: s.liv > 0 ? s.liv : 0, inv: s.inv > 0 })),
        d: G.diske.map(d => [d.e, r(d.x), r(d.y)]), slut: G.fase === 'slut' ? { vinder: G.vinder } : null };
    },
    tegn(el, v, api) {
      if (!el.querySelector('#dk-cv')) {
        el.innerHTML = '<div class="rt-ban"></div><canvas id="dk-cv" width="700" height="490" style="width:100%;border-radius:14px"></canvas>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:12px">'
          + '<div id="dk-joy" style="width:150px;height:150px;border-radius:50%;background:#14244a;border:2px solid #2a4180;position:relative;touch-action:none;flex:0 0 150px"><div id="dk-knop" style="position:absolute;width:60px;height:60px;left:45px;top:45px;border-radius:50%;background:#3a86ff;pointer-events:none"></div></div>'
          + '<button id="dk-kast" class="btn" style="width:130px;height:130px;border-radius:50%;font-size:22px;background:#ff5d8f;flex:0 0 130px;touch-action:none">🥏<br>KAST</button></div>'
          + '<p class="hint center">Styr med den blå knap · tryk KAST · tastatur: WASD/pile + mellemrum</p>';
        diskStyring(el, api);
      }
      const mig = v.sp.find(s => s.e === api.mig);
      bannerOpdater(el, statusLinje({ fase: v.fase, t: v.t, vinder: v.vinder, sp: v.sp.map(s => ({ e: s.e, liv: s.liv > 0 })) }, api, '🥏 Du har ' + (mig ? '❤️'.repeat(mig.liv) : '') + ' tilbage'));
      if (el._ramt !== v.ramt) { if (el._ramt != null) api.lyd.ram(); el._ramt = v.ramt; }
      if (el._kast !== v.kast) { if (el._kast != null) api.lyd.klik(); el._kast = v.kast; }
      const cv = el.querySelector('#dk-cv'), c = cv.getContext('2d'), k = cv.width / AW;
      c.fillStyle = '#050b1c'; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = '#3a86ff'; c.lineWidth = 3; c.shadowColor = '#3a86ff'; c.shadowBlur = 12; c.strokeRect(2, 2, cv.width - 4, cv.height - 4);
      c.strokeStyle = 'rgba(58,134,255,.12)'; c.shadowBlur = 0; c.lineWidth = 1; for (let i = 10; i < AW; i += 10) { c.beginPath(); c.moveTo(i * k, 0); c.lineTo(i * k, cv.height); c.stroke(); } for (let i = 10; i < AH; i += 10) { c.beginPath(); c.moveTo(0, i * k); c.lineTo(cv.width, i * k); c.stroke(); }
      SØJLER.forEach(o => { c.beginPath(); c.arc(o.x * k, o.y * k, o.r * k, 0, 7); c.fillStyle = '#14244a'; c.fill(); c.strokeStyle = '#9fb0d6'; c.lineWidth = 2; c.stroke(); });
      v.sp.forEach(s => {
        if (s.liv <= 0) return; const f = farveAf(api, s.e);
        c.globalAlpha = s.inv ? .45 : 1; c.shadowColor = f; c.shadowBlur = 14;
        c.beginPath(); c.arc(s.x * k, s.y * k, PR * k, 0, 7); c.fillStyle = f; c.fill();
        c.shadowBlur = 0; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(s.x * k, s.y * k); c.lineTo((s.x + s.fx * PR * 1.4) * k, (s.y + s.fy * PR * 1.4) * k); c.stroke();
        c.globalAlpha = 1; c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText(api.navn(s.e) + ' ' + '♥'.repeat(s.liv), s.x * k, (s.y - PR - 1.2) * k);
      });
      v.d.forEach(([e, x, y]) => { const f = farveAf(api, e); c.shadowColor = f; c.shadowBlur = 16; c.beginPath(); c.arc(x * k, y * k, DR * k * 1.3, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = f; c.stroke(); c.shadowBlur = 0; });
      if (v.fase === 'slut' && el._slut !== v.vinder + '') { el._slut = v.vinder + ''; v.vinder === api.mig ? api.lyd.vind() : api.lyd.fejl(); }
    },
  });
  function diskStyring(el, api) {
    const joy = el.querySelector('#dk-joy'), knop = el.querySelector('#dk-knop'); let aktiv = null, sidst = 0, jx = 0, jy = 0, sendt = '';
    const send = (tving) => { const s = jx.toFixed(2) + ',' + jy.toFixed(2); const nu = Date.now(); if (s === sendt || (!tving && nu - sidst < 50)) return; sidst = nu; sendt = s; api.kald({ j: [jx, jy] }); };
    const flyt = e => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let x = (e.clientX - cx) / (r.width / 2 - 20), y = (e.clientY - cy) / (r.height / 2 - 20); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } jx = x; jy = y; knop.style.left = (45 + x * 45) + 'px'; knop.style.top = (45 + y * 45) + 'px'; send(); };
    joy.addEventListener('pointerdown', e => { e.preventDefault(); aktiv = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (x) {} flyt(e); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === aktiv) flyt(e); });
    const slip = e => { if (e.pointerId !== aktiv) return; aktiv = null; jx = 0; jy = 0; knop.style.left = knop.style.top = '45px'; send(true); };
    joy.addEventListener('pointerup', slip); joy.addEventListener('pointercancel', slip);
    el.querySelector('#dk-kast').addEventListener('pointerdown', e => { e.preventDefault(); api.kald({ kast: 1 }); api.vib(15); });
    const taster = {};
    const opd = () => { const x = (taster.ArrowRight || taster.d ? 1 : 0) - (taster.ArrowLeft || taster.a ? 1 : 0), y = (taster.ArrowDown || taster.s ? 1 : 0) - (taster.ArrowUp || taster.w ? 1 : 0); jx = x; jy = y; send(true); };
    document.addEventListener('keydown', e => { if (!el.isConnected) return; if (e.key === ' ') { e.preventDefault(); api.kald({ kast: 1 }); return; } if (/^(Arrow|[wasd]$)/.test(e.key) && !taster[e.key]) { taster[e.key] = true; e.preventDefault(); opd(); } });
    document.addEventListener('keyup', e => { if (!el.isConnected) return; if (taster[e.key]) { delete taster[e.key]; opd(); } });
  }
})();
