/* Blå skæg – Hangman for 2-4 spillere.
 * På skift gætter man et bogstav. Rigtigt bogstav: +1 og man fortsætter. Forkert: næste spiller.
 * Den, der gætter sidste bogstav – eller gætter hele ordet på sin tur – får +3. Seks fejl, og alle taber ordet.
 * Ordet ligger kun hos værten, indtil runden er slut. */
(function () {
  const { esc, rnd } = BS;
  const ORD = [
    ['ELEFANT', 'Dyr'], ['KÆNGURU', 'Dyr'], ['PINGVIN', 'Dyr'], ['SKILDPADDE', 'Dyr'], ['BLÆKSPRUTTE', 'Dyr'], ['GIRAF', 'Dyr'], ['ISBJØRN', 'Dyr'],
    ['KROKODILLE', 'Dyr'], ['FLAMINGO', 'Dyr'], ['EGERN', 'Dyr'], ['PAPEGØJE', 'Dyr'], ['HVALROS', 'Dyr'],
    ['JORDBÆR', 'Frugt og grønt'], ['ANANAS', 'Frugt og grønt'], ['BLOMKÅL', 'Frugt og grønt'], ['AGURK', 'Frugt og grønt'], ['VANDMELON', 'Frugt og grønt'],
    ['PANDEKAGE', 'Mad'], ['FLÆSKESTEG', 'Mad'], ['FRIKADELLE', 'Mad'], ['RUGBRØD', 'Mad'], ['PIZZA', 'Mad'], ['RISALAMANDE', 'Mad'], ['LAKRIDS', 'Slik'],
    ['MOTORCYKEL', 'Transport'], ['HELIKOPTER', 'Transport'], ['UBÅD', 'Transport'], ['TRAKTOR', 'Transport'], ['RUMRAKET', 'Transport'], ['CYKEL', 'Transport'],
    ['TROMPET', 'Musik'], ['GUITAR', 'Musik'], ['TROMMESÆT', 'Musik'], ['KLAVER', 'Musik'],
    ['FYRTÅRN', 'Bygning'], ['SLOT', 'Bygning'], ['VINDMØLLE', 'Bygning'], ['KIRKETÅRN', 'Bygning'],
    ['VULKAN', 'Natur'], ['REGNBUE', 'Natur'], ['VANDFALD', 'Natur'], ['TORDENVEJR', 'Natur'], ['GLETSJER', 'Natur'],
    ['PARAPLY', 'Ting'], ['TANDBØRSTE', 'Ting'], ['KØLESKAB', 'Ting'], ['STØVSUGER', 'Ting'], ['KOMPAS', 'Ting'], ['SKRUETRÆKKER', 'Ting'],
    ['FODBOLD', 'Sport'], ['HÅNDBOLD', 'Sport'], ['SVØMNING', 'Sport'], ['BADMINTON', 'Sport'], ['SKISPORT', 'Sport'],
    ['ASTRONAUT', 'Job'], ['BRANDMAND', 'Job'], ['TANDLÆGE', 'Job'], ['POLITIBETJENT', 'Job'], ['KOK', 'Job'],
    ['JULEMAND', 'Højtid'], ['PÅSKEÆG', 'Højtid'], ['FASTELAVN', 'Højtid'], ['NYTÅRSRAKET', 'Højtid'],
    ['SØRØVER', 'Eventyr'], ['DRAGE', 'Eventyr'], ['TROLDMAND', 'Eventyr'], ['HAVFRUE', 'Eventyr'], ['SKATTEKORT', 'Eventyr'],
    ['TRAMPOLIN', 'Leg'], ['GYNGE', 'Leg'], ['SJIPPETOV', 'Leg'], ['VERDENSKORT', 'Ting'], ['BLÅBÆR', 'Frugt og grønt'],
  ];
  const ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ'.split('');
  const næste = (H, G, i) => { const n = G.rk.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; const p = H.find(G.rk[j]); if (p && p.online) return j; } return i; };
  function nytOrd(H, G) {
    let w; do { w = ORD[rnd(ORD.length)]; } while (G.brugt.includes(w[0]) && G.brugt.length < ORD.length - 1);
    G.brugt.push(w[0]);
    Object.assign(G, { ord: w[0], hint: w[1], gaet: [], fejl: 0, slut: null, sidst: null });
  }
  BS.registrer({
    id: 'hangman', navn: 'Hangman', e: '🪢', min: 2, max: 4,
    d: 'Gæt et bogstav på skift. Rigtigt = point, og du fortsætter.',
    start(H) {
      const G = { rk: H.spillere().map(p => p.enhed), tur: 0, brugt: [], runde: 0 };
      G.tur = rnd(G.rk.length); nytOrd(H, G); return G;
    },
    kald(H, G, e, d) {
      if (d.ny) { if (G.slut) { G.runde++; G.tur = næste(H, G, G.tur); nytOrd(H, G); } return; }
      if (G.slut || G.rk[G.tur] !== e) return;
      const navn = H.navn(e);
      if (d.helt) {
        const g = String(d.helt).toUpperCase().replace(/\s+/g, '');
        if (g === G.ord) { H.giv(e, 3 + [...new Set(G.ord)].filter(c => !G.gaet.includes(c)).length); G.gaet = [...new Set(G.ord)]; G.slut = { vandt: true, af: e }; G.sidst = { navn, b: g, ok: true }; }
        else { G.fejl = Math.min(6, G.fejl + 2); G.sidst = { navn, b: g, ok: false }; if (G.fejl >= 6) G.slut = { vandt: false }; else G.tur = næste(H, G, G.tur); }
        return;
      }
      const b = String(d.b || '').toUpperCase();
      if (!ALF.includes(b) || G.gaet.includes(b)) return;
      G.gaet.push(b);
      if (G.ord.includes(b)) {
        H.giv(e, 1); G.sidst = { navn, b, ok: true };
        if ([...G.ord].every(c => G.gaet.includes(c))) { H.giv(e, 3); G.slut = { vandt: true, af: e }; }
      } else {
        G.fejl++; G.sidst = { navn, b, ok: false };
        if (G.fejl >= 6) G.slut = { vandt: false }; else G.tur = næste(H, G, G.tur);
      }
    },
    frakoblet(H, G, e) { if (G.rk[G.tur] === e && !G.slut) G.tur = næste(H, G, G.tur); },
    skiftEnhed(H, G, gl, ny) { G.rk = G.rk.map(x => x === gl ? ny : x); },
    view(H, G) {
      return { maske: [...G.ord].map(c => G.gaet.includes(c) ? c : '_'), ord: G.slut ? G.ord : null, hint: G.hint, gaet: G.gaet, fejl: G.fejl,
        tur: G.rk[G.tur], sidst: G.sidst, slut: G.slut, runde: G.runde };
    },
    felles: true,
    tegn(el, v, api) {
      const min = v.tur === api.mig && !v.slut;
      const g = (n, s) => (v.fejl >= n ? s : '');
      const død = v.slut && !v.slut.vandt;
      let h = '<p class="hint center" style="margin:0">Kategori: <b>' + esc(v.hint) + '</b> · ' + (6 - v.fejl) + ' liv tilbage</p>'
        + '<svg viewBox="0 0 200 200" style="width:min(170px,46vw);display:block;margin:4px auto"><g stroke="#9fb0d6" stroke-width="6" stroke-linecap="round" fill="none">'
        + '<line x1="16" y1="190" x2="132" y2="190"/><line x1="54" y1="190" x2="54" y2="14"/><line x1="54" y1="14" x2="140" y2="14"/><line x1="140" y1="14" x2="140" y2="34"/></g>'
        + '<g stroke="' + (død ? '#ef476f' : '#ffd166') + '" stroke-width="6" stroke-linecap="round" fill="none">'
        + g(1, '<circle cx="140" cy="50" r="16"/>') + g(2, '<line x1="140" y1="66" x2="140" y2="116"/>') + g(3, '<line x1="140" y1="80" x2="118" y2="104"/>')
        + g(4, '<line x1="140" y1="80" x2="162" y2="104"/>') + g(5, '<line x1="140" y1="116" x2="122" y2="150"/>') + g(6, '<line x1="140" y1="116" x2="158" y2="150"/>') + '</g></svg>'
        + '<div style="font-size:clamp(26px,8vw,44px);font-weight:900;letter-spacing:.22em;text-align:center;margin:6px 0;word-break:break-all">' + esc((v.ord ? [...v.ord] : v.maske).join('')) + '</div>';
      if (v.sidst) h += '<p class="hint center">' + esc(v.sidst.navn) + ' gættede <b>' + esc(v.sidst.b) + '</b> ' + (v.sidst.ok ? '✅' : '❌') + '</p>';
      if (v.slut) {
        h += '<div class="banner' + (v.slut.vandt ? ' min' : '') + '">' + (v.slut.vandt ? '🎉 ' + esc(api.navn(v.slut.af)) + ' løste ordet!' : '💀 Hængt! Ordet var ' + esc(v.ord)) + '</div>';
        if (api.vært) h += '<div class="hostbar"><button class="btn ok big" id="hg-ny">Nyt ord →</button></div>';
      } else {
        h += '<div class="banner' + (min ? ' min' : '') + '">' + (min ? '🎯 Din tur – vælg et bogstav' : '⏳ ' + esc(api.navn(v.tur)) + 's tur') + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px">' + ALF.map(c => '<button class="btn" data-b="' + c + '" style="padding:10px 0;' + (v.gaet.includes(c) ? 'opacity:.2' : '') + '"' + (!min || v.gaet.includes(c) ? ' disabled' : '') + '>' + c + '</button>').join('') + '</div>'
          + (min ? '<div class="row" style="margin-top:12px"><input class="in" id="hg-helt" placeholder="Gæt hele ordet" style="font-size:16px"><button class="btn sec" id="hg-gaet" style="flex:0 0 30%">Gæt</button></div><p class="hint center">Forkert gæt på hele ordet koster 2 liv.</p>' : '');
      }
      const sig = JSON.stringify(v) + api.mig;
      if (el.dataset.s === sig) return; el.dataset.s = sig;
      if (v.sidst && el.dataset.sidst !== JSON.stringify(v.sidst)) { el.dataset.sidst = JSON.stringify(v.sidst); v.sidst.ok ? api.lyd.ok() : api.lyd.fejl(); if (v.slut && v.slut.vandt) api.lyd.vind(); }
      el.innerHTML = h;
      el.querySelectorAll('[data-b]').forEach(b => { b.onclick = () => { b.disabled = true; api.kald({ b: b.dataset.b }); }; });
      const gb = el.querySelector('#hg-gaet'); if (gb) gb.onclick = () => { const t = el.querySelector('#hg-helt').value.trim(); if (t) api.kald({ helt: t }); };
      const ny = el.querySelector('#hg-ny'); if (ny) ny.onclick = () => api.kald({ ny: 1 });
      if (min) api.vib(40);
    },
  });
})();
