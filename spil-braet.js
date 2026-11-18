/* Blå skæg – brætspil: 4 på stribe (2–4 samtidig, se nederst) og Kryds og bolle (duel for 2).
 * Er I flere end 2, spiller de to første, og resten ser med. Efter hver kamp bliver vinderen
 * ved bordet, og taberen går bag i køen (uafgjort: begge bagerst). Sejr = +2. */
(function () {
  const { esc, rnd } = BS;
  function duel(id, navn, e, d, W, H, tyngde, række) {
    function nyKamp(G) {
      G.bræt = new Array(W * H).fill(null); G.tur = 0; G.slut = null; G.sidst = -1; G.vind = [];
    }
    function vinder(G, i) {
      const e0 = G.bræt[i], r = (i / W) | 0, c = i % W;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const lin = [i];
        for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < H && cc >= 0 && cc < W && G.bræt[rr * W + cc] === e0) { lin.push(rr * W + cc); rr += dr * s; cc += dc * s; } }
        if (lin.length >= række) return lin;
      }
      return null;
    }
    BS.registrer({
      id, navn, e, min: 2, max: 4, d, samtidig: 2, spillertekst: 'resten i kø',   // 18/11-2026: vises i lobbyen
      start(H2) { const G = { kø: H2.spillere().map(p => p.enhed), kampe: 0 }; nyKamp(G); return G; },
      kald(H2, G, en, dd) {
        if (dd.næste) {
          if (!G.slut) return;
          const [a, b] = G.kø, rest = G.kø.slice(2), v = G.slut.vinder;
          if (v) { const taber = v === a ? b : a; G.kø = rest.length ? [v, rest[0]].concat(rest.slice(1), [taber]) : [v, taber]; }
          else G.kø = rest.length >= 2 ? rest.slice(0, 2).concat(rest.slice(2), [a, b]) : rest.length === 1 ? [rest[0], a, b] : [b, a];
          G.kampe++; nyKamp(G); G.tur = v ? 1 : 0;      // udfordreren starter
          return;
        }
        if (G.slut || G.kø[G.tur] !== en) return;
        let i = +dd.i;
        if (tyngde) { const c = +dd.c; if (!(c >= 0 && c < W)) return; i = -1; for (let r = H - 1; r >= 0; r--) if (G.bræt[r * W + c] == null) { i = r * W + c; break; } if (i < 0) return; }
        else if (!(i >= 0 && i < W * H) || G.bræt[i] != null) return;
        G.bræt[i] = en; G.sidst = i;
        const lin = vinder(G, i);
        if (lin) { G.slut = { vinder: en }; G.vind = lin; H2.giv(en, 2); }
        else if (G.bræt.every(x => x != null)) G.slut = { vinder: null };
        else G.tur = 1 - G.tur;
      },
      frakoblet(H2, G, en) { if (!G.slut && G.kø.slice(0, 2).includes(en)) { const anden = G.kø[0] === en ? G.kø[1] : G.kø[0]; G.slut = { vinder: anden, opgav: en }; H2.giv(anden, 2); } },
      skiftEnhed(H2, G, gl, ny) { G.kø = G.kø.map(x => x === gl ? ny : x); G.bræt = G.bræt.map(x => x === gl ? ny : x); if (G.slut && G.slut.vinder === gl) G.slut.vinder = ny; },
      felles: true,
      view(H2, G) { return { kø: G.kø, tur: G.tur, bræt: G.bræt, slut: G.slut, sidst: G.sidst, vind: G.vind, kampe: G.kampe }; },
      tegn(el, v, api) {
        const sig = JSON.stringify(v) + api.mig; if (el._s === sig) return;
        const nyBrik = el._sidst !== v.sidst + ':' + v.kampe; el._sidst = v.sidst + ':' + v.kampe; el._s = sig;
        const [a, b] = v.kø, spiller = v.kø.slice(0, 2).includes(api.mig), min = !v.slut && v.kø[v.tur] === api.mig;
        let h = '<div class="chips" style="justify-content:center">' + [a, b].map((x, k) => '<span class="chip' + (!v.slut && v.tur === k ? ' mig' : '') + '"><i style="background:' + api.farve(x) + '"></i>' + esc(api.navn(x)) + '</span>').join('<span style="align-self:center;font-weight:900">mod</span>') + '</div>';
        if (v.slut) h += '<div class="banner min">' + (v.slut.vinder ? '🏆 ' + esc(api.navn(v.slut.vinder)) + ' vandt!' : '🤝 Uafgjort') + '</div>';
        else if (min) h += '<div class="banner min">🎯 Din tur</div>';
        else h += '<div class="banner">' + (spiller ? '⏳ ' : '👀 ') + esc(api.navn(v.kø[v.tur])) + 's tur</div>';
        if (tyngde) {
          h += '<div style="display:grid;grid-template-columns:repeat(' + W + ',1fr);gap:6px;background:#1d4ed8;padding:8px;border-radius:16px;box-shadow:inset 0 -6px 0 #1e3a8a">';
          for (let i = 0; i < W * H; i++) {
            const x = v.bræt[i], vin = v.vind.includes(i);
            h += '<button data-c="' + (i % W) + '" style="aspect-ratio:1;border:0;border-radius:50%;padding:0;background:' + (x ? api.farve(x) : '#0b1630') + ';box-shadow:inset 0 3px 6px rgba(0,0,0,.45)' + (vin ? ',0 0 0 3px #fff' : '')
              + (x && i === v.sidst && nyBrik ? ';animation:fald .35s cubic-bezier(.5,0,.75,0)' : '') + '"' + (min ? '' : ' disabled') + '></button>';
          }
          h += '</div><style>@keyframes fald{from{transform:translateY(-' + (H * 110) + '%)}}</style>';
        } else {
          h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:340px;margin:0 auto">';
          for (let i = 0; i < 9; i++) {
            const x = v.bræt[i], vin = v.vind.includes(i), tegn = x ? (x === a ? '✕' : '◯') : '';
            h += '<button data-i="' + i + '" style="aspect-ratio:1;border:0;border-radius:16px;font-size:clamp(40px,14vw,72px);font-weight:900;color:' + (x ? api.farve(x) : '#fff') + ';background:' + (vin ? '#24407f' : '#14244a')
              + (x && i === v.sidst && nyBrik ? ';animation:pop .3s' : '') + '"' + (min && !x ? '' : ' disabled') + '>' + tegn + '</button>';
          }
          h += '</div><style>@keyframes pop{from{transform:scale(.3);opacity:0}}</style>';
        }
        if (v.slut && api.vært && v.kø.length >= 2) h += '<div class="hostbar"><button class="btn ok big" id="du-næste">' + (v.kø.length > 2 ? 'Næste kamp (vinderen bliver) →' : 'Ny kamp →') + '</button></div>';
        if (v.kø.length > 2) h += '<p class="hint center">I køen: ' + v.kø.slice(2).map(x => esc(api.navn(x))).join(', ') + '</p>';
        el.innerHTML = h;
        el.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => api.kald({ c: +b.dataset.c }); });
        el.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => api.kald({ i: +b.dataset.i }); });
        const n = el.querySelector('#du-næste'); if (n) n.onclick = () => api.kald({ næste: 1 });
        if (nyBrik && v.sidst >= 0) api.lyd.klik();
        if (v.slut && v.slut.vinder === api.mig) api.lyd.vind();
        if (min) api.vib(30);
      },
    });
  }
  /* ==================== 4 PÅ STRIBE for 2–4 samtidig ====================
   * 18/11-2026 (Michael: «var 3 i lobbyen … den 3. sad og kiggede på»): alle spiller på skift med hver sin farve.
   * Pladen vokser med antallet: 2 = 7×6 (klassisk), 3 = 9×7, 4 = 10×8. Fire i træk vinder (+2). Fuld plade = uafgjort.
   * Næste kamp starter med den, der sad efter forrige starter. Frakoblede springes over. */
  const PLADE = { 2: [7, 6], 3: [9, 7], 4: [10, 8] };
  function fireVinder(G, i) {
    const { W, H } = G, e0 = G.bræt[i], r = (i / W) | 0, c = i % W;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const lin = [i];
      for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < H && cc >= 0 && cc < W && G.bræt[rr * W + cc] === e0) { lin.push(rr * W + cc); rr += dr * s; cc += dc * s; } }
      if (lin.length >= 4) return lin;
    }
    return null;
  }
  function nyFireKamp(G) { G.bræt = new Array(G.W * G.H).fill(null); G.slut = null; G.sidst = -1; G.vind = []; G.tur = G.start; }
  const næsteOnline = (H2, G, fra) => { const n = G.rk.length; for (let k = 1; k <= n; k++) { const j = (fra + k) % n, p = H2.find(G.rk[j]); if (p && p.online) return j; } return fra; };
  BS.registrer({
    id: 'firestribe', navn: '4 på stribe', e: '🔴', min: 2, max: 4,
    d: 'Få fire i træk – vandret, lodret eller på skrå. Er I 3–4, bliver pladen større.',
    start(H2) {
      const rk = H2.spillere().map(p => p.enhed), [W, H] = PLADE[Math.min(4, Math.max(2, rk.length))];
      const G = { rk, W, H, start: rnd(rk.length), kampe: 0 }; nyFireKamp(G); return G;
    },
    kald(H2, G, en, dd) {
      if (dd.næste) { if (G.slut) { G.kampe++; G.start = næsteOnline(H2, G, G.start); nyFireKamp(G); } return; }
      if (G.slut || G.rk[G.tur] !== en) return;
      const c = +dd.c; if (!(c >= 0 && c < G.W)) return;
      let i = -1; for (let r = G.H - 1; r >= 0; r--) if (G.bræt[r * G.W + c] == null) { i = r * G.W + c; break; } if (i < 0) return;
      G.bræt[i] = en; G.sidst = i;
      const lin = fireVinder(G, i);
      if (lin) { G.slut = { vinder: en }; G.vind = lin; H2.giv(en, 2); }
      else if (G.bræt.every(x => x != null)) G.slut = { vinder: null };
      else G.tur = næsteOnline(H2, G, G.tur);
    },
    frakoblet(H2, G, en) { if (!G.slut && G.rk[G.tur] === en) G.tur = næsteOnline(H2, G, G.tur); },
    skiftEnhed(H2, G, gl, ny) { G.rk = G.rk.map(x => x === gl ? ny : x); G.bræt = G.bræt.map(x => x === gl ? ny : x); if (G.slut && G.slut.vinder === gl) G.slut.vinder = ny; },
    felles: true,
    view(H2, G) { return { rk: G.rk, W: G.W, H: G.H, tur: G.tur, bræt: G.bræt, slut: G.slut, sidst: G.sidst, vind: G.vind, kampe: G.kampe }; },
    tegn(el, v, api) {
      const sig = JSON.stringify(v) + api.mig; if (el._s === sig) return;
      const nyBrik = el._sidst !== v.sidst + ':' + v.kampe; el._sidst = v.sidst + ':' + v.kampe; el._s = sig;
      const min = !v.slut && v.rk[v.tur] === api.mig, med = v.rk.includes(api.mig);
      let h = '<div class="chips" style="justify-content:center">' + v.rk.map((x, k) => '<span class="chip' + (!v.slut && v.tur === k ? ' mig' : '') + '"><i style="background:' + api.farve(x) + '"></i>' + esc(api.navn(x)) + '</span>').join('') + '</div>';
      if (v.slut) h += '<div class="banner min">' + (v.slut.vinder ? '🏆 ' + esc(api.navn(v.slut.vinder)) + ' vandt!' : '🤝 Uafgjort') + '</div>';
      else if (min) h += '<div class="banner min">🎯 Din tur</div>';
      else h += '<div class="banner">' + (med ? '⏳ ' : '👀 ') + esc(api.navn(v.rk[v.tur])) + 's tur</div>';
      h += '<div style="display:grid;grid-template-columns:repeat(' + v.W + ',1fr);gap:' + (v.W > 7 ? 4 : 6) + 'px;background:#1d4ed8;padding:8px;border-radius:16px;box-shadow:inset 0 -6px 0 #1e3a8a">';
      for (let i = 0; i < v.W * v.H; i++) {
        const x = v.bræt[i], vin = v.vind.includes(i);
        h += '<button data-c="' + (i % v.W) + '" style="aspect-ratio:1;border:0;border-radius:50%;padding:0;background:' + (x ? api.farve(x) : '#0b1630') + ';box-shadow:inset 0 3px 6px rgba(0,0,0,.45)' + (vin ? ',0 0 0 3px #fff' : '')
          + (x && i === v.sidst && nyBrik ? ';animation:fald .35s cubic-bezier(.5,0,.75,0)' : '') + '"' + (min ? '' : ' disabled') + '></button>';
      }
      h += '</div><style>@keyframes fald{from{transform:translateY(-' + (v.H * 110) + '%)}}</style>';
      if (v.slut && api.vært) h += '<div class="hostbar"><button class="btn ok big" id="du-næste">Ny kamp →</button></div>';
      el.innerHTML = h;
      el.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => api.kald({ c: +b.dataset.c }); });
      const n = el.querySelector('#du-næste'); if (n) n.onclick = () => api.kald({ næste: 1 });
      if (nyBrik && v.sidst >= 0) api.lyd.klik();
      if (v.slut && v.slut.vinder === api.mig) api.lyd.vind();
      if (min) api.vib(30);
    },
  });
  duel('kryds', 'Kryds og bolle', '❌', 'Tre på stribe. Vinderen bliver ved bordet.', 3, 3, false, 3);
})();
