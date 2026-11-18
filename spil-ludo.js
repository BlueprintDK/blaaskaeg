/* Blå skæg – Ludo for 2-4 spillere.
 * Regler: slå 6 for at komme ud. 6 giver et ekstra slag. Lander du på en modstander, ryger den hjem
 * (undtagen på startfelterne, som er fredet). Man skal ramme målet præcist. Først med alle 4 brikker i mål vinder (+5). */
(function () {
  const { esc, rnd } = BS;
  /* 52 felter rundt om pladen (15×15), startende ved spiller A's startfelt */
  const BANE = [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7], [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]];
  const START = [0, 13, 26, 39];
  const HJEM = [[[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]];
  const GÅRD = [[[2, 2], [2, 3], [3, 2], [3, 3]], [[2, 11], [2, 12], [3, 11], [3, 12]], [[11, 11], [11, 12], [12, 11], [12, 12]], [[11, 2], [11, 3], [12, 2], [12, 3]]];
  const MÅL = 57;          // 0..51 bane, 52..56 hjemmesti, 57 = mål
  const SÆDER = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
  const banefelt = (sæde, rel) => (START[sæde] + rel) % 52;
  function pos(sæde, b, i) { if (b < 0) return GÅRD[sæde][i]; if (b <= 51) return BANE[banefelt(sæde, b)]; if (b < MÅL) return HJEM[sæde][b - 52]; return [7, 7]; }
  function lovlige(G, si, slag) {
    const s = G.sp[si]; return s.b.map((b, i) => {
      if (b === MÅL) return false; if (b < 0) return slag === 6; if (b + slag > MÅL) return false;
      return true;
    });
  }
  const næsteTur = (H, G) => { const n = G.sp.length; for (let k = 1; k <= n; k++) { const j = (G.tur + k) % n; if ((H.find(G.sp[j].e) || {}).online && !G.sp[j].færdig) return j; } return G.tur; };

  BS.registrer({
    id: 'ludo', navn: 'Ludo', e: '🎯', min: 2, max: 4,
    d: 'Slå 6 for at komme ud, smid de andre hjem og få alle fire brikker i mål.',
    start(H) {
      const ps = H.spillere(), sæder = SÆDER[ps.length];
      return { sp: ps.map((p, i) => ({ e: p.enhed, sæde: sæder[i], b: [-1, -1, -1, -1], færdig: false })), tur: 0, slag: 0, harSlået: false, seksere: 0, log: '', nr: 0, slut: null };
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
        G.log = tekst; G.harSlået = false;
        if (s.b.every(b => b === MÅL)) { s.færdig = true; G.slut = { vinder: e }; H.giv(e, 5); return; }
        if (G.slag !== 6) G.tur = næsteTur(H, G);
      }
    },
    frakoblet(H, G, e) { if (!G.slut && G.sp[G.tur].e === e) { G.harSlået = false; G.tur = næsteTur(H, G); } },
    skiftEnhed(H, G, gl, ny) { G.sp.forEach(s => { if (s.e === gl) s.e = ny; }); if (G.slut && G.slut.vinder === gl) G.slut.vinder = ny; },
    felles: true,
    view(H, G) { return { sp: G.sp, tur: G.tur, slag: G.slag, harSlået: G.harSlået, log: G.log, nr: G.nr, slut: G.slut, slagHjem: G.slagHjem || 0 }; },
    tegn(el, v, api) {
      const sig = JSON.stringify(v) + api.mig; if (el._s === sig) return; el._s = sig;
      const ts = v.sp[v.tur], min = !v.slut && ts.e === api.mig, mi = v.sp.findIndex(s => s.e === api.mig);
      const lovl = min && v.harSlået ? lovlige(v, v.tur, v.slag) : [false, false, false, false];
      const farveSæde = {}; v.sp.forEach(s => { farveSæde[s.sæde] = api.farve(s.e); });
      const zone = (r, c) => { if (r < 6 && c < 6) return 0; if (r < 6 && c > 8) return 1; if (r > 8 && c > 8) return 2; if (r > 8 && c < 6) return 3; return -1; };
      let h = '';
      if (v.slut) h += '<div class="banner min">🏆 ' + esc(api.navn(v.slut.vinder)) + ' vandt Ludo!</div>';
      else h += '<div class="banner' + (min ? ' min' : '') + '">' + (min ? (v.harSlået ? '🎯 Vælg en brik (du slog ' + v.slag + ')' : '🎯 Din tur – slå!') : '⏳ ' + esc(api.navn(ts.e)) + 's tur') + '</div>';
      /* pladen */
      const brikker = {};
      v.sp.forEach((s, si) => s.b.forEach((b, i) => { const [r, c] = pos(s.sæde, b, i); const k = r + ',' + c; (brikker[k] = brikker[k] || []).push({ si, i, f: api.farve(s.e) }); }));
      h += '<div style="display:grid;grid-template-columns:repeat(15,1fr);gap:1px;background:#0b1630;padding:4px;border-radius:14px;aspect-ratio:1">';
      const sporF = {}; BANE.forEach(([r, c], i) => { sporF[r + ',' + c] = i; });
      const hjemF = {}; HJEM.forEach((l, sæde) => l.forEach(([r, c]) => { hjemF[r + ',' + c] = sæde; }));
      for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
        const k = r + ',' + c, z = zone(r, c);
        let bg = '#0b1630', ekstra = '';
        if (k in sporF) { bg = '#e9eef8'; const st = START.indexOf(sporF[k]); if (st >= 0 && farveSæde[st]) { bg = farveSæde[st]; ekstra = '⭐'; } }
        else if (k in hjemF) bg = farveSæde[hjemF[k]] || '#3b4a6b';
        else if (z >= 0) bg = farveSæde[z] ? farveSæde[z] + '55' : '#14244a';
        else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) bg = r === 7 && c === 7 ? '#ffd166' : '#14244a';
        const bs = brikker[k] || [];
        h += '<div style="background:' + bg + ';border-radius:3px;position:relative;display:grid;place-items:center;font-size:9px;min-width:0">' + (bs.length ? '' : ekstra)
          + bs.map((b, n) => {
            const kan = min && b.si === v.tur && lovl[b.i];
            return '<button ' + (kan ? 'data-brik="' + b.i + '"' : 'disabled') + ' style="position:absolute;inset:' + (bs.length > 1 ? (n % 2 ? '8% 0 30% 30%' : '30% 30% 8% 0') : '10%') + ';border-radius:50%;border:2px solid #fff;background:' + b.f
              + ';padding:0;box-shadow:0 2px 3px rgba(0,0,0,.5)' + (kan ? ';animation:hop .6s infinite alternate;outline:3px solid #ffd166' : '') + ';color:#0b1630;font-weight:900;font-size:10px">' + (kan ? b.i + 1 : '') + '</button>';
          }).join('') + '</div>';
      }
      h += '</div><style>@keyframes hop{to{transform:translateY(-18%)}}</style>';
      h += '<div style="display:flex;gap:12px;align-items:center;justify-content:center;margin-top:12px">'
        + '<div style="width:64px;height:64px;border-radius:14px;background:#fff;color:#0b1630;display:grid;place-items:center;font-size:34px;font-weight:900' + (el._nr !== v.nr ? ';animation:ryst .45s' : '') + '">' + (v.slag || '–') + '</div>'
        + (min && !v.harSlået ? '<button class="btn ok big" id="lu-slå" style="flex:1">🎲 Slå</button>' : '') + '</div>';
      if (v.log) h += '<p class="hint center">' + esc(v.log) + '</p>';
      el.innerHTML = h;
      const s = el.querySelector('#lu-slå'); if (s) s.onclick = () => { s.disabled = true; api.kald({ slå: 1 }); };
      el.querySelectorAll('[data-brik]').forEach(b => { b.onclick = () => api.kald({ brik: +b.dataset.brik }); });
      if (el._nr !== v.nr) { el._nr = v.nr; api.lyd.klik(); }
      if (el._hj !== v.slagHjem) { if (el._hj != null) api.lyd.ram(); el._hj = v.slagHjem; }
      if (min) api.vib(30);
      if (v.slut && v.slut.vinder === api.mig && el._v !== 1) { el._v = 1; api.lyd.vind(); }
    },
  });
})();
