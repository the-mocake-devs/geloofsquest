/* ============================================================
   VRAGENBANK — enige bestand dat je moet aanpassen voor inhoud
   ------------------------------------------------------------
   Nieuwe vraag toevoegen: kopieer een blok, geef een uniek id.
   - category   : een van de namen in CATEGORIES (of voeg er een toe)
   - difficulty : "easy" | "medium" | "hard"
   - answers    : precies 4 antwoorden
   - correct    : index van het juiste antwoord (0 = eerste, 1 = tweede, ...)
   - explanation: korte uitleg die na het antwoord getoond wordt
   Let op: komma na elk blok, behalve na het laatste.
   ============================================================ */
const CATEGORIES = ["Sacramenten","Bijbel","Jezus","Feesten","Tien geboden","Parabels","Symbolen","Wereldgodsdiensten"];

const questions = [
  {id:1, category:"Sacramenten", difficulty:"easy", question:"Hoeveel sacramenten kent de katholieke Kerk?", answers:["5","7","9","12"], correct:1, explanation:"De katholieke Kerk kent zeven sacramenten."},
  {id:2, category:"Sacramenten", difficulty:"easy", question:"Welk sacrament hoort bij de eerste communie?", answers:["Doopsel","Eucharistie","Vormsel","Ziekenzalving"], correct:1, explanation:"Bij de eerste communie ontvang je voor het eerst de Eucharistie."},
  {id:3, category:"Bijbel", difficulty:"easy", question:"Wie bouwde volgens het Bijbelverhaal de ark?", answers:["Mozes","Noach","Abraham","David"], correct:1, explanation:"Noach bouwde de ark om mens en dier te redden van de zondvloed."},
  {id:4, category:"Feesten", difficulty:"easy", question:"Wat betekent Advent?", answers:["Aankomst","Opstanding","Vuur","Vergeving"], correct:0, explanation:"Advent komt van het Latijnse 'adventus': aankomst. Het is de voorbereiding op Kerstmis."},
  {id:5, category:"Feesten", difficulty:"medium", question:"Welk feest vieren christenen vijftig dagen na Pasen?", answers:["Hemelvaart","Pinksteren","Allerheiligen","Driekoningen"], correct:1, explanation:"Op Pinksteren vieren christenen de komst van de Heilige Geest."},
  {id:6, category:"Wereldgodsdiensten", difficulty:"easy", question:"Wat is de heilige plaats van de moslims in Mekka?", answers:["De Klaagmuur","De Kaaba","De Gouden Tempel","Het Vaticaan"], correct:1, explanation:"De Kaaba in Mekka is het centrum van de bedevaart (hadj)."},
  {id:7, category:"Wereldgodsdiensten", difficulty:"medium", question:"Hoe heet het heilige boek van de islam?", answers:["Tora","Koran","Veda","Tripitaka"], correct:1, explanation:"De Koran is het heilige boek van de islam."},
  {id:8, category:"Tien geboden", difficulty:"easy", question:"Aan wie gaf God volgens de Bijbel de tien geboden?", answers:["Mozes","Petrus","Jozef","Elia"], correct:0, explanation:"Mozes ontving de tien geboden op de berg Sinaï."},
  {id:9, category:"Parabels", difficulty:"medium", question:"Welke parabel vertelt over een zoon die zijn erfenis verspilt?", answers:["De goede herder","De verloren zoon","De barmhartige Samaritaan","De zaaier"], correct:1, explanation:"In de parabel van de verloren zoon wordt de vader vergevend ontvangen."},
  {id:10, category:"Symbolen", difficulty:"easy", question:"Welk symbool hoort bij het jodendom?", answers:["Ster van David","Wiel van de dharma","Om-teken","Halve maan"], correct:0, explanation:"De zesPuntige Ster van David is een bekend joods symbool."}
];
/* Fase 2 vult dit aan tot 100+ vragen. */
