/* Blå skæg – sprog (dansk/engelsk) og feedback.
 *
 * 18/11-2026 (Michael): spilleren vælger 🇩🇰/🇬🇧 på startskærmen. Koden er skrevet på dansk; når sproget er
 * engelsk, oversætter en MutationObserver alle tekster på skærmen (tekstnoder + placeholder/title) via
 * ordbogen D og mønstrene P nedenfor. Tekst tegnet på canvas og confirm()-dialoger bruger BS.t(...).
 * Spilindhold (ord i Hangman, gåder i Ordhjulet, ord i Tegn og gæt) følger VÆRTENS sprog, så alle gætter
 * på det samme. Nye danske tekster i spillene skal have en linje i D eller P, ellers vises de på dansk.
 */
(function () {
  /* ---------------- sprogvalg ---------------- */
  const LS = 'bs_sprog';
  let gemt = null; try { gemt = JSON.parse(localStorage.getItem(LS)); } catch (e) {}
  BS.sprog = gemt === 'da' || gemt === 'en' ? gemt : (/^(da|nb|nn|no)\b/i.test(navigator.language || '') ? 'da' : 'en');
  document.documentElement.lang = BS.sprog;

  /* ---------------- ordbog: hele tekster (uden omkringliggende emoji/tegn) ---------------- */
  const D = {
    // kerne / start / lobby
    'Spil sammen – hver på sin telefon. 2–4 spillere': 'Play together – each on your own phone. 2–4 players',
    'Dit navn': 'Your name', 'Opret nyt rum': 'Create new room', 'Opretter': 'Creating', 'Deltag med kode': 'Join with code', 'Deltag': 'Join',
    'Spil i Blå skæg': 'Games in Blå skæg', 'Skriv dit navn først': 'Enter your name first', 'Skriv den 4-cifrede kode fra værten': 'Enter the 4-digit code from the host',
    'Netværksdelen kunne ikke hentes – tjek internettet': 'Could not load the network part – check your internet',
    'Prøv igen – koden var optaget': 'Try again – the code was taken', 'Forbindelsen til rummet er lukket': 'The connection to the room was closed',
    'Fandt ikke rummet – tjek koden': "Couldn't find the room – check the code", 'Kunne ikke forbinde – prøv igen': "Couldn't connect – try again",
    'Kunne ikke sende': "Couldn't send", 'Stop spillet': 'Stop the game', 'Luk': 'Close', 'Forlad': 'Leave',
    'Luk rummet for alle': 'Close the room for everyone', 'Forlad rummet': 'Leave the room',
    'Stop spillet for alle og gå tilbage til lobbyen': 'Stop the game for everyone and go back to the lobby',
    'Del koden – de andre åbner Blå skæg og skriver den': 'Share the code – the others open Blå skæg and enter it',
    'Vælg et spil': 'Choose a game', 'Nulstil point': 'Reset points', 'Spil igen': 'Play again', 'Giv feedback': 'Give feedback', 'Støt Blå skæg': 'Support Blå skæg', 'Åbn Ko-fi i browseren': 'Open Ko-fi in the browser',
    'Din tur': 'Your turn', 'DIN TUR': 'YOUR TURN', 'Uafgjort': 'Draw', 'Venter på de andre': 'Waiting for the others', 'mod': 'vs', 'ingen point': 'no points',
    // spilnavne
    'Sænk slagskibe': 'Battleships', 'Ordhjulet': 'Word Wheel', 'Sæt knappenålen': 'Drop the Pin', 'Lysbaner': 'Light Cycles', 'Diskos-arena': 'Disc Arena',
    'Tegn og gæt': 'Draw & Guess', '4 på stribe': 'Four in a Row', 'Kryds og bolle': 'Tic-Tac-Toe', 'Snyd': 'Cheat', 'Krig': 'War', 'Bilbane': 'Race Track',
    'Forsvar borgen': 'Defend the Castle', 'Kanondyst': 'Cannon Duel',
    // spilbeskrivelser
    'Gæt et bogstav på skift. Rigtigt = point, og du fortsætter': 'Take turns guessing a letter. Right = points, and you go again',
    'Skyd på modstandernes flåder. Ram = skyd igen. Sidste med skibe vinder': 'Fire at the other fleets. Hit = shoot again. Last one with ships wins',
    'Drej hjulet, gæt bogstaver og løs gåden før de andre': 'Spin the wheel, guess letters and solve the puzzle before the others',
    'Hvor ligger stedet? Sæt nålen på kortet – tættest vinder': 'Where is the place? Drop your pin on the map – closest wins',
    'Alle kører samtidig i 2 minutter. Spis æbler – flest point vinder': 'Everyone plays at once for 2 minutes. Eat apples – most points wins',
    'Kør på lys-motorcykel og efterlad en mur. Ram ingen mure – sidste kører vinder': 'Ride a light cycle and leave a wall behind. Hit no walls – last rider wins',
    'Kast lysende diske, der preller af væggene. Tre træffere, og du er ude': "Throw glowing discs that bounce off the walls. Three hits and you're out",
    'Én tegner, resten gætter. Hurtigste gæt får flest point': 'One draws, the rest guess. Fastest guess gets the most points',
    'Slå op til 3 gange, hold de gode terninger og fyld blokken ud': 'Roll up to 3 times, keep the good dice and fill in the score sheet',
    'Slå 6 for at komme ud, smid de andre hjem og få alle fire brikker i mål': 'Roll a 6 to get out, knock the others home and get all four pieces home',
    'Få fire i træk – vandret, lodret eller på skrå': 'Get four in a row – across, down or diagonally',
    'Tre på stribe. Vinderen bliver ved bordet': 'Three in a row. The winner stays at the table',
    'Læg kort med bagsiden op og påstå, hvad de er. Råb SNYD, hvis du tror, de lyver': "Play cards face down and claim what they are. Shout CHEAT if you think they're lying",
    'Alle vender et kort – højeste tager stikket. Ens kort betyder krig': 'Everyone flips a card – highest takes the trick. Equal cards mean war',
    'Ræs 3 omgange rundt om banen. Træk fingeren til siden for at styre': 'Race 3 laps around the track. Drag your finger sideways to steer',
    'Co-op: stå sammen om borgen mod bølger af monstre. Tryk for at skyde': 'Co-op: defend the castle together against waves of monsters. Tap to shoot',
    'Sigt med vinkel og kraft, regn med vinden og spræng de andre kanoner': 'Aim with angle and power, mind the wind and blow up the other cannons',
    // valg i lobbyen
    'Danmark': 'Denmark', 'Europa': 'Europe', 'Verden': 'World', 'Normal': 'Normal', 'Let': 'Easy', 'Svær': 'Hard',
    'Let – svag vind, lang sigtelinje': 'Easy – light wind, long aiming line', 'Svær – stærk vind, ingen sigtelinje': 'Hard – strong wind, no aiming line',
    // kategorier (Hangman / Ordhjulet)
    'Kategori': 'Category', 'Dyr': 'Animals', 'Frugt og grønt': 'Fruit and veg', 'Mad': 'Food', 'Slik': 'Sweets', 'Musik': 'Music', 'Bygning': 'Building',
    'Natur': 'Nature', 'Ting': 'Things', 'Højtid': 'Holiday', 'Eventyr': 'Fairy tale', 'Leg': 'Play', 'Ordsprog': 'Proverb', 'Udtryk': 'Phrase',
    'Sted i Danmark': 'Place in Denmark', 'Sted i verden': 'Place in the world', 'Mad og drikke': 'Food and drink', 'Aktivitet': 'Activity',
    // Hangman
    'vælg et bogstav': 'choose a letter', 'Nyt ord': 'New word', 'Gæt hele ordet': 'Guess the whole word', 'Gæt': 'Guess',
    'Forkert gæt på hele ordet koster 2 liv': 'A wrong guess on the whole word costs 2 lives',
    // Ordhjulet
    'Fallit': 'Bankrupt', 'Mist tur': 'Lose a turn', 'Ny gåde': 'New puzzle', 'Drej hjulet': 'Spin the wheel', 'Løs gåden': 'Solve the puzzle', 'Løs': 'Solve',
    'vælg en konsonant': 'choose a consonant', 'du har ikke råd endnu': "you can't afford it yet",
    // Knappenålen
    'Henter kort': 'Loading map', 'Kortet kunne ikke hentes – tjek internettet': "Couldn't load the map – check your internet", 'Nål sat': 'Pin placed',
    'Tryk på kortet for at sætte din nål': 'Tap the map to drop your pin', 'tryk igen for at flytte den': 'tap again to move it',
    'Sæt nålen her': 'Drop the pin here', 'Vis svaret nu': 'Show the answer now', 'Næste sted': 'Next place', 'Venter på næste sted': 'Waiting for the next place',
    'København': 'Copenhagen', 'Rom': 'Rome', 'Wien': 'Vienna', 'Prag': 'Prague', 'Warszawa': 'Warsaw', 'Bruxelles': 'Brussels', 'Lissabon': 'Lisbon',
    'Athen': 'Athens', 'Bukarest': 'Bucharest', 'Beograd': 'Belgrade', 'Milano': 'Milan', 'München': 'Munich', 'Hamborg': 'Hamburg', 'Venedig': 'Venice',
    'Napoli': 'Naples', 'Göteborg': 'Gothenburg', 'Kyiv': 'Kyiv', 'Kairo': 'Cairo', 'Moskva': 'Moscow', 'Teheran': 'Tehran', 'Addis Abeba': 'Addis Ababa',
    // Slagskibe
    'Din flåde – bland, til du er tilfreds': 'Your fleet – shuffle until you are happy', 'Bland': 'Shuffle', 'Klar': 'Ready',
    'Din flåde er sænket – du kigger med': 'Your fleet is sunk – you are watching', 'skyd': 'fire', 'plask': 'splash', 'ram': 'hit', 'Dit hav': 'Your sea', 'dig': 'you',
    'hangarskib': 'carrier', 'slagskib': 'battleship', 'krydser': 'cruiser', 'destroyer': 'destroyer',
    // Yatzy
    'Enere': 'Ones', 'Toere': 'Twos', 'Treere': 'Threes', 'Firere': 'Fours', 'Femmere': 'Fives', 'Seksere': 'Sixes', '1 par': 'One pair', '2 par': 'Two pairs',
    '3 ens': 'Three of a kind', '4 ens': 'Four of a kind', 'Lille straight': 'Small straight', 'Stor straight': 'Large straight', 'Fuldt hus': 'Full house',
    'Chance': 'Chance', 'Yatzy': 'Yatzy', 'slå terningerne': 'roll the dice', 'hold og slå igen, eller vælg et felt': 'hold and roll again, or pick a box',
    'vælg et felt': 'pick a box', 'Slå': 'Roll', 'Tryk på en terning for at holde den': 'Tap a die to hold it', 'Sum (bonus ved 63': 'Sum (bonus at 63',
    'Bonus': 'Bonus', 'I alt': 'Total',
    // 4 på stribe / kryds og bolle
    'Ny kamp': 'New match', 'Næste kamp (vinderen bliver': 'Next match (winner stays',
    // Snyd / Krig
    'Ingen råbte snyd': 'Nobody called cheat', 'venter': 'waiting', 'tror du på det': 'do you believe it', 'SNYD': 'CHEAT', 'Tror på det': 'Believe it',
    'Bunken er tom': 'The pile is empty', 'tryk for at vælge': 'tap to select', 'Du må gerne snyde – hvis ingen opdager det': "You're allowed to cheat – if nobody notices",
    'knægt': 'jack', 'knægte': 'jacks', 'dame': 'queen', 'damer': 'queens', 'konge': 'king', 'konger': 'kings', 'es': 'ace', 'esser': 'aces',
    'KRIG': 'WAR', 'Du er løbet tør for kort': 'You are out of cards', 'Vend dit kort': 'Flip your card', 'Vend kort': 'Flip card', 'Stop auto': 'Stop auto',
    'Auto': 'Auto', 'hånd': 'hand',
    // Ludo
    'kan ikke rykke': "can't move", 'Tryk på en brik (du slog': 'Tap a piece (you rolled', 'slå': 'roll',
    // Tegn og gæt
    'Vælg et ord at tegne': 'Choose a word to draw', 'Ordet var': 'The word was', 'Tegn': 'Draw', 'Du gættede det': 'You guessed it',
    'Tegn ordet – ingen bogstaver eller tal': 'Draw the word – no letters or numbers', 'Skriv dit gæt': 'Type your guess', 'gættede det': 'guessed it',
    // realtid
    'Swipe på skærmen for at dreje · pc: piletaster': 'Swipe on the screen to turn · pc: arrow keys', 'Uafgjort – alle røg ud': "Draw – everyone's out",
    'Du er ude – se med': "You're out – watch along", 'Du ser med': "You're watching", 'Undgå murene': 'Avoid the walls', 'Tiden er gået': "Time's up",
    'spis æbler': 'eat apples', 'Træk for at løbe · tap for at kaste': 'Drag to run · tap to throw',
    'eller tap med en anden finger, mens du løber': 'or tap with another finger while running',
    'Hele skærmen virker: træk = løb, tap = kast · pc: WASD/pile + mellemrum': 'The whole screen works: drag = run, tap = throw · pc: WASD/arrows + space',
    // Bilbane / Borg
    'Hele skærmen kan bruges som rat · pc: ← →': 'The whole screen works as a steering wheel · pc: ← →',
    'Hurtigere': 'Faster', 'Stærkere': 'Stronger', 'Reparer +25': 'Repair +25',
    'Tryk på banen for at skyde fra dit tårn (din farve). Guldet er fælles – aftal hvem der køber': 'Tap the field to shoot from your tower (your colour). The gold is shared – agree on who buys',
    // Kanondyst
    'Alle blev sprængt i luften': 'Everyone was blown up', 'Du er begravet': 'You are buried', 'grav dig fri': 'dig yourself out', 'Grav dig fri': 'Dig yourself out',
    'træk på banen for at sigte': 'drag on the field to aim', 'skyd flyet ned for at få et jorddrop': 'shoot down the plane to get a dirt drop',
    'Der ligger jord oven på din kanon. Grav dig fri – tykke bunker kan kræve flere ture': 'There is dirt on top of your cannon. Dig yourself out – thick piles can take several turns',
    'Træk baglæns': 'Pull back', 'på banen som en slangebøsse': 'on the field like a slingshot', 'slip': 'release', 'for at skyde': 'to fire',
    'Skyd flyet ned, når det kommer, for at få et 🟫 jorddrop': 'Shoot down the plane when it appears to get a 🟫 dirt drop', 'jorddrop': 'dirt drop',
    'Træk til venstre / højre for at styre': 'Drag left / right to steer', 'speederen er automatisk': 'the throttle is automatic',
    'Granat': 'Grenade', 'Storbombe': 'Big bomb', 'Trippelskud': 'Triple shot', 'Jorddrop': 'Dirt drop', 'Vind': 'Wind', '(begravet)': '(buried)',
    // 18/11-2026: nye bomber og kasser i Kanondyst + liggende layout
    'Hoppebombe': 'Bouncer', 'Klyngebombe': 'Cluster bomb', 'Borebombe': 'Driller', 'Megabombe': 'Mega bomb',
    'skyd flyet ned og få kassen': 'shoot down the plane and get the crate', 'Drej telefonen for en større bane': 'Turn your phone for a bigger field',
    'Skyd flyet ned og få kassen: 🟫 jord · 🛡️ skjold · ❤️ liv · 🎇 klynge · ☢️ mega': 'Shoot down the plane and get the crate: 🟫 dirt · 🛡️ shield · ❤️ health · 🎇 cluster · ☢️ mega',
    'skjold': 'shield', 'megabombe': 'mega bomb', 'klyngebombe': 'cluster bomb',
    // Airhockey og Stjerneværn (18/11-2026, erstatter Bilbane og Forsvar borgen)
    'Airhockey': 'Air Hockey', 'Skub pucken i de andres mål – 1 mod 1 eller 2 mod 2. Først til 7': 'Push the puck into the other goal – 1 vs 1 or 2 vs 2. First to 7',
    'Træk din kølle rundt på din egen halvdel': 'Drag your mallet around your own half',
    'Stjerneværn': 'Star Guard', 'Co-op: forsvar jorden sammen mod bølger af rumvæsner. Træk for at flytte – skuddene går af sig selv': 'Co-op: defend Earth together against waves of aliens. Drag to move – it fires by itself',
    'Træk til siden for at flytte dit skib': 'Drag sideways to move your ship', 'skuddene går af sig selv': 'it fires by itself', 'fang': 'catch', 'Bølge klaret': 'Wave cleared',
    // spillermærker i lobbyen (18/11-2026)
    'resten i kø': 'others queue', '1 mod 1 eller 2 mod 2': '1 vs 1 or 2 vs 2', 'co-op': 'co-op',
    // feedback
    'Feedback': 'Feedback', 'Hvad kan gøres bedre? Fejl, ønsker, nye spil …': 'What could be better? Bugs, wishes, new games …',
    'Send': 'Send', 'Annullér': 'Cancel', 'Tak! Din feedback er sendt': 'Thanks! Your feedback has been sent',
    'Skriv lidt mere (mindst 5 tegn)': 'Write a little more (at least 5 characters)', 'Højst 1000 tegn': 'At most 1000 characters',
    'Vent et øjeblik, før du sender': 'Wait a moment before sending', 'Højst 2 links pr. besked': 'At most 2 links per message',
    'Du har sendt feedback for nylig – prøv igen om lidt': 'You sent feedback recently – try again in a bit',
    'Du har sendt nok feedback for i dag – tak': "You've sent plenty of feedback today – thanks",
    'Kunne ikke sende – tjek internettet': "Couldn't send – check your internet", 'Feedback er ikke sat op endnu': 'Feedback is not set up yet',
    'Skriv ikke personlige oplysninger. Beskeden er anonym – kun teksten, spil og sprog sendes': "Don't include personal details. The message is anonymous – only the text, game and language are sent",
    'Sender': 'Sending',
  };

  /* ---------------- mønstre: tekster med navne og tal ---------------- */
  const P = [
    [/^Spillet kræver mindst (\d+) spillere$/, 'This game needs at least $1 players'],
    [/^Rummet er fuldt – der kan højst være (\d+) spillere$/, 'The room is full – at most $1 players'],
    [/^Netværksfejl \((.*)$/, 'Network error ($1'],
    [/^Rum (\d+)$/, 'Room $1'],
    [/^Spillere \((\d+)\/(\d+)\)?$/, (m, a, b) => 'Players (' + a + '/' + b + (m.endsWith(')') ? ')' : '')],
    [/^Venter på, at (.+) vælger et spil$/, 'Waiting for $1 to choose a game'],
    [/^(.+) vælger, hvad der skal ske nu$/, '$1 decides what happens next'],
    [/^([\s\S]+?)\s*\(mindst (\d+) spillere\)?$/, (m, d, n) => tr(d) + ' (at least ' + n + ' players' + (m.endsWith(')') ? ')' : '')],
    [/^(.+) stoppede spillet$/, '$1 stopped the game'],
    [/^(\d+) sek$/, '$1 sec'],
    [/^(-|−)?(\d+) point$/, (m, s, n) => (s || '') + n + ' points'],
    [/^(\d+) liv tilbage$/, '$1 lives left'],
    [/^(.+)s tur$/, "$1's turn"],
    // Hangman
    [/^(.+) nåede ikke at gætte$/, '$1 ran out of time'],
    [/^(.+) gættede$/, '$1 guessed'],
    [/^(.+) løste ordet!?$/, '$1 solved the word!'],
    [/^Hængt! Ordet var (.*)$/, 'Hanged! The word was $1'],
    // Ordhjulet
    [/^(.+) nåede det ikke$/, "$1 didn't make it"],
    [/^(.+) ramte FALLIT$/, '$1 hit BANKRUPT'],
    [/^(.+) mistede turen$/, '$1 lost the turn'],
    [/^(.+) drejede (\d+) kr$/, '$1 spun $2'],
    [/^(\d+) kr$/, '$1'],
    [/^(.+) · (\d+) kr$/, '$1 · $2'],
    [/^(.+): (\d+)× (.) = (\d+) kr$/, '$1: $2× $3 = $4'],
    [/^(.+): intet (.)$/, '$1: no $2'],
    [/^(.+) købte (.) \((\d+)×\)?$/, (m, n, b, k) => n + ' bought ' + b + ' (' + k + '×' + (m.endsWith(')') ? ')' : '')],
    [/^(.+) købte (.)$/, '$1 bought $2'],
    [/^men der er intet$/, "but there's none"],
    [/^(.+) løste gåden!?$/, '$1 solved the puzzle!'],
    [/^(.+) løste gåden og får 3 point$/, '$1 solved the puzzle and gets 3 points'],
    [/^(.+) gættede forkert: «(.*)$/, '$1 guessed wrong: «$2'],
    [/^Køb en vokal \((\d+) kr\)?$/, (m, n) => 'Buy a vowel (' + n + (m.endsWith(')') ? ')' : '')],
    // Knappenålen
    [/^Hvor ligger ([^?.]+)\??$/, (m, s) => 'Where is ' + tr(s) + '?'],
    [/^sted (\d+\/\d+)$/, 'place $1'],
    [/^(\d+\/\d+) er klar$/, '$1 ready'],
    [/^(.+) vandt kortspillet!?$/, '$1 won the map game!'],
    // fælles "vandt"
    [/^(.+) vandt Kanondysten!?$/, '$1 won the Cannon Duel!'],
    [/^(.+) vandt søslaget!?$/, '$1 won the sea battle!'],
    [/^(.+) vandt Tegn og gæt!?$/, '$1 won Draw & Guess!'],
    [/^(.+) vandt Ludo!?$/, '$1 won Ludo!'],
    [/^(.+) vandt med (\d+) point!?$/, '$1 won with $2 points!'],
    [/^(.+) vandt!?$/, '$1 won!'],
    // Slagskibe
    [/^Klar: (.*)$/, 'Ready: $1'],
    [/^(.+) skød på (.+): (.*)$/, (m, a, b, r) => a + ' fired at ' + tr(b) + ': ' + tr(r)],
    [/^sænkede et (.+?)!?$/, (m, s) => 'sank a ' + tr(s) + '!'],
    [/^(.+)s hav$/, "$1's sea"],
    [/^Dit (.+) blev sænket af (.+)$/, (m, s, a) => 'Your ' + tr(s) + ' was sunk by ' + a],
    // Yatzy
    [/^(.+) skrev (\d+) i «(.+?)»?$/, (m, n, p, f) => n + ' scored ' + p + ' in «' + tr(f) + '»'],
    [/^(.+) slår$/, '$1 is rolling'],
    [/^Slå igen \((\d+) tilbage\)?$/, (m, n) => 'Roll again (' + n + ' left' + (m.endsWith(')') ? ')' : '')],
    [/^Slå igen$/, 'Roll again'],
    // 4 på stribe
    [/^I køen: (.*)$/, 'In the queue: $1'],
    // Snyd / Krig
    [/^(\d+)'ere$/, "$1s"], [/^(\d+)'er$/, '$1'],
    [/^(.+) råbte SNYD!?$/, '$1 shouted CHEAT!'],
    [/^(.+) snød og tager bunken$/, '$1 cheated and takes the pile'],
    [/^(.+) talte sandt$/, '$1 told the truth'],
    [/^(.+) tager bunken$/, '$1 takes the pile'],
    [/^(.+) lagde (\d+) (.+)$/, (m, n, k, s) => n + ' played ' + k + ' ' + tr(s)],
    [/^(.+) siger: (\d+) (.+)$/, (m, n, k, s) => n + ' says: ' + k + ' ' + tr(s)],
    [/^læg 1-4 kort som «(.+?)»?$/, (m, s) => 'play 1–4 cards as «' + tr(s) + '»'],
    [/^(.+) skal lægge (.+)$/, (m, n, s) => n + ' must play ' + tr(s)],
    [/^(.+) blev af med alle kort!?$/, '$1 got rid of all their cards!'],
    [/^Dine kort \((\d+)\)?$/, (m, n) => 'Your cards (' + n + (m.endsWith(')') ? ')' : '')],
    [/^Læg\s+(\d*)\s*kort som (.+)$/, (m, n, s) => 'Play ' + (n ? n + ' ' : '') + 'card' + (n === '1' ? '' : 's') + ' as ' + tr(s)],
    [/^Læg$/, 'Play'],
    [/^(.+) tager (\d+) kort efter KRIG!?$/, '$1 takes $2 cards after WAR!'],
    [/^(.+) tager (\d+) kort$/, '$1 takes $2 cards'],
    [/^(.+) vandt alle kortene!?$/, '$1 won all the cards!'],
    [/^(.+) har flest kort efter (\d+) stik!?$/, '$1 has the most cards after $2 tricks!'],
    [/^stik (\d+)$/, 'trick $1'],
    [/^(\d+) kort$/, '$1 cards'],
    // Ludo
    [/^(.+) slog (\d+)$/, '$1 rolled $2'],
    [/^(.+) rykkede en brik ud(.*)$/, (m, n, r) => n + ' moved a piece out' + tr(r)],
    [/^(.+) rykkede (\d+)(.*)$/, (m, n, k, r) => n + ' moved ' + k + tr(r)],
    [/^og sendte (.+) hjem!?$/, 'and sent $1 home!'],
    [/^ og sendte (.+) hjem!?(.*)$/, ' and sent $1 home!$2'],
    [/^i mål!?$/, 'home!'],
    [/^Tryk på en brik \(du slog (\d+)\)?$/, (m, n) => 'Tap a piece (you rolled ' + n + (m.endsWith(')') ? ')' : '')],
    // Tegn og gæt
    [/^(.+) vælger et ord$/, '$1 is choosing a word'],
    [/^Tegn: (.*)$/, 'Draw: $1'],
    [/^Du gættede det: (.*)$/, 'You guessed it: $1'],
    [/^\((\d+) bogstaver\)?$/, (m, n) => '(' + n + ' letters' + (m.endsWith(')') ? ')' : '')],
    [/^(\d+) bogstaver$/, '$1 letters'],
    [/^Runde (\d+) af (\d+)$/, 'Round $1 of $2'],
    [/^(.+) tegner$/, '$1 is drawing'],
    [/^gættede det! \(\+(\d+)\)?$/, (m, n) => 'guessed it! (+' + n + (m.endsWith(')') ? ')' : '')],
    // realtid
    [/^Uafgjort: (.*)$/, (m, s) => 'Draw: ' + s.replace(/ og /g, ' and ')],
    [/^Du er tilbage om (\d+)$/, "You're back in $1"],
    [/^Du har (.*) tilbage$/, 'You have $1 left'],
    // Bil
    [/^I mål som nr\. (\d+)!?$/, 'Finished in place $1!'],
    [/^løbet slutter om (\d+) sek$/, 'race ends in $1 sec'],
    [/^Omgang (\d+\/\d+)$/, 'Lap $1'],
    [/^nr\. (\d+) af (\d+)$/, 'place $1 of $2'],
    // Borg
    [/^Borgen faldt i bølge (\d+)$/, 'The castle fell in wave $1'],
    [/^I klarede (\d+) bølger \(\+(\d+) point til alle\)?$/, (m, a, b) => 'you survived ' + a + ' waves (+' + b + ' points each' + (m.endsWith(')') ? ')' : '')],
    [/^Bølge (\d+) klaret! Bølge (\d+) om (\d+)$/, 'Wave $1 cleared! Wave $2 in $3'],
    [/^Bølge (\d+) om (\d+)$/, 'Wave $1 in $2'],
    [/^Bølge (\d+)$/, 'Wave $1'],
    // Kanondyst
    [/^(.+) graver sig fri$/, '$1 is digging out'],
    [/^(.+) skyder$/, '$1 is firing'],
    [/^(.+) graver$/, '$1 is digging'],
    [/^(.+) sigter$/, '$1 is aiming'],
    [/^Niveau: (.+)$/, (m, s) => 'Level: ' + tr(s)],
    [/^Vinkel (.*)$/, 'Angle $1'], [/^Kraft (.*)$/, 'Power $1'],
    [/^(.+) skød flyet ned og fik et jorddrop$/, '$1 shot down the plane and got a dirt drop'],
    [/^(.+) skød flyet ned: (.+)$/, (m, n, k) => n + ' shot down the plane: ' + tr(k)],
    [/^(\d+) liv$/, '$1 health'],
    // Airhockey / Stjerneværn
    [/^(.+) vandt (\d+)–(\d+)!?$/, '$1 won $2–$3!'],
    [/^Jorden faldt efter (\d+) bølger$/, 'Earth fell after $1 waves'],
    [/^bedste skytte: (.+)$/, 'best shot: $1'],
    [/^(\d+) ad gangen$/, '$1 at a time'],
    [/^(\d+) venter i kø$/, '$1 waiting in line'],
    // generelt: "Navn (3)" → oversæt navnet
    [/^(.+) \((\d+|∞)\)?$/, (m, s, n) => tr(s) + ' (' + n + (m.endsWith(')') ? ')' : '')],
  ];

  const harBogstav = /[A-Za-zÆØÅæøåÄÖÜäöü]/;
  const SKIL = /( – | · )/;
  function tr(s) {
    if (s == null) return s; s = String(s);
    if (!harBogstav.test(s)) return s;
    const t = s.trim(), sæt = x => s.replace(t, () => x);
    const har = k => Object.prototype.hasOwnProperty.call(D, k);
    if (har(t)) return sæt(D[t]);
    const m = t.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u), c = m ? m[2] : t;
    if (c && c !== t && har(c)) return sæt(m[1] + D[c] + m[3]);
    for (const [re, r] of P) if (re.test(t)) return sæt(t.replace(re, r));
    if (c && c !== t) for (const [re, r] of P) if (re.test(c)) return sæt(m[1] + c.replace(re, r) + m[3]);
    if (SKIL.test(t)) {                                        // "A – B · C": oversæt hver del for sig
      const dele = t.split(SKIL), ud = dele.map(d => (d === ' – ' || d === ' · ') ? d : tr(d)).join('');
      if (ud !== t) return sæt(ud);
    }
    return s;
  }
  BS.t = s => (BS.sprog === 'en' ? tr(s) : s);

  /* ---------------- oversæt skærmen løbende ---------------- */
  const ATTR = ['placeholder', 'title', 'aria-label'];
  function gå(n) {
    if (n.nodeType === 3) { const o = n.data, x = tr(o); if (x !== o) n.data = x; return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || n.hasAttribute('data-ikke-oversæt')) return;
    for (const a of ATTR) { const v = n.getAttribute(a); if (v) { const x = tr(v); if (x !== v) n.setAttribute(a, x); } }
    for (let k = n.firstChild; k; k = k.nextSibling) gå(k);
  }
  const obs = new MutationObserver(ms => {
    if (BS.sprog !== 'en') return;
    for (const m of ms) {
      if (m.type === 'childList') m.addedNodes.forEach(gå);
      else if (m.type === 'characterData') gå(m.target);
      else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName); if (v) { const x = tr(v); if (x !== v) m.target.setAttribute(m.attributeName, x); } }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });

  BS.sætSprog = l => {
    BS.sprog = l === 'en' ? 'en' : 'da';
    try { localStorage.setItem(LS, JSON.stringify(BS.sprog)); } catch (e) {}
    document.documentElement.lang = BS.sprog;
    if (BS.sprog === 'en') gå(document.body);
  };
  /* til fejlfinding: BS.mangler() viser tekster på skærmen, der stadig ser danske ud */
  BS.mangler = () => { const ud = new Set(), w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const s = w.currentNode.data.trim(); if (/[æøåÆØÅ]|\b(og|på|til|med|der|ikke|har|er|tur|spil|vælg|tryk)\b/.test(s)) ud.add(s); } return [...ud]; };

  /* ---------------- feedback ----------------
   * Sendes til en Google Formular (svarene lander i et Google Sheet, som Michael ejer).
   * Spam-værn i appen: skjult honningkrukke-felt, mindst 4 sek. i vinduet, højst 1 besked pr. 5 min og 5 pr. døgn
   * pr. telefon, 5-1000 tegn, højst 2 links, ingen dubletter. Google har selv misbrugsværn på formularer.
   * Det stopper almindelig spam og uheld – ikke en målrettet angriber; så kan formularen lukkes/skiftes i Google. */
  /* Formularen «Blå skæg – feedback» i Michaels Google Formularer (oprettet 18/11-2026). Svar ses under fanen «Svar». */
  const FB = BS.FEEDBACK || { url: 'https://docs.google.com/forms/d/e/1FAIpQLScakXnGDy9nhh2rpKehB-27QBp1t945zqPSzjVvaOOiIN6pdA/formResponse',
    felt: { tekst: 'entry.1266945771', info: 'entry.769030965' } };
  BS.version = '5';
  BS.feedback = () => {
    const T = BS.t, åbnet = Date.now();
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = '<div class="card fb"><h2>💬 ' + T('Feedback') + '</h2>'
      + '<textarea class="in" id="fb-t" maxlength="1000" placeholder="' + BS.esc(T('Hvad kan gøres bedre? Fejl, ønsker, nye spil …')) + '"></textarea>'
      + '<input class="hp" id="fb-hp" tabindex="-1" autocomplete="off" aria-hidden="true" name="website">'
      + '<p class="hint" style="margin:8px 0 0">' + T('Skriv ikke personlige oplysninger. Beskeden er anonym – kun teksten, spil og sprog sendes') + '.</p>'
      + '<p class="hint" id="fb-msg" style="min-height:1.3em;color:var(--gold);margin:6px 0"></p>'
      + '<div class="row"><button class="btn sec" id="fb-nej">' + T('Annullér') + '</button><button class="btn ok" id="fb-ja">' + T('Send') + '</button></div></div>';
    document.body.appendChild(o);
    const q = s => o.querySelector(s), msg = t => { q('#fb-msg').textContent = T(t); };
    const luk = () => o.remove();
    q('#fb-nej').onclick = luk; o.onclick = e => { if (e.target === o) luk(); };
    setTimeout(() => q('#fb-t').focus(), 50);
    q('#fb-ja').onclick = () => {
      const tekst = q('#fb-t').value.trim();
      let log = []; try { log = JSON.parse(localStorage.getItem('bs_fb') || '[]').filter(x => Date.now() - x.t < 864e5); } catch (e) {}
      if (q('#fb-hp').value) { luk(); BS.toast(T('Tak! Din feedback er sendt')); return; }      // bot: lad som om
      if (tekst.length < 5) return msg('Skriv lidt mere (mindst 5 tegn)');
      if (tekst.length > 1000) return msg('Højst 1000 tegn');
      if (Date.now() - åbnet < 4000) return msg('Vent et øjeblik, før du sender');
      if ((tekst.match(/https?:\/\/|www\./gi) || []).length > 2) return msg('Højst 2 links pr. besked');
      if (log.some(x => Date.now() - x.t < 3e5)) return msg('Du har sendt feedback for nylig – prøv igen om lidt');
      if (log.length >= 5) return msg('Du har sendt nok feedback for i dag – tak');
      if (log.some(x => x.h === hash(tekst))) { luk(); BS.toast(T('Tak! Din feedback er sendt')); return; }
      if (!FB.url) return msg('Feedback er ikke sat op endnu');
      const info = [BS.sprog, BS.version || '', (navigator.userAgent.match(/iPhone|iPad|Android|Windows|Mac/) || ['?'])[0]].join(' · ');
      const data = new URLSearchParams(); data.append(FB.felt.tekst, tekst); if (FB.felt.info) data.append(FB.felt.info, info);
      q('#fb-ja').disabled = true; q('#fb-ja').textContent = T('Sender') + '…';
      fetch(FB.url, { method: 'POST', mode: 'no-cors', body: data })
        .then(() => { log.push({ t: Date.now(), h: hash(tekst) }); try { localStorage.setItem('bs_fb', JSON.stringify(log)); } catch (e) {} luk(); BS.toast(T('Tak! Din feedback er sendt'), 3000); })
        .catch(() => { q('#fb-ja').disabled = false; q('#fb-ja').textContent = T('Send'); msg('Kunne ikke sende – tjek internettet'); });
    };
  };
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
})();
