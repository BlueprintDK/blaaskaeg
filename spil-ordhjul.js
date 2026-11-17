/* Blå skæg – Ordhjulet for 2-4 spillere (vores eget ord- og hjulspil).
 * På sin tur: drej hjulet → vælg en konsonant (beløb × antal). Rigtigt = fortsæt: drej igen, køb en vokal (250 kr)
 * eller løs gåden. Fallit = rundens penge væk. Mist tur = næste. Løser man gåden, får man +3 point.
 * Gåden ligger kun hos værten. */
(function () {
  const { esc, rnd } = BS;
  const GÅDER = [
    ['Ordsprog', 'MANGE BÆKKE SMÅ GØR EN STOR Å'], ['Ordsprog', 'DEN DER LER SIDST LER BEDST'], ['Ordsprog', 'MORGENSTUND HAR GULD I MUND'],
    ['Ordsprog', 'ØVELSE GØR MESTER'], ['Ordsprog', 'TOMME TØNDER BUMLER MEST'], ['Ordsprog', 'BEDRE SENT END ALDRIG'],
    ['Ordsprog', 'NÅR KATTEN ER UDE DANSER MUSENE PÅ BORDET'], ['Ordsprog', 'DEN ENES DØD DEN ANDENS BRØD'], ['Ordsprog', 'DER ER INGEN ROSER UDEN TORNE'],
    ['Ordsprog', 'TALE ER SØLV TAVSHED ER GULD'], ['Ordsprog', 'KRAGE SØGER MAGE'], ['Ordsprog', 'ALT GODT KOMMER TIL DEN DER VENTER'],
    ['Udtryk', 'AT SKYDE GENVEJ'], ['Udtryk', 'AT HAVE EN FINGER MED I SPILLET'], ['Udtryk', 'AT GÅ SOM KATTEN OM DEN VARME GRØD'],
    ['Udtryk', 'AT SLÅ TO FLUER MED ET SMÆK'], ['Udtryk', 'AT SÆLGE SKINDET FØR BJØRNEN ER SKUDT'], ['Udtryk', 'AT FÅ KOLDE FØDDER'],
    ['Udtryk', 'AT HAVE EN SKRUE LØS'], ['Udtryk', 'AT TAGE TYREN VED HORNENE'], ['Udtryk', 'DET ER IKKE RAKETVIDENSKAB'],
    ['Sted i Danmark', 'DEN LILLE HAVFRUE'], ['Sted i Danmark', 'RUNDETÅRN'], ['Sted i Danmark', 'SKAGENS GRENEN'], ['Sted i Danmark', 'MØNS KLINT'],
    ['Sted i Danmark', 'KRONBORG SLOT'], ['Sted i Danmark', 'LEGOLAND I BILLUND'], ['Sted i Danmark', 'TIVOLI I KØBENHAVN'], ['Sted i Danmark', 'STOREBÆLTSBROEN'],
    ['Sted i Danmark', 'RÅBJERG MILE'], ['Sted i Danmark', 'DEN GAMLE BY I AARHUS'],
    ['Sted i verden', 'EIFFELTÅRNET I PARIS'], ['Sted i verden', 'DEN KINESISKE MUR'], ['Sted i verden', 'FRIHEDSGUDINDEN'], ['Sted i verden', 'MOUNT EVEREST'],
    ['Sted i verden', 'PYRAMIDERNE I EGYPTEN'], ['Sted i verden', 'GRAND CANYON'],
    ['Mad og drikke', 'STEGT FLÆSK MED PERSILLESOVS'], ['Mad og drikke', 'RISALAMANDE MED KIRSEBÆRSOVS'], ['Mad og drikke', 'RØDGRØD MED FLØDE'],
    ['Mad og drikke', 'FRIKADELLER OG KARTOFFELSALAT'], ['Mad og drikke', 'HINDBÆRSNITTER'], ['Mad og drikke', 'VARM KAKAO MED FLØDESKUM'],
    ['Mad og drikke', 'SMØRREBRØD MED SILD'], ['Mad og drikke', 'ÆBLESKIVER MED SYLTETØJ'],
    ['Ting', 'EN RUSTEN CYKELKÆDE'], ['Ting', 'FJERNBETJENINGEN TIL FJERNSYNET'], ['Ting', 'EN VARM ULDTRØJE'], ['Ting', 'MOBILTELEFON MED REVNET SKÆRM'],
    ['Ting', 'EN KASSE LEGOKLODSER'], ['Ting', 'EN GAMMEL SKATTEKISTE'],
    ['Aktivitet', 'AT BYGGE EN SNEMAND'], ['Aktivitet', 'AT GÅ EN TUR I SKOVEN'], ['Aktivitet', 'AT SPISE IS PÅ STRANDEN'], ['Aktivitet', 'AT KØRE PÅ MOTORCYKEL'],
    ['Aktivitet', 'AT SPILLE BRÆTSPIL HELE NATTEN'], ['Aktivitet', 'AT FISKE VED SØEN'], ['Aktivitet', 'AT HOPPE PÅ TRAMPOLIN'],
    ['Dyr', 'EN SOVENDE ISBJØRN'], ['Dyr', 'EN FLOK VILDE HESTE'], ['Dyr', 'DEN STORE BLÅHVAL'], ['Dyr', 'EN NYSGERRIG RÆVEUNGE'],
    ['Højtid', 'GLÆDELIG JUL OG GODT NYTÅR'], ['Højtid', 'SANKTHANSBÅL VED STRANDEN'], ['Højtid', 'SLÅ KATTEN AF TØNDEN'], ['Højtid', 'PÅSKEHAREN GEMMER ÆG'],
  ];
  const HJUL = [500, 300, 'Fallit', 800, 200, 600, 'Mist tur', 400, 1000, 300, 700, 'Fallit', 250, 900, 350, 600];
  const VOKALER = 'AEIOUYÆØÅ'.split(''), KONS = 'BCDFGHJKLMNPQRSTVWXZ'.split('');
  const PRIS = 250;
  const norm = s => String(s || '').toUpperCase().replace(/[^A-ZÆØÅ]/g, '');
  const næste = (H, G) => { const n = G.rk.length; for (let k = 1; k <= n; k++) { const j = (G.tur + k) % n; if ((H.find(G.rk[j]) || {}).online) return j; } return G.tur; };
  function nyGåde(G) {
    let g; do { g = GÅDER[rnd(GÅDER.length)]; } while (G.brugt.includes(g[1]) && G.brugt.length < GÅDER.length - 1);
    G.brugt.push(g[1]);
    Object.assign(G, { kat: g[0], gåde: g[1], vist: [], fase: 'drej', værdi: 0, penge: {}, slut: null });
    G.rk.forEach(e => { G.penge[e] = 0; });
  }
  BS.registrer({
    id: 'ordhjul', navn: 'Ordhjulet', e: '🎡', min: 2, max: 4,
    d: 'Drej hjulet, gæt bogstaver og løs gåden før de andre.',
    start(H) { const G = { rk: H.spillere().map(p => p.enhed), tur: 0, brugt: [], spin: { n: 0, i: 0 }, log: '' }; G.tur = rnd(G.rk.length); nyGåde(G); return G; },
    kald(H, G, e, d) {
      if (d.ny) { if (G.slut) { G.tur = næste(H, G); nyGåde(G); G.log = ''; } return; }
      if (G.slut || G.rk[G.tur] !== e) return;
      const navn = H.navn(e);
      if (d.drej && G.fase === 'drej') {
        const i = rnd(HJUL.length), f = HJUL[i]; G.spin = { n: G.spin.n + 1, i };
        if (f === 'Fallit') { G.penge[e] = 0; G.log = navn + ' ramte FALLIT 💸'; G.tur = næste(H, G); }
        else if (f === 'Mist tur') { G.log = navn + ' mistede turen'; G.tur = næste(H, G); }
        else { G.værdi = f; G.fase = 'kons'; G.log = navn + ' drejede ' + f + ' kr – vælg en konsonant'; }
        return;
      }
      if (d.k && G.fase === 'kons') {
        const b = String(d.k).toUpperCase(); if (!KONS.includes(b) || G.vist.includes(b)) return;
        G.vist.push(b); const n = [...G.gåde].filter(c => c === b).length;
        if (n) { G.penge[e] += n * G.værdi; G.fase = 'drej'; G.log = navn + ': ' + n + '× ' + b + ' = ' + (n * G.værdi) + ' kr'; }
        else { G.log = navn + ': intet ' + b; G.fase = 'drej'; G.tur = næste(H, G); }
        return;
      }
      if (d.v && G.fase === 'drej') {
        const b = String(d.v).toUpperCase(); if (!VOKALER.includes(b) || G.vist.includes(b) || G.penge[e] < PRIS) return;
        G.penge[e] -= PRIS; G.vist.push(b); const n = [...G.gåde].filter(c => c === b).length;
        if (n) G.log = navn + ' købte ' + b + ' (' + n + '×)'; else { G.log = navn + ' købte ' + b + ' – men der er intet'; G.tur = næste(H, G); }
        return;
      }
      if (d.løs && G.fase === 'drej') {
        if (norm(d.løs) === norm(G.gåde)) {
          G.vist = [...new Set(G.gåde.replace(/[^A-ZÆØÅ]/g, ''))]; G.slut = { af: e, kr: Math.max(500, G.penge[e]) };
          H.giv(e, 3); G.log = navn + ' løste gåden! 🎉';
        } else { G.log = navn + ' gættede forkert: «' + String(d.løs).slice(0, 40) + '»'; G.tur = næste(H, G); }
      }
    },
    frakoblet(H, G, e) { if (G.rk[G.tur] === e && !G.slut) { G.fase = 'drej'; G.tur = næste(H, G); } },
    skiftEnhed(H, G, gl, ny) { G.rk = G.rk.map(x => x === gl ? ny : x); if (gl in G.penge) { G.penge[ny] = G.penge[gl]; delete G.penge[gl]; } if (G.slut && G.slut.af === gl) G.slut.af = ny; },
    felles: true,
    view(H, G) {
      return { kat: G.kat, tavle: [...G.gåde].map(c => (c === ' ' || !/[A-ZÆØÅ]/.test(c) || G.vist.includes(c)) ? c : '_'), vist: G.vist, fase: G.fase, værdi: G.værdi,
        tur: G.rk[G.tur], penge: G.penge, rk: G.rk, spin: G.spin, log: G.log, slut: G.slut };
    },
    tegn(el, v, api) {
      const min = v.tur === api.mig && !v.slut;
      if (!el.querySelector('#oh-hjul')) {
        el.innerHTML = '<canvas id="oh-hjul" width="320" height="320" style="width:min(260px,70vw);margin:0 auto"></canvas><div id="oh-rest"></div>';
        el._rot = 0; el._spin = v.spin.n; tegnHjul(el.querySelector('#oh-hjul'), 0);
      }
      if (v.spin.n !== el._spin) { el._spin = v.spin.n; drej(el, v.spin.i, api); }
      const sig = JSON.stringify(v) + api.mig;
      if (el._sig === sig) return; el._sig = sig;
      const ord = v.tavle.join('').split(' ');
      let h = '<p class="hint center" style="margin:6px 0">Kategori: <b>' + esc(v.kat) + '</b></p><div style="display:flex;flex-wrap:wrap;gap:10px 14px;justify-content:center;margin:8px 0">'
        + ord.map(w => '<div style="display:flex;gap:3px">' + [...w].map(c => '<span style="width:26px;height:34px;display:grid;place-items:center;border-radius:5px;font-weight:900;font-size:19px;'
          + (c === '_' ? 'background:#e9f0ff;color:transparent' : /[A-ZÆØÅ]/.test(c) ? 'background:#fff;color:#0b1630' : 'background:transparent;color:#fff;width:12px') + '">' + esc(c === '_' ? '' : c) + '</span>').join('') + '</div>').join('') + '</div>';
      h += '<div class="chips" style="justify-content:center">' + v.rk.map(e => '<span class="chip' + (e === v.tur && !v.slut ? ' mig' : '') + '"><i style="background:' + api.farve(e) + '"></i>' + esc(api.navn(e)) + ' · ' + (v.penge[e] || 0) + ' kr</span>').join('') + '</div>';
      if (v.log) h += '<p class="hint center">' + esc(v.log) + '</p>';
      if (v.slut) {
        h += '<div class="banner min">🏆 ' + esc(api.navn(v.slut.af)) + ' løste gåden og får 3 point</div>';
        if (api.vært) h += '<div class="hostbar"><button class="btn ok big" id="oh-ny">Ny gåde →</button></div>';
      } else if (!min) {
        h += '<div class="banner">⏳ ' + esc(api.navn(v.tur)) + 's tur</div>';
      } else if (v.fase === 'kons') {
        h += '<div class="banner min">🎯 ' + v.værdi + ' kr – vælg en konsonant</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">'
          + KONS.map(c => '<button class="btn" data-k="' + c + '" style="padding:10px 0"' + (v.vist.includes(c) ? ' disabled' : '') + '>' + c + '</button>').join('') + '</div>';
      } else {
        const råd = (v.penge[api.mig] || 0) >= PRIS;
        h += '<div class="banner min">🎯 Din tur</div><button class="btn big ok" id="oh-drej">🎡 Drej hjulet</button>'
          + '<p class="hint center" style="margin:12px 0 6px">Køb en vokal (' + PRIS + ' kr)' + (råd ? '' : ' – du har ikke råd endnu') + '</p><div style="display:grid;grid-template-columns:repeat(9,1fr);gap:5px">'
          + VOKALER.map(c => '<button class="btn sec" data-v="' + c + '" style="padding:10px 0"' + (!råd || v.vist.includes(c) ? ' disabled' : '') + '>' + c + '</button>').join('') + '</div>'
          + '<div class="row" style="margin-top:12px"><input class="in" id="oh-løs" placeholder="Løs gåden" style="font-size:16px"><button class="btn" id="oh-løsb" style="flex:0 0 28%">Løs</button></div>';
      }
      el.querySelector('#oh-rest').innerHTML = h;
      const q = s => el.querySelector(s);
      if (q('#oh-drej')) q('#oh-drej').onclick = () => { q('#oh-drej').disabled = true; api.kald({ drej: 1 }); };
      el.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => api.kald({ k: b.dataset.k }); });
      el.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => api.kald({ v: b.dataset.v }); });
      if (q('#oh-løsb')) q('#oh-løsb').onclick = () => { const t = q('#oh-løs').value.trim(); if (t) api.kald({ løs: t }); };
      if (q('#oh-ny')) q('#oh-ny').onclick = () => api.kald({ ny: 1 });
      if (v.slut && el._vundet !== v.slut.af + v.kat) { el._vundet = v.slut.af + v.kat; api.lyd.vind(); }
      if (min) api.vib(40);
    },
  });

  const FARV = ['#3a86ff', '#ff006e', '#ffbe0b', '#8338ec', '#06d6a0', '#fb5607'];
  function tegnHjul(cv, rot) {
    const c = cv.getContext('2d'), W = cv.width, r = W / 2 - 8, n = HJUL.length, a = Math.PI * 2 / n;
    c.clearRect(0, 0, W, W); c.save(); c.translate(W / 2, W / 2); c.rotate(rot);
    for (let i = 0; i < n; i++) {
      const f = HJUL[i];
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * a - Math.PI / 2 - a / 2, (i + 1) * a - Math.PI / 2 - a / 2); c.closePath();
      c.fillStyle = f === 'Fallit' ? '#111' : f === 'Mist tur' ? '#eee' : FARV[i % FARV.length]; c.fill();
      c.strokeStyle = '#0b1630'; c.lineWidth = 2; c.stroke();
      c.save(); c.rotate(i * a); c.fillStyle = f === 'Mist tur' ? '#111' : '#fff'; c.font = 'bold ' + (typeof f === 'number' ? 18 : 13) + 'px sans-serif';
      c.textAlign = 'right'; c.textBaseline = 'middle'; c.rotate(-Math.PI / 2); c.fillText(String(f), r - 10, 0); c.restore();
    }
    c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.fillStyle = '#0b1630'; c.fill(); c.restore();
    c.beginPath(); c.moveTo(W / 2 - 12, 2); c.lineTo(W / 2 + 12, 2); c.lineTo(W / 2, 30); c.closePath(); c.fillStyle = '#ffd166'; c.fill();
  }
  function drej(el, i, api) {
    const cv = el.querySelector('#oh-hjul'), n = HJUL.length, a = Math.PI * 2 / n;
    const mål = -i * a, start = el._rot || 0;
    let slut = mål; while (slut < start + Math.PI * 6) slut += Math.PI * 2;
    const t0 = performance.now(), T = 2600; let sidstTik = -1;
    const trin = t => {
      const p = Math.min(1, (t - t0) / T), e = 1 - Math.pow(1 - p, 3), rot = start + (slut - start) * e;
      tegnHjul(cv, rot); const tik = Math.floor(rot / a); if (tik !== sidstTik) { sidstTik = tik; if (p < .97) api.lyd.klik(); }
      if (p < 1) requestAnimationFrame(trin); else { el._rot = slut % (Math.PI * 2); const f = HJUL[i]; if (f === 'Fallit') api.lyd.fejl(); else if (f !== 'Mist tur') api.lyd.ok(); }
    };
    requestAnimationFrame(trin);
  }
})();
