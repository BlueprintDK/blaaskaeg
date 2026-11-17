# 🧔🏻 Blå skæg

Spil sammen – hver på sin telefon. 2–4 spillere, iPhone og Android blandet, intet login.

**Spil her:** https://blueprintdk.github.io/blaaskaeg/

## Sådan
1. Én trykker **Opret nyt rum** og får en kode på 4 tal.
2. De andre åbner Blå skæg, skriver deres navn og koden og trykker **Deltag**.
3. Værten vælger et spil i lobbyen. Point samles på tværs af spillene.

## Spil
- 🪢 **Hangman** – gæt bogstaver på skift
- 🚢 **Sænk slagskibe** – 2-4 flåder, ram = skyd igen
- 🎡 **Ordhjulet** – drej, gæt konsonanter, køb vokaler, løs gåden
- 📍 **Sæt knappenålen** – Danmark, Europa eller Verden
- 🐍 **Snake** – sidste slange vinder
- 🏍️ **Lysbaner** – lys-motorcykler, der efterlader mure
- 🥏 **Diskos-arena** – kast diske, der preller af væggene

## Teknik
Én HTML-side med JavaScript. Telefonerne forbindes direkte med [PeerJS](https://peerjs.com) (WebRTC); værtens telefon kører spillene.
Kortet i Sæt knappenålen er Natural Earth via [world-atlas](https://github.com/topojson/world-atlas).
