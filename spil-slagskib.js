/* Blå skæg – Sænk slagskibe for 2-4 spillere (bygget på vores Søslaget).
 * Placering: tilfældig flåde, som man kan blande om, til man trykker Klar.
 * Kamp: på sin tur vælger man en modstander og skyder. Ram = skyd igen (+1, sænket +2).
 * Er alle ens skibe sænket, er man ude. Sidste med skibe tilbage vinder (+5). */
(function () {
  const { esc, rnd } = BS;
  const N = 10, FLÅDE = [5, 4, 3, 3, 2], NAVNE = { 5: 'hangarskib', 4: 'slagskib', 3: 'krydser', 2: 'destroyer' };
  const idx = (r, c) => r * N + c;

  function tilfældig() {
    for (let t = 0; t < 500; t++) {
      const grid = new Array(N * N).fill(-1), skibe = []; let ok = true;
      for (let k = 0; k < FLÅDE.length && ok; k++) {
        ok = false; const l = FLÅDE[k];
        for (let a = 0; a < 300; a++) {
          const v = Math.random() < .5, r = rnd(v ? N - l + 1 : N), c = rnd(v ? N : N - l + 1);
          const cells = []; for (let i = 0; i < l; i++) cells.push(v ? [r + i, c] : [r, c + i]);
          if (cells.every(([rr, cc]) => { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const y = rr + dr, x = cc + dc; if (y >= 0 && x >= 0 && y < N && x < N && grid[idx(y, x)] !== -1) return false; } return true; })) {
            cells.forEach(([y, x]) => { grid[idx(y, x)] = k; }); skibe.push({ l, cells, hits: 0 }); ok = true; break;
          }
        }
      }
      if (ok) return { grid, skibe, skud: new Array(N * N).fill(0) };
    }
  }
  const lever = b => b.skibe.some(s => s.hits < s.l);
  /* næste spiller med skibe tilbage – helst en, der er online */
  function næsteTur(H, G) {
    const n = G.rk.length, ok = j => lever(G.b[G.rk[j]]), on = j => (H.find(G.rk[j]) || {}).online;
    for (let k = 1; k <= n; k++) { const j = (G.tur + k) % n; if (ok(j) && on(j)) return j; }
    for (let k = 1; k <= n; k++) { const j = (G.tur + k) % n; if (ok(j)) return j; }
    return G.tur;
  }

  BS.registrer({
    id: 'slagskib', navn: 'Sænk slagskibe', e: '🚢', min: 2, max: 4,
    d: 'Skyd på modstandernes flåder. Ram = skyd igen. Sidste med skibe vinder.',
    start(H) {
      const G = { fase: 'placering', rk: H.spillere().map(p => p.enhed), b: {}, klar: {}, tur: 0, sidst: null, ude: [], slut: null };
      G.rk.forEach(e => { G.b[e] = tilfældig(); });
      return G;
    },
    kald(H, G, e, d) {
      if (!G.b[e]) return;
      if (G.fase === 'placering') {
        if (d.bland && !G.klar[e]) G.b[e] = tilfældig();
        if (d.klar) G.klar[e] = true;
        const aktive = G.rk.filter(x => { const p = H.find(x); return p && p.online; });
        if (aktive.every(x => G.klar[x])) { G.rk = aktive; G.fase = 'kamp'; G.tur = rnd(G.rk.length); }
        return;
      }
      if (G.fase !== 'kamp' || G.rk[G.tur] !== e) return;
      const mod = d.mod, B = G.b[mod];
      if (!B || mod === e || !lever(B)) return;
      const r = +d.r, c = +d.c; if (!(r >= 0 && r < N && c >= 0 && c < N)) return;
      const i = idx(r, c); if (B.skud[i]) return;
      const k = B.grid[i];
      if (k === -1) {
        B.skud[i] = 1; G.sidst = { af: e, mod, r, c, res: 'plask', n: (G.sidst ? G.sidst.n : 0) + 1 };
        G.tur = næsteTur(H, G);
      } else {
        B.skud[i] = 2; const s = B.skibe[k]; s.hits++; H.giv(e, 1);
        let res = 'ram';
        if (s.hits === s.l) { s.cells.forEach(([y, x]) => { B.skud[idx(y, x)] = 3; }); res = 'sænket'; H.giv(e, 1); }
        G.sidst = { af: e, mod, r, c, res, l: s.l, n: (G.sidst ? G.sidst.n : 0) + 1 };
        if (!lever(B)) G.ude.push(mod);
        const tilbage = G.rk.filter(x => lever(G.b[x]));
        if (tilbage.length === 1) { G.fase = 'slut'; G.slut = { vinder: tilbage[0] }; H.giv(tilbage[0], 5); }
      }
    },
    frakoblet(H, G, e) {
      if (G.fase === 'placering') { this.kald(H, G, G.rk.find(x => x !== e && G.b[x]) || e, {}); }
      if (G.fase === 'kamp' && G.rk[G.tur] === e) G.tur = næsteTur(H, G);
    },
    skiftEnhed(H, G, gl, ny) {
      G.rk = G.rk.map(x => x === gl ? ny : x);
      if (G.b[gl]) { G.b[ny] = G.b[gl]; delete G.b[gl]; } if (G.klar[gl]) { G.klar[ny] = true; delete G.klar[gl]; }
      G.ude = G.ude.map(x => x === gl ? ny : x); if (G.sidst) { if (G.sidst.af === gl) G.sidst.af = ny; if (G.sidst.mod === gl) G.sidst.mod = ny; }
      if (G.slut && G.slut.vinder === gl) G.slut.vinder = ny;
    },
    view(H, G, e) {
      const mig = G.b[e];
      const v = { fase: G.fase, rk: G.rk, klar: Object.keys(G.klar), tur: G.rk[G.tur], sidst: G.sidst, slut: G.slut, ude: G.ude, b: {} };
      G.rk.forEach(x => {
        const B = G.b[x]; if (!B) return;
        if (x === e) v.b[x] = { mine: true, skibe: B.skibe.map(s => ({ cells: s.cells, sænket: s.hits === s.l })), skud: B.skud };
        else v.b[x] = { skud: B.skud, sænkede: B.skibe.filter(s => s.hits === s.l).map(s => s.cells), lever: lever(B),
          skibe: G.fase === 'slut' ? B.skibe.map(s => ({ cells: s.cells, sænket: s.hits === s.l })) : null };
      });
      if (!mig) v.tilskuer = true;
      return v;
    },
    tegn(el, v, api) {
      const mig = api.mig, min = v.fase === 'kamp' && v.tur === mig;
      const modst = v.rk.filter(x => x !== mig && v.b[x]);
      let valgt = el.dataset.mod;
      if (!valgt || !modst.includes(valgt) || (v.b[valgt] && !v.b[valgt].lever && modst.some(x => v.b[x].lever))) valgt = modst.find(x => v.b[x].lever) || modst[0];
      el.dataset.mod = valgt || '';
      const sig = JSON.stringify(v) + valgt;
      if (el.dataset.s === sig) return; el.dataset.s = sig;

      if (v.sidst && el.dataset.n !== String(v.sidst.n)) {
        el.dataset.n = String(v.sidst.n);
        if (v.sidst.res === 'plask') api.lyd.plask(); else if (v.sidst.res === 'ram') api.lyd.ram(); else api.lyd.sænket();
        if (v.sidst.res === 'sænket' && v.sidst.mod === mig) api.toast('Dit ' + NAVNE[v.sidst.l] + ' blev sænket af ' + api.navn(v.sidst.af));
      }
      let h = '';
      if (v.fase === 'placering') {
        const jegKlar = v.klar.includes(mig);
        h += '<div class="banner' + (jegKlar ? '' : ' min') + '">' + (jegKlar ? '⏳ Venter på de andre…' : '⚓ Din flåde – bland, til du er tilfreds') + '</div>'
          + bræt(v.b[mig], true, false)
          + (jegKlar ? '' : '<div class="row" style="margin-top:12px"><button class="btn sec" id="bs-bland">🎲 Bland</button><button class="btn ok" id="bs-klar">✅ Klar</button></div>')
          + '<p class="hint center">Klar: ' + v.rk.map(x => (v.klar.includes(x) ? '✅ ' : '⏳ ') + esc(api.navn(x))).join(' · ') + '</p>';
      } else {
        let ban;
        if (v.fase === 'slut') ban = '<div class="banner min">🏆 ' + esc(api.navn(v.slut.vinder)) + ' vandt søslaget!</div>';
        else if (v.ude.includes(mig)) ban = '<div class="banner">💀 Din flåde er sænket – du kigger med</div>';
        else if (min) ban = '<div class="banner min">🎯 DIN TUR – skyd!</div>';
        else ban = '<div class="banner" style="background:#3a1830;color:#ff9db0">⏳ ' + esc(api.navn(v.tur)) + 's tur</div>';
        h += ban;
        if (v.sidst) h += '<p class="hint center" style="margin:-4px 0 8px">' + esc(api.navn(v.sidst.af)) + ' skød på ' + (v.sidst.mod === mig ? 'dig' : esc(api.navn(v.sidst.mod))) + ': '
          + (v.sidst.res === 'plask' ? '💧 plask' : v.sidst.res === 'ram' ? '💥 ram!' : '🔥 sænkede et ' + NAVNE[v.sidst.l] + '!') + '</p>';
        if (modst.length > 1) h += '<div class="chips" style="justify-content:center">' + modst.map(x => '<button class="chip' + (x === valgt ? ' mig' : '') + '" data-mod="' + esc(x) + '" style="border:0;color:#fff;font:inherit;font-weight:700' + (v.b[x].lever ? '' : ';opacity:.4') + '"><i style="background:' + api.farve(x) + '"></i>' + esc(api.navn(x)) + (v.b[x].lever ? '' : ' 💀') + '</button>').join('') + '</div>';
        if (valgt) h += '<p class="hint" style="margin:6px 0">' + esc(api.navn(valgt)) + 's hav</p>' + bræt(v.b[valgt], false, min && v.b[valgt].lever, v.sidst && v.sidst.mod === valgt ? idx(v.sidst.r, v.sidst.c) : -1);
        if (v.b[mig]) h += '<p class="hint" style="margin:14px 0 6px">Dit hav</p><div style="max-width:62%">' + bræt(v.b[mig], true, false, v.sidst && v.sidst.mod === mig ? idx(v.sidst.r, v.sidst.c) : -1) + '</div>';
      }
      el.innerHTML = h;
      const $ = id => el.querySelector('#' + id);
      if ($('bs-bland')) $('bs-bland').onclick = () => api.kald({ bland: 1 });
      if ($('bs-klar')) $('bs-klar').onclick = () => api.kald({ klar: 1 });
      el.querySelectorAll('[data-mod]').forEach(b => { b.onclick = () => { el.dataset.mod = b.dataset.mod; el.dataset.s = ''; api.vib(15); this.tegn(el, v, api); }; });
      el.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => { const i = +b.dataset.i; api.kald({ mod: valgt, r: (i / N) | 0, c: i % N }); }; });
      if (min) api.vib(40);
    },
  });

  /* ---------- tegning af et bræt (CSS-grid + rigtige skibe som SVG) ---------- */
  const CSS = '.bsb{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;aspect-ratio:1;background:#2a4180;padding:3px;border-radius:12px;isolation:isolate}'
    + '.bsb .c{border:0;padding:0;background:#13306a;border-radius:3px;position:relative;aspect-ratio:1;min-width:0}'
    + '.bsb .c.m::after{content:"";position:absolute;inset:36%;border-radius:50%;background:rgba(220,235,255,.5)}'
    + '.bsb .c.h{background:#ef476f}.bsb .c.h::after{content:"";position:absolute;inset:28%;border-radius:50%;background:#ffd0cc;z-index:2}'
    + '.bsb .c.s{background:#6e1d2c}.bsb .c.l::before{content:"";position:absolute;inset:0;border:2px solid #ffd166;border-radius:3px;z-index:3}'
    + '.bsb.skyd .c:not(.m):not(.h):not(.s):active{background:#2f5cb8}.bsb.skyd{box-shadow:0 0 0 2px #06d6a0,0 0 22px rgba(6,214,160,.3)}'
    + '.bsb .ov{position:relative;z-index:1;pointer-events:none}.bsb .ov svg{position:absolute;inset:1px;width:calc(100% - 2px);height:calc(100% - 2px);overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}'
    + '.bsb .ov.sænket{animation:bsrev .5s cubic-bezier(.2,1.4,.4,1)}@keyframes bsrev{from{opacity:0;transform:scale(1.3)}}'
    + '.bsb .fire{animation:bsfl .45s infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes bsfl{to{opacity:.55;transform:scale(.75)}}';
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  function skibSVG(l, v, sænket) {
    const W = l * 10, c = sænket ? { h: '#77808e', s: '#ef476f', d: '#565e6b', k: '#22262d' } : { h: '#b8c7d7', s: '#56697f', d: '#8497ad', k: '#34445a' };
    let p = '<path d="M0.8,5 L3.6,1.3 H' + (W - 1.8) + ' Q' + (W - .5) + ',1.3 ' + (W - .5) + ',3 V7 Q' + (W - .5) + ',8.7 ' + (W - 1.8) + ',8.7 H3.6 Z" fill="' + c.h + '" stroke="' + c.s + '" stroke-width=".7"/>';
    const tur = (x, dir) => '<line x1="' + x + '" y1="5" x2="' + (x + dir * 3.4) + '" y2="5" stroke="' + c.k + '" stroke-width=".9" stroke-linecap="round"/><circle cx="' + x + '" cy="5" r="1.7" fill="' + c.d + '" stroke="' + c.k + '" stroke-width=".5"/>';
    const sup = (x, w) => '<rect x="' + x + '" y="3" width="' + w + '" height="4" rx=".8" fill="' + c.d + '" stroke="' + c.k + '" stroke-width=".5"/>';
    if (l === 5) p += '<rect x="4" y="2.4" width="' + (W - 6.5) + '" height="5.2" rx=".6" fill="' + c.d + '"/><line x1="6" y1="5" x2="' + (W - 4) + '" y2="5" stroke="' + c.h + '" stroke-width=".5" stroke-dasharray="2 1.5"/><rect x="' + (W * .55) + '" y="1.5" width="6" height="2" rx=".5" fill="' + c.k + '"/>';
    else if (l === 4) p += tur(7, -1) + tur(12.5, -1) + sup(W / 2 - 3, 8) + tur(W - 7, 1);
    else if (l === 3) p += tur(6.5, -1) + sup(W / 2 - 3, 6) + tur(W - 6, 1);
    else p += tur(5.5, -1) + sup(W / 2, 6);
    if (sænket) for (let i = 0; i < l; i++) { const x = i * 10 + 5 + (i % 2 ? 1.5 : -1.5), y = i % 2 ? 4 : 6; p += '<g class="fire"><circle cx="' + x + '" cy="' + y + '" r="2.1" fill="#ff7a1a" opacity=".9"/><circle cx="' + x + '" cy="' + y + '" r="1" fill="#ffd54a"/></g>'; }
    return '<svg viewBox="0 0 ' + (v ? '10 ' + W : W + ' 10') + '" preserveAspectRatio="none">' + (v ? '<g transform="translate(10,0) rotate(90)">' + p + '</g>' : p) + '</svg>';
  }
  function bræt(b, mine, skyd, sidste) {
    let h = '<div class="bsb' + (skyd ? ' skyd' : '') + '">';
    for (let i = 0; i < N * N; i++) {
      const s = b.skud[i];
      h += '<button class="c' + (s === 1 ? ' m' : s === 2 ? ' h' : s === 3 ? ' s' : '') + (i === sidste ? ' l' : '') + '" style="grid-area:' + ((i / N | 0) + 1) + '/' + (i % N + 1) + '"'
        + (skyd && !s ? ' data-i="' + i + '"' : ' tabindex="-1"') + '></button>';
    }
    const skibe = mine || b.skibe ? (b.skibe || []).map(s => ({ cells: s.cells, sænket: s.sænket })) : [];
    if (!mine && !b.skibe) (b.sænkede || []).forEach(cells => skibe.push({ cells, sænket: true }));
    skibe.forEach(s => {
      const cs = s.cells.slice().sort((a, b2) => a[0] - b2[0] || a[1] - b2[1]), [r0, c0] = cs[0], l = cs.length, v = l > 1 && cs[1][0] !== r0;
      h += '<div class="ov' + (s.sænket ? ' sænket' : '') + '" style="grid-area:' + (r0 + 1) + '/' + (c0 + 1) + '/span ' + (v ? l : 1) + '/span ' + (v ? 1 : l) + (mine || s.sænket ? '' : ';opacity:.45') + '">' + skibSVG(l, v, s.sænket) + '</div>';
    });
    return h + '</div>';
  }
})();
