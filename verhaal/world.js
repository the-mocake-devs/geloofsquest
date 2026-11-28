

const WORLD = {
  W: 640, H: 420,
  water: [[300,90,40,130],[300,280,40,140]],            
  trees: [[40,200],[250,150],[390,160],[600,220],[250,385],[595,395],[60,380]],
  atlas: {x: 320, y: 48},
  stations: [
    {id:"kapel", name:"Kapel", icon:"⛪", rect:[70,50,80,60], color:"#c9b79c", type:"order",
     title:"Het doopsel", prompt:"Tik de tekens aan in de juiste volgorde.",
     items:["Water over het hoofd","Zalving met chrisma","Wit doopkleed","Doopkaars"],
     explain:"Water doopt, de zalving verbindt je met de gemeenschap, het witte kleed is een nieuw begin en de kaars staat voor licht."},
    {id:"bakkerij", name:"Bakkerij", icon:"🥖", rect:[90,290,80,56], color:"#e3c08a", type:"sort",
     title:"Tekens en sacramenten", prompt:"Bij welk sacrament hoort dit teken?",
     buckets:["Doopsel","Eucharistie","Ziekenzalving","Huwelijk"],
     items:[["Water",0],["Brood en wijn",1],["Olie voor de zieke",2],["Trouwringen",3]],
     explain:"Elk sacrament heeft eigen tekens: water, brood en wijn, olie en ringen."},
    {id:"bieb", name:"Bibliotheek", icon:"📚", rect:[460,50,90,60], color:"#a9bfd8", type:"match",
     title:"Bijbelse verhalen", prompt:"Koppel de persoon aan zijn verhaal.",
     pairs:[["Noach","Bouwde de ark"],["David","Versloeg Goliat"],["Mozes","Kreeg de tien geboden"],["Jona","Verbleef in een grote vis"]],
     explain:"Deze vier verhalen komen uit het Oude Testament."},
    {id:"markt", name:"Markt", icon:"🕌", rect:[470,290,90,56], color:"#d9b6c4", type:"sort",
     title:"Gebedshuizen", prompt:"Bij welke godsdienst hoort dit gebedshuis?",
     buckets:["Jodendom","Islam","Christendom","Hindoeïsme"],
     items:[["Synagoge",0],["Moskee",1],["Kerk",2],["Mandir",3]],
     explain:"Joden komen samen in de synagoge, moslims in de moskee, christenen in de kerk en hindoes in de mandir."}
  ]
};
const FINALE = {
  title:"De Atlas herstellen", stone:"Alle stenen liggen op hun plaats. Beantwoord drie vragen om het blad te laten terugkeren.",
  questions:[
    {q:"Hoeveel sacramenten kent de katholieke Kerk?", a:["5","7","9","12"], c:1},
    {q:"Wat is de heilige plaats van de moslims in Mekka?", a:["De Kaaba","De Klaagmuur","Het Vaticaan","De Gouden Tempel"], c:0},
    {q:"Welk feest vieren christenen veertig dagen na Pasen?", a:["Pinksteren","Hemelvaart","Advent","Kerstmis"], c:1}
  ]
};
