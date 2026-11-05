/**
 * Credits for the found pictures and footage on the public pages (public/images/credits.json).
 * Roadmap: K6.1
 */

const CREDITS = [
  {
    title: "19th century money box",
    by: "Prolete",
    licence: "CC0",
    via: "Wikimedia Commons",
    page: "https://commons.wikimedia.org/wiki/File:19th_century_money_box.jpg",
  },
  {
    title: "Gold coin hoard 2007T433",
    by: "The British Museum, Harriet Louth",
    licence: "CC BY-SA 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    via: "Wikimedia Commons",
    page: "https://commons.wikimedia.org/w/index.php?curid=55527893",
  },
  {
    title: "Edge of a one-pound coin (1985)",
    by: "LihUlv",
    licence: "CC0",
    via: "Wikimedia Commons",
    page: "https://commons.wikimedia.org/wiki/File:%D8%AD%D8%A7%D9%81%D8%A9_%D8%B9%D9%85%D9%84%D8%A9_%D8%A7%D9%84%D9%88%D8%A7%D8%AD%D8%AF_%D8%AC%D9%86%D9%8A%D9%87_%D8%A7%D8%B3%D8%AA%D8%B1%D9%84%D9%8A%D9%86%D9%8A1985.edge_of_a_one-pound_coin.mpg",
  },
  {
    title: "Stacks of Coins",
    by: "Kevin Schneider",
    licence: "CC0",
    via: "Wikimedia Commons",
    page: "https://commons.wikimedia.org/wiki/File:Stacks_of_Coins.jpg",
  },
  {
    title: "Stack of coins 0214",
    by: "Dori",
    licence: "public domain",
    via: "Wikimedia Commons",
    page: "https://commons.wikimedia.org/wiki/File:Stack_of_coins_0214.jpg",
  },
  {
    title: "Gold Coin of the Parisii",
    by: "Celtic maker, 2nd century BCE",
    licence: "CC0",
    via: "The Metropolitan Museum of Art",
    page: "https://www.metmuseum.org/art/collection/search/464811",
  },
];

export function Credits() {
  return (
    <p className="lp-credits">
      Pictures and footage:{" "}
      {CREDITS.map((c, i) => (
        <span key={c.title}>
          <a href={c.page}>“{c.title}”</a> by {c.by},{" "}
          {c.licenceUrl ? <a href={c.licenceUrl}>{c.licence}</a> : c.licence}, via {c.via}
          {i < CREDITS.length - 1 ? "; " : "."}
        </span>
      ))}
    </p>
  );
}
