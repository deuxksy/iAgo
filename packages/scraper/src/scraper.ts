// packages/scraper/src/scraper.ts
import { chromium, type Browser, type Page } from "playwright";
import type { Comic, ComicsData } from "./types.js";
import { parseBuyerDist, parseRatingDist, randomDelay, getRandomUserAgent } from "./utils.js";
import * as fs from "fs";
import * as path from "path";

export class AladinScraper {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
    });
    console.log("Browser launched");
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /** 상세 페이지에서 만화 정보 스크래핑 */
  async scrapeComic(isbn: string, aladinUrl: string): Promise<Comic | null> {
    if (!this.browser) throw new Error("Browser not initialized");

    const context = await this.browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 390, height: 844 }, // 모바일 뷰포트
    });

    const page = await context.newPage();

    try {
      await page.goto(aladinUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await randomDelay(1000, 2000);

      // 기본 정보 추출
      const title = await page.locator("h1").first().textContent() || "";
      const author = await page.locator("[itemprop='author']").first().textContent() || "";
      const publisher = await page.locator("[itemprop='publisher']").first().textContent() || "";
      const coverUrl = await page.locator("img[itemprop='image']").first().getAttribute("src") || "";
      const priceText = await page.locator(".price").first().textContent() || "0";
      const price = parseInt(priceText.replace(/[^0-9]/g, "")) || 0;
      const ratingAvg = parseFloat(await page.locator(".rating").first().textContent() || "0");

      // 구매자 분포 파싱 (텍스트에서 추출)
      const buyerDistText = await this.getBuyerDistText(page);
      const buyerDist = parseBuyerDist(buyerDistText);

      // 평점 분포 파싱
      const ratingDistText = await this.getRatingDistText(page);
      const ratingDist = parseRatingDist(ratingDistText);

      const comic: Comic = {
        isbn,
        title: title.trim(),
        author: author.trim(),
        publisher: publisher.trim(),
        cover_url: coverUrl,
        price,
        aladin_url: aladinUrl,
        rating_avg: ratingAvg,
        rating_dist: ratingDist,
        buyer_dist: buyerDist,
      };

      console.log(`[OK] ${title}`);
      return comic;

    } catch (error) {
      console.error(`[FAIL] ${isbn}:`, error);
      return null;
    } finally {
      await context.close();
    }
  }

  /** 구매자 분포 텍스트 추출 */
  private async getBuyerDistText(page: Page): Promise<string> {
    try {
      // 구매자 분포 섹션 찾기
      const section = page.locator("text=/구매자.*분포/").first();
      const parent = section.locator("xpath=..");
      return await parent.textContent() || "";
    } catch {
      return "";
    }
  }

  /** 평점 분포 텍스트 추출 */
  private async getRatingDistText(page: Page): Promise<string> {
    try {
      const section = page.locator(".rating-graph, .review-graph").first();
      return await section.textContent() || "";
    } catch {
      return "";
    }
  }

  /** 결과를 JSON으로 저장 */
  saveToFile(comics: Comic[], outputPath: string): void {
    const data: ComicsData = {
      meta: {
        updated_at: new Date().toISOString(),
        total_count: comics.length,
      },
      comics,
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Saved ${comics.length} comics to ${outputPath}`);
  }
}
