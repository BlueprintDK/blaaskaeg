/* Blå skæg – Forsvar borgen (co-op for 1-4 spillere).
 * Monstre kommer i bølger ad stierne fra hver spillers side. Tryk på banen for at skyde en pil fra dit tårn.
 * Fælles guld for hvert monster: køb hurtigere/stærkere pile til dit tårn eller reparer borgen.
 * Falder borgen, er spillet slut – alle får point for de bølger, I klarede. */
(function () {
  const { esc, rnd } = BS;
  const W = 1000, H0 = 1000, CX = 500, CY = 500, BORG_R = 92;
  const SIDER = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };          // 0 = nord, 1 = øst, 2 = syd, 3 = vest
  const STI_N = [[500, -30], [430, 90], [560, 190], [420, 290], [500, 400]];
  const rot = ([x, y], k) => { const a = k * Math.PI / 2, dx = x - CX, dy = y - CY; return [CX + dx * Math.cos(a) - dy * Math.sin(a), CY + dx * Math.sin(a) + dy * Math.cos(a)]; };
  const STIER = [0, 1, 2, 3].map(k => STI_N.map(p => rot(p, k)));
  const TÅRN = [0, 1, 2, 3].map(k => rot([CX + 70, CY - 130], k));
  const TYPER = {
    slim: { f: '#5ad24b', hp: 3, v: 34, r: 25, guld: 1 }, ulv: { f: '#9aa3b5', hp: 2, v: 72, r: 23, guld: 1 },
    trold: { f: '#8a5cc7', hp: 9, v: 22, r: 33, guld: 3 }, flagermus: { f: '#4a2f6b', hp: 1, v: 95, r: 21, guld: 1 },
    drage: { f: '#e63946', hp: 45, v: 16, r: 50, guld: 15 },
  };
  const PRIS = { fart: l => 6 + l * 6, kraft: l => 8 + l * 8, reparer: () => 10 };
  function længde(sti) { let s = 0; for (let i = 1; i < sti.length; i++) s += Math.hypot(sti[i][0] - sti[i - 1][0], sti[i][1] - sti[i - 1][1]); return s; }
  const LÆNGDE = STIER.map(længde);
  function påSti(k, d) {
    const s = STIER[k]; for (let i = 1; i < s.length; i++) { const l = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); if (d <= l) { const t = d / l; return [s[i - 1][0] + (s[i][0] - s[i - 1][0]) * t, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * t]; } d -= l; }
    return s[s.length - 1];
  }
  function nyBølge(G) {
    G.bølge++; G.kø = []; const b = G.bølge, n = 4 + b * 2;
    for (let i = 0; i < n; i++) {
      const t = b >= 3 && i % 5 === 4 ? 'trold' : b >= 2 && i % 3 === 2 ? 'ulv' : b >= 4 && i % 4 === 1 ? 'flagermus' : 'slim';
      G.kø.push({ t, side: G.sider[i % G.sider.length], tid: i * Math.max(.35, .9 - b * .04) });
    }
    if (b % 5 === 0) G.kø.push({ t: 'drage', side: G.sider[rnd(G.sider.length)], tid: n * .6 });
    G.bølgeTid = 0; G.fase = 'bølge';
  }
  BS.registrer({
    id: 'borg', navn: 'Forsvar borgen', e: '🏰', min: 1, max: 4, tickMs: 50, felles: true, realtid: true,
    d: 'Co-op: stå sammen om borgen mod bølger af monstre. Tryk for at skyde.',
    start(H) {
      const ps = H.spillere(), sider = SIDER[ps.length];
      const G = { sider, hp: 100, maxhp: 100, bølge: 0, guld: 0, fase: 'pause', t: 3000, mon: [], pile: [], kø: [], bølgeTid: 0, slut: null, id: 0, drab: 0, træf: [],
        sp: ps.map((p, i) => ({ e: p.enhed, side: sider[i], fart: 0, kraft: 0, cd: 0 })) };
      return G;
    },
    kald(H, G, e, d) {
      if (G.slut) return; const s = G.sp.find(x => x.e === e); if (!s) return;
      if (d.skyd && s.cd <= 0) {
        const [tx, ty] = d.skyd.map(Number), [x, y] = TÅRN[s.side], a = Math.atan2(ty - y, tx - x);
        G.pile.push({ x, y, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, s: s.e, d: 1 + s.kraft, liv: .9 }); s.cd = Math.max(.12, .55 - s.fart * .08); G.skud = (G.skud || 0) + 1;
      }
      if (d.køb) {
        const k = d.køb;
        if (k === 'reparer') { if (G.guld >= PRIS.reparer() && G.hp < G.maxhp) { G.guld -= PRIS.reparer(); G.hp = Math.min(G.maxhp, G.hp + 25); } }
        else if (k === 'fart' || k === 'kraft') { const p = PRIS[k](s[k]); if (G.guld >= p && s[k] < 5) { G.guld -= p; s[k]++; } }
      }
    },
    tick(H, G) {
      if (G.slut) return false;
      const dt = .05;
      G.sp.forEach(s => { s.cd = Math.max(0, s.cd - dt); });
      if (G.fase === 'pause') { G.t -= 50; if (G.t <= 0) nyBølge(G); }
      if (G.fase === 'bølge') {
        G.bølgeTid += dt;
        while (G.kø.length && G.kø[0].tid <= G.bølgeTid) { const q = G.kø.shift(), T = TYPER[q.t]; G.mon.push({ id: ++G.id, t: q.t, side: q.side, d: 0, hp: T.hp + Math.floor(G.bølge / 4), max: T.hp + Math.floor(G.bølge / 4), x: 0, y: 0 }); }
        if (!G.kø.length && !G.mon.length) { G.fase = 'pause'; G.t = 4000; G.guld += 3 + G.bølge; }
      }
      G.mon.forEach(m => {
        const T = TYPER[m.t]; m.d = Math.min(LÆNGDE[m.side], m.d + T.v * dt * (1 + G.bølge * .03));
        [m.x, m.y] = påSti(m.side, m.d);
        if (m.d >= LÆNGDE[m.side]) { G.hp -= (m.t === 'drage' ? 6 : m.t === 'trold' ? 3 : 1.5) * dt; m.angriber = true; }
      });
      G.træf = [];
      G.pile = G.pile.filter(p => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.liv -= dt; if (p.liv <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H0 + 20) return false;
        for (const m of G.mon) if (m.hp > 0 && Math.hypot(m.x - p.x, m.y - p.y) < TYPER[m.t].r + 6) {
          m.hp -= p.d; G.træf.push([Math.round(m.x), Math.round(m.y)]);
          if (m.hp <= 0) { G.guld += TYPER[m.t].guld; G.drab++; H.giv(p.s, 0); }
          return false;
        }
        return true;
      });
      G.mon = G.mon.filter(m => m.hp > 0);
      if (G.hp <= 0) {
        G.hp = 0; G.slut = { bølge: G.bølge, klaret: Math.max(0, G.bølge - 1) };
        H.spillere().forEach(p => H.giv(p.enhed, G.slut.klaret));
      }
      return true;
    },
    skiftEnhed(H, G, gl, ny) { G.sp.forEach(s => { if (s.e === gl) s.e = ny; }); },
    view(H, G) {
      return { fase: G.fase, t: G.t, hp: Math.ceil(G.hp), maxhp: G.maxhp, bølge: G.bølge, guld: G.guld, drab: G.drab, skud: G.skud || 0, sider: G.sider,
        sp: G.sp.map(s => ({ e: s.e, side: s.side, fart: s.fart, kraft: s.kraft })),
        mon: G.mon.map(m => [m.id, m.t, Math.round(m.x), Math.round(m.y), m.hp, m.max, m.angriber ? 1 : 0]),
        pile: G.pile.map(p => [Math.round(p.x), Math.round(p.y), Math.round(Math.atan2(p.vy, p.vx) * 100) / 100, p.s]), træf: G.træf, slut: G.slut };
    },
    tegn(el, v, api) {
      if (!el.querySelector('#bo-cv')) {
        el.innerHTML = '<div class="rt-ban"></div><canvas id="bo-cv" width="1000" height="1000" style="width:100%;border-radius:14px;touch-action:none"></canvas><div id="bo-butik"></div>';
        const cv = el.querySelector('#bo-cv');
        cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); api.kald({ skyd: [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H0)] }); });
      }
      const mig = v.sp.find(s => s.e === api.mig);
      let ban;
      if (v.slut) ban = '<div class="banner" style="background:#ef476f;color:#fff">🏚️ Borgen faldt i bølge ' + v.slut.bølge + ' – I klarede ' + v.slut.klaret + ' bølger (+' + v.slut.klaret + ' point til alle)</div>';
      else if (v.fase === 'pause') ban = '<div class="banner min">' + (v.bølge ? '✅ Bølge ' + v.bølge + ' klaret! ' : '') + 'Bølge ' + (v.bølge + 1) + ' om ' + Math.max(1, Math.ceil(v.t / 1000)) + '…</div>';
      else ban = '<div class="banner min">🏰 Bølge ' + v.bølge + ' · ❤️ ' + v.hp + ' · 🪙 ' + v.guld + '</div>';
      const b = el.querySelector('.rt-ban'); if (b._h !== ban) { b._h = ban; b.innerHTML = ban; }
      tegnBorg(el.querySelector('#bo-cv'), v, api);
      const butik = mig ? '<div class="row" style="margin-top:10px;flex-wrap:wrap">'
        + '<button class="btn sec" data-køb="fart"' + (v.guld >= PRIS.fart(mig.fart) && mig.fart < 5 ? '' : ' disabled') + '>⚡ Hurtigere ' + (mig.fart < 5 ? '(' + PRIS.fart(mig.fart) + '🪙)' : 'MAX') + '</button>'
        + '<button class="btn sec" data-køb="kraft"' + (v.guld >= PRIS.kraft(mig.kraft) && mig.kraft < 5 ? '' : ' disabled') + '>💪 Stærkere ' + (mig.kraft < 5 ? '(' + PRIS.kraft(mig.kraft) + '🪙)' : 'MAX') + '</button>'
        + '<button class="btn sec" data-køb="reparer"' + (v.guld >= PRIS.reparer() && v.hp < v.maxhp ? '' : ' disabled') + '>🧱 Reparer +25 (' + PRIS.reparer() + '🪙)</button></div>'
        + '<p class="hint center">Tryk på banen for at skyde fra dit tårn (din farve). Guldet er fælles – aftal hvem der køber!</p>' : '';
      const bt = el.querySelector('#bo-butik'); if (bt._h !== butik) { bt._h = butik; bt.innerHTML = butik; bt.querySelectorAll('[data-køb]').forEach(x => { x.onclick = () => api.kald({ køb: x.dataset.køb }); }); }
      if (el._drab !== v.drab) { if (el._drab != null) api.lyd.klik(); el._drab = v.drab; }
      if (v.slut && el._slut !== 1) { el._slut = 1; api.lyd.sænket(); }
    },
  });

  /* ---------- grafik ---------- */
  const BAGE = {};
  function baggrund(sider) {
    const nøgle = sider.join(''); if (BAGE[nøgle]) return BAGE[nøgle];
    const BAG = tegnBaggrund(sider); BAGE[nøgle] = BAG; return BAG;
  }
  function tegnBaggrund(sider) {
    let BAG;
    const c0 = document.createElement('canvas'); c0.width = W; c0.height = H0; const c = c0.getContext('2d');
    let seed = 11; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const g = c.createRadialGradient(CX, CY, 100, CX, CY, 700); g.addColorStop(0, '#4f9d3a'); g.addColorStop(1, '#2d6b2a'); c.fillStyle = g; c.fillRect(0, 0, W, H0);
    for (let i = 0; i < 1400; i++) { c.fillStyle = r() < .5 ? 'rgba(20,70,20,.3)' : 'rgba(170,220,110,.15)'; c.fillRect(r() * W, r() * H0, 3, 3); }
    sider.map(k => STIER[k]).forEach(s => {
      c.lineJoin = 'round'; c.lineCap = 'round';
      const sti = () => { c.beginPath(); s.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
      sti(); c.strokeStyle = '#7a5a33'; c.lineWidth = 58; c.stroke();
      sti(); c.strokeStyle = '#a07a46'; c.lineWidth = 44; c.stroke();
      sti(); c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 10; c.setLineDash([4, 14]); c.stroke(); c.setLineDash([]);
    });
    for (let t = 0; t < 60; t++) {
      const x = r() * W, y = r() * H0; if (Math.hypot(x - CX, y - CY) < 200) continue;
      if (sider.some(k => STIER[k].some(([a, b]) => Math.hypot(a - x, b - y) < 70))) continue;
      const s = 14 + r() * 14;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + 6, y + 8, s, 0, 7); c.fill();
      c.fillStyle = '#1d5e22'; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
      c.fillStyle = '#2f8a35'; c.beginPath(); c.arc(x - s * .3, y - s * .35, s * .55, 0, 7); c.fill();
    }
    /* borgen: ringmur med tinder, borggård og et tårn i midten */
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(CX + 8, CY + 10, BORG_R + 14, 0, 7); c.fill();
    c.fillStyle = '#8d8f99'; c.beginPath(); c.arc(CX, CY, BORG_R + 12, 0, 7); c.fill();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; c.save(); c.translate(CX + Math.cos(a) * (BORG_R + 12), CY + Math.sin(a) * (BORG_R + 12)); c.rotate(a); c.fillStyle = i % 2 ? '#a9abb5' : '#6f7280'; c.fillRect(-8, -9, 16, 18); c.restore(); }
    c.fillStyle = '#c9b48a'; c.beginPath(); c.arc(CX, CY, BORG_R - 8, 0, 7); c.fill();
    for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(120,90,50,.25)'; c.fillRect(CX - 70 + r() * 140, CY - 70 + r() * 140, 8, 5); }
    c.fillStyle = '#7d808c'; c.fillRect(CX - 34, CY - 34, 68, 68); c.fillStyle = '#9a9daa'; c.fillRect(CX - 28, CY - 28, 56, 56);
    for (let i = 0; i < 4; i++) { const [x, y] = [[-34, -34], [34, -34], [34, 34], [-34, 34]][i]; c.fillStyle = '#6a6d78'; c.beginPath(); c.arc(CX + x, CY + y, 13, 0, 7); c.fill(); }
    BAG = c0; return BAG;
  }
  /* monstrene tegnes som små figurer (krop, øjne og typens kendetegn) */
  function monster(c, t, T, x, y, nu, id) {
    const r = T.r, mørk = 'rgba(0,0,0,.25)';
    const øjne = (dy, s) => { [-1, 1].forEach(k => { c.fillStyle = '#fff'; c.beginPath(); c.arc(x + k * r * .32, y + dy, r * s, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(x + k * r * .32 + r * .05, y + dy + r * .03, r * s * .5, 0, 7); c.fill(); }); };
    if (t === 'flagermus' || t === 'drage') {
      const slag = Math.sin(nu * (t === 'drage' ? 5 : 14) + id) * .5;
      c.fillStyle = t === 'drage' ? '#9d1b2b' : '#2e1a47';
      [-1, 1].forEach(k => { c.beginPath(); c.moveTo(x + k * r * .3, y); c.quadraticCurveTo(x + k * r * 1.5, y - r * (1 + slag), x + k * r * 1.6, y + r * .3); c.quadraticCurveTo(x + k * r, y + r * .1, x + k * r * .3, y + r * .3); c.fill(); });
    }
    c.fillStyle = T.f;
    if (t === 'slim') { const sv = Math.sin(nu * 5 + id) * .08; c.beginPath(); c.ellipse(x, y + r * .15, r * (1 + sv), r * (.8 - sv), 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x - r * .35, y - r * .25, r * .25, r * .15, -.5, 0, 7); c.fill(); øjne(0, .22); }
    else if (t === 'ulv') { c.beginPath(); c.arc(x, y, r * .8, 0, 7); c.fill(); [-1, 1].forEach(k => { c.beginPath(); c.moveTo(x + k * r * .25, y - r * .6); c.lineTo(x + k * r * .7, y - r * 1.15); c.lineTo(x + k * r * .8, y - r * .35); c.fill(); }); c.fillStyle = '#d9dde6'; c.beginPath(); c.ellipse(x, y + r * .3, r * .38, r * .28, 0, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(x, y + r * .2, r * .12, 0, 7); c.fill(); øjne(-r * .15, .17); }
    else if (t === 'trold') { c.fillStyle = '#e9e1cf'; [-1, 1].forEach(k => { c.beginPath(); c.moveTo(x + k * r * .45, y - r * .55); c.lineTo(x + k * r * .85, y - r * 1.25); c.lineTo(x + k * r * .75, y - r * .4); c.fill(); }); c.fillStyle = T.f; c.beginPath(); c.arc(x, y, r * .9, 0, 7); c.fill(); c.fillStyle = mørk; c.beginPath(); c.arc(x, y + r * .35, r * .45, 0, Math.PI); c.fill(); c.fillStyle = '#fff'; c.fillRect(x - r * .3, y + r * .35, r * .14, r * .18); c.fillRect(x + r * .16, y + r * .35, r * .14, r * .18); øjne(-r * .2, .2); }
    else if (t === 'flagermus') { c.beginPath(); c.arc(x, y, r * .55, 0, 7); c.fill(); øjne(-r * .05, .16); }
    else if (t === 'drage') { c.beginPath(); c.ellipse(x, y, r * .75, r * .9, 0, 0, 7); c.fill(); c.fillStyle = '#ffd166'; c.beginPath(); c.ellipse(x, y + r * .25, r * .4, r * .45, 0, 0, 7); c.fill(); c.fillStyle = '#9d1b2b'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * r * .3 - r * .12, y - r * .8); c.lineTo(x + k * r * .3, y - r * 1.15); c.lineTo(x + k * r * .3 + r * .12, y - r * .8); c.fill(); } øjne(-r * .3, .17); if (Math.sin(nu * 3 + id) > .7) { c.fillStyle = 'rgba(255,140,40,.8)'; c.beginPath(); c.arc(x, y + r * 1.1, r * .3, 0, 7); c.fill(); } }
  }
  function tegnBorg(cv, v, api) {
    const c = cv.getContext('2d'); c.drawImage(baggrund(v.sider), 0, 0);
    const nu = performance.now() / 1000;
    /* flag på borgen + tårne i spillernes farver */
    c.strokeStyle = '#3b2a1a'; c.lineWidth = 4; c.beginPath(); c.moveTo(CX, CY); c.lineTo(CX, CY - 60); c.stroke();
    c.fillStyle = '#3a86ff'; c.beginPath(); c.moveTo(CX, CY - 60); c.lineTo(CX + 34 + Math.sin(nu * 4) * 4, CY - 50); c.lineTo(CX, CY - 40); c.closePath(); c.fill();
    v.sp.forEach(s => {
      const [x, y] = TÅRN[s.side], f = api.farve(s.e);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(x + 5, y + 6, 24, 0, 7); c.fill();
      c.fillStyle = '#7d808c'; c.beginPath(); c.arc(x, y, 24, 0, 7); c.fill();
      c.fillStyle = f; c.beginPath(); c.arc(x, y, 15, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.fillText(api.navn(s.e), x, y - 30);
      if (s.e === api.mig) { c.strokeStyle = '#ffd166'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 30, 0, 7); c.stroke(); }
      c.fillStyle = '#ffd166'; c.font = '12px sans-serif'; c.fillText('⚡' + s.fart + ' 💪' + s.kraft, x, y + 42);
    });
    /* monstre */
    c.textAlign = 'center'; c.textBaseline = 'middle';
    v.mon.forEach(([id, t, x, y, hp, max, ang]) => {
      const T = TYPER[t], hop = Math.abs(Math.sin(nu * 6 + id)) * 4;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + T.r * .8, T.r * .8, T.r * .3, 0, 0, 7); c.fill();
      monster(c, t, T, x, y - hop, nu, id);
      if (hp < max) { c.fillStyle = '#300'; c.fillRect(x - T.r, y - T.r - 12, T.r * 2, 5); c.fillStyle = '#ef476f'; c.fillRect(x - T.r, y - T.r - 12, T.r * 2 * hp / max, 5); }
      if (ang && Math.sin(nu * 12 + id) > .6) { c.fillStyle = 'rgba(255,80,60,.6)'; c.beginPath(); c.arc(x, y, T.r + 6, 0, 7); c.fill(); }
    });
    c.textBaseline = 'alphabetic';
    /* pile */
    v.pile.forEach(([x, y, a, e]) => {
      c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = '#5b3a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, 0); c.lineTo(8, 0); c.stroke();
      c.fillStyle = api.farve(e); c.beginPath(); c.moveTo(12, 0); c.lineTo(4, -5); c.lineTo(4, 5); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-18, -3, 5, 6); c.restore();
    });
    v.træf.forEach(([x, y]) => { c.fillStyle = 'rgba(255,230,120,.85)'; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); });
    /* borgens liv */
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(CX - 80, CY + BORG_R + 26, 160, 14);
    c.fillStyle = v.hp > 50 ? '#06d6a0' : v.hp > 25 ? '#ffd166' : '#ef476f'; c.fillRect(CX - 78, CY + BORG_R + 28, 156 * v.hp / v.maxhp, 10);
  }
})();
