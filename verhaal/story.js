/* VERHAAL – enkel dit bestand aanpassen om scènes toe te voegen.
   Types: say | choice | quiz | order | sort | get | end
   bg: w0 (Scriptorium), w1 (Rivier). Voeg nieuwe achtergronden toe in style.css. */
const WHO = {Verteller:"📖", Jij:"🙂", Noor:"🧭", Poortwachter:"🌊"};
const START = "s1";
const SCENES = {
 s1:{type:"say",bg:"w0",who:"Verteller",text:"Het Scriptorium. Stof danst in het licht en de Atlas der Verhalen ligt open op zijn lessenaar. Jij bent hier nog maar net leerling-archivaris.",next:"s2"},
 s2:{type:"say",bg:"w0",who:"Verteller",text:"Plots slaat een windstoot de ramen open. De Atlas knalt open en zes bladen dwarrelen de nacht in. Een fluisterstem: “Wie vergeet, verdwijnt.” De Stilte kruipt over de lege bladzijden.",next:"s3"},
 s3:{type:"choice",bg:"w0",who:"Jij",text:"Wat doe je?",options:[
   {t:"Direct achter de bladen aan rennen",trust:1,next:"s4"},
   {t:"Eerst de Atlas bekijken op aanwijzingen",next:"s3b"}]},
 s3b:{type:"say",bg:"w0",who:"Verteller",text:"Op de bladzijde staat nog één woord, vervaagd maar leesbaar: WATER.",next:"s4"},
 s4:{type:"say",bg:"w0",who:"Noor",text:"Wacht op mij! Ik ben Noor, ik help hier ook. Eigenlijk neus ik vooral rond. Het eerste blad woei richting de rivier. Kom mee!",next:"s5"},
 s5:{type:"say",bg:"w1",who:"Verteller",text:"De Rivier en het Brood. Aan de oever staat een poortwachter met een blad in zijn hand.",next:"s6"},
 s6:{type:"quiz",bg:"w1",who:"Poortwachter",text:"Ik bewaar dit blad voor wie iets weet. Hoeveel sacramenten kent de katholieke Kerk?",answers:["5","7","9","12"],correct:1,explain:"De katholieke Kerk kent zeven sacramenten.",next:"s7"},
 s7:{type:"order",bg:"w1",who:"Poortwachter",text:"Bij het doopsel volgen tekens elkaar op. Tik ze aan in de juiste volgorde.",items:["Water over het hoofd","Zalving met chrisma","Wit doopkleed","Doopkaars"],explain:"Water doopt je, de zalving maakt je deel van de gemeenschap, het witte kleed staat voor een nieuw begin en de kaars voor het licht van Christus.",next:"s8"},
 s8:{type:"sort",bg:"w1",who:"Poortwachter",text:"Bij welk sacrament hoort dit teken?",buckets:["Doopsel","Eucharistie","Ziekenzalving","Huwelijk"],items:[["Water",0],["Brood en wijn",1],["Olie voor de zieke",2],["Trouwringen",3]],explain:"Elk sacrament heeft eigen tekens: water, brood en wijn, olie en ringen.",next:"s9"},
 s9:{type:"choice",bg:"w1",who:"Noor",text:"Kijk, daar zit een kind helemaal alleen. Het kent hier niemand. Wat doen we?",options:[
   {t:"Uitnodigen om mee te gaan",trust:1,reflect:"Gastvrijheid is een kernwaarde in veel godsdiensten. Hoe zou jij je voelen als je nieuw was?",next:"s10"},
   {t:"Doorlopen, we hebben haast",reflect:"Haast lijkt soms belangrijker dan mensen. Wat zou je kunnen missen?",next:"s10"},
   {t:"Eerst vragen of het kind wil meekomen",trust:1,reflect:"Vragen respecteert iemands keuze. Dat is ook een vorm van zorg.",next:"s10"}]},
 s10:{type:"get",bg:"w1",icon:"📜",name:"Blad 1: De Rivier en het Brood",text:"Het eerste blad van de Atlas is terug. Het vertelt over water, brood en olie: tekens waarin mensen iets heiligs zien.",next:"s11"},
 s11:{type:"end",bg:"w1",text:"Hoofdstuk 1 voltooid! Nog vijf bladen blijven zoeken."}
};
