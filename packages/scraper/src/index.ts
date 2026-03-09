// packages/scraper/src/index.ts
import { AladinScraper } from "./scraper.js";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const scraper = new AladinScraper();
  await scraper.init();

  // 샘플 데이터 (실제로는 TTB API에서 ISBN 목록 가져오기)
  const sampleComics = [
    { isbn: "9791162241598", url: "https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=9791162241598" },
    { isbn: "9791162241604", url: "https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=9791162241604" },
  ];

  const results = [];

  for (const item of sampleComics) {
    const comic = await scraper.scrapeComic(item.isbn, item.url);
    if (comic) results.push(comic);
  }

  const outputPath = path.resolve(__dirname, "../../../data/comics.json");
  scraper.saveToFile(results, outputPath);

  await scraper.close();
}

main().catch(console.error);
