# iAgo MVP 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 알라딘 만화 데이터 스크래퍼와 모바일 웹을 구축하여, 연령대/성별 기반 만화 추천 서비스 MVP 완성

**Architecture:** Scraper(Playwright) → data/comics.json → Web(Astro) 정적 호스팅. 서버 없이 빌드 타임에 모든 데이터 처리.

**Tech Stack:** TypeScript, Playwright, Astro, Tailwind CSS, DaisyUI

**Reference:** `docs/plans/2026-03-09-schema-design.md` (데이터 스키마)

---

## Phase 1: Scraper 패키지 초기화

### Task 1.1: 패키지 구조 생성

**Files:**
- Create: `packages/scraper/package.json`
- Create: `packages/scraper/tsconfig.json`
- Create: `packages/scraper/src/index.ts`

**Step 1: package.json 생성**

```bash
mkdir -p packages/scraper/src
```

```json
{
  "name": "@iago/scraper",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "scrape": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 2: tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: 의존성 설치**

Run: `cd packages/scraper && npm install`
Expected: node_modules 생성, lockfile 생성

**Step 4: Playwright 브라우저 설치**

Run: `npx playwright install chromium`
Expected: Chromium 브라우저 다운로드 완료

**Step 5: 빈 진입점 생성 및 확인**

Create `packages/scraper/src/index.ts`:
```typescript
console.log("iAgo Scraper ready");
```

Run: `cd packages/scraper && npm run scrape`
Expected: "iAgo Scraper ready" 출력

**Step 6: 커밋**

```bash
git add packages/scraper/
git commit -m "feat(Data): initialize scraper package with TypeScript and Playwright"
```

---

### Task 1.2: 타입 정의 구현

**Files:**
- Create: `packages/scraper/src/types.ts`

**Step 1: 스키마 타입 정의 작성**

```typescript
// packages/scraper/src/types.ts

/** 구매자 분포 키: {연령대}_{성별} */
export type AgeGroup = "10s" | "20s" | "30s" | "40s" | "50s";
export type Gender = "male" | "female";
export type BuyerKey = `${AgeGroup}_${Gender}`;

/** 구매자 분포 (합계 100%) */
export interface BuyerDist {
  "10s_male": number;
  "10s_female": number;
  "20s_male": number;
  "20s_female": number;
  "30s_male": number;
  "30s_female": number;
  "40s_male": number;
  "40s_female": number;
  "50s_male": number;
  "50s_female": number;
}

/** 평점 분포 (합계 100%) */
export interface RatingDist {
  "5": number;
  "4": number;
  "3": number;
  "2": number;
  "1": number;
}

/** 개별 만화 정보 */
export interface Comic {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  cover_url: string;
  price: number;
  aladin_url: string;
  rating_avg: number;
  rating_dist: RatingDist;
  buyer_dist: BuyerDist;
}

/** 전체 데이터 구조 */
export interface ComicsData {
  meta: {
    updated_at: string;
    total_count: number;
  };
  comics: Comic[];
}
```

**Step 2: 타입 컴파일 확인**

Run: `cd packages/scraper && npx tsc --noEmit`
Expected: 에러 없이 완료

**Step 3: 커밋**

```bash
git add packages/scraper/src/types.ts
git commit -m "feat(Data): add TypeScript type definitions for comics schema"
```

---

### Task 1.3: 유틸리티 함수 구현

**Files:**
- Create: `packages/scraper/src/utils.ts`

**Step 1: 파싱 유틸리티 작성**

```typescript
// packages/scraper/src/utils.ts
import type { BuyerDist, RatingDist, AgeGroup, Gender } from "./types.js";

/** 나이 → 연령대 매핑 */
export function ageToGroup(age: number): AgeGroup {
  if (age < 20) return "10s";
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  return "50s";
}

/**
 * 구매자 분포 텍스트 파싱
 * 예: "20대 남성 35%, 30대 여성 15%" → { "20s_male": 35, "30s_female": 15, ... }
 */
export function parseBuyerDist(text: string): BuyerDist {
  const defaultDist: BuyerDist = {
    "10s_male": 0, "10s_female": 0,
    "20s_male": 0, "20s_female": 0,
    "30s_male": 0, "30s_female": 0,
    "40s_male": 0, "40s_female": 0,
    "50s_male": 0, "50s_female": 0,
  };

  // "20대 남성 35%" 패턴 매칭
  const pattern = /(\d+)대\s*(남성|여성)\s*(\d+(?:\.\d+)?)%/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const age = parseInt(match[1]);
    const gender: Gender = match[2] === "남성" ? "male" : "female";
    const percent = parseFloat(match[3]);
    const key = `${ageToGroup(age)}_${gender}` as keyof BuyerDist;
    defaultDist[key] = percent;
  }

  return defaultDist;
}

/**
 * 평점 분포 텍스트 파싱
 * 예: "5점 80%, 4점 15%" → { "5": 80, "4": 15, ... }
 */
export function parseRatingDist(text: string): RatingDist {
  const dist: RatingDist = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };

  // "5점 80%" 패턴 매칭
  const pattern = /(\d)점\s*(\d+(?:\.\d+)?)%/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const star = match[1] as keyof RatingDist;
    const percent = parseFloat(match[2]);
    if (star in dist) {
      dist[star] = percent;
    }
  }

  return dist;
}

/** 랜덤 딜레이 (Anti-bot) */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/** User-Agent 로테이션용 목록 */
export const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
```

**Step 2: 타입 체크**

Run: `cd packages/scraper && npx tsc --noEmit`
Expected: 에러 없이 완료

**Step 3: 커밋**

```bash
git add packages/scraper/src/utils.ts
git commit -m "feat(Data): add parsing utilities for buyer and rating distribution"
```

---

### Task 1.4: 스크래퍼 핵심 로직 구현

**Files:**
- Modify: `packages/scraper/src/index.ts`
- Create: `packages/scraper/src/scraper.ts`

**Step 1: 스크래퍼 클래스 작성**

```typescript
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
```

**Step 2: 진입점 수정**

```typescript
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
```

**Step 3: 타입 체크**

Run: `cd packages/scraper && npx tsc --noEmit`
Expected: 에러 없이 완료

**Step 4: 커밋**

```bash
git add packages/scraper/src/
git commit -m "feat(Data): implement Aladin scraper with Playwright"
```

---

### Task 1.5: 스크래퍼 테스트 실행

**Files:**
- Create: `data/comics.json` (자동 생성)

**Step 1: 스크래퍼 실행**

Run: `cd packages/scraper && npm run scrape`
Expected: comics.json 생성 또는 에러 로그 확인

**Step 2: 결과 파일 확인**

Run: `cat ../../data/comics.json | head -30`
Expected: JSON 구조 확인

**Step 3: .gitignore에 추가 (필요시)**

```bash
# data/comics.json이 이미 .gitignore에 있는지 확인
grep -q "data/comics.json" ../../.gitignore || echo "data/comics.json" >> ../../.gitignore
```

---

## Phase 2: Web 패키지 초기화

### Task 2.1: Astro 프로젝트 생성

**Files:**
- Create: `packages/web/` (Astro 프로젝트)

**Step 1: Astro 초기화**

Run: `cd packages && npm create astro@latest web -- --template minimal --no-git --no-install -y`
Expected: packages/web/ 폴더 생성

**Step 2: 의존성 설치**

Run: `cd packages/web && npm install`
Expected: node_modules 생성

**Step 3: Tailwind CSS + DaisyUI 설치**

Run: `cd packages/web && npx astro add tailwind -y && npm install daisyui@latest`
Expected: tailwind.config.mjs 생성

**Step 4: DaisyUI 설정**

Modify `packages/web/tailwind.config.mjs`:
```javascript
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light'],
  },
}
```

**Step 5: 개발 서버 확인**

Run: `cd packages/web && npm run dev &`
Expected: http://localhost:4321 에서 Astro 환영 페이지 확인

Run: `curl -s http://localhost:4321 | head -5`
Expected: HTML 응답 확인

**Step 6: 커밋**

```bash
git add packages/web/
git commit -m "feat(Front): initialize Astro project with Tailwind and DaisyUI"
```

---

### Task 2.2: 공통 레이아웃 구현

**Files:**
- Create: `packages/web/src/layouts/Layout.astro`

**Step 1: 레이아웃 컴포넌트 작성**

```astro
---
// packages/web/src/layouts/Layout.astro
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="ko" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="iAgo - 알라딘 만화 추천" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title} | iAgo</title>
  </head>
  <body class="min-h-screen bg-base-100">
    <header class="navbar bg-base-200 sticky top-0 z-50">
      <div class="flex-1">
        <a href="/" class="btn btn-ghost text-xl">🦅 iAgo</a>
      </div>
    </header>
    <main class="container mx-auto px-4 py-6 max-w-lg">
      <slot />
    </main>
    <footer class="footer footer-center p-4 bg-base-200 text-base-content">
      <p>© 2026 Project iAgo. Built with Vibe Coding.</p>
    </footer>
  </body>
</html>
```

**Step 2: 인덱스 페이지에 적용**

Modify `packages/web/src/pages/index.astro`:
```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="홈">
  <div class="text-center py-10">
    <h1 class="text-3xl font-bold mb-4">만화 추천 받기</h1>
    <p class="text-base-content/70">연령대와 성별을 선택하세요</p>
  </div>
</Layout>
```

**Step 3: 확인**

Run: `curl -s http://localhost:4321 | grep -o '<title>.*</title>'`
Expected: `<title>홈 | iAgo</title>`

**Step 4: 커밋**

```bash
git add packages/web/src/
git commit -m "feat(Front): add base layout with DaisyUI navbar"
```

---

### Task 2.3: 입력 화면 구현

**Files:**
- Modify: `packages/web/src/pages/index.astro`

**Step 1: 입력 폼 컴포넌트 작성**

```astro
---
// packages/web/src/pages/index.astro
import Layout from '../layouts/Layout.astro';

const ageGroups = [
  { value: '10s', label: '10대' },
  { value: '20s', label: '20대' },
  { value: '30s', label: '30대' },
  { value: '40s', label: '40대' },
  { value: '50s', label: '50대' },
];
---

<Layout title="홈">
  <div class="text-center py-6">
    <h1 class="text-2xl font-bold mb-2">만화 추천 받기</h1>
    <p class="text-base-content/70 text-sm mb-8">당신의 연령대와 성별을 알려주세요</p>
  </div>

  <form action="/list" method="GET" class="space-y-8">
    <!-- 연령대 선택 -->
    <div class="form-control">
      <label class="label">
        <span class="label-text font-medium">연령대</span>
      </label>
      <div class="flex flex-wrap gap-2 justify-center">
        {ageGroups.map((group) => (
          <input
            type="radio"
            name="age"
            value={group.value}
            class="btn"
            aria-label={group.label}
            checked={group.value === '20s'}
          />
        ))}
      </div>
    </div>

    <!-- 성별 선택 -->
    <div class="form-control">
      <label class="label">
        <span class="label-text font-medium">성별</span>
      </label>
      <div class="flex gap-4 justify-center">
        <input type="radio" name="gender" value="male" class="btn" aria-label="👨 남성" checked />
        <input type="radio" name="gender" value="female" class="btn" aria-label="👩 여성" />
      </div>
    </div>

    <!-- 제출 버튼 -->
    <div class="pt-4">
      <button type="submit" class="btn btn-primary btn-block btn-lg">
        추천받기 🎯
      </button>
    </div>
  </form>
</Layout>
```

**Step 2: 확인**

Run: `curl -s http://localhost:4321 | grep -c 'type="radio"'`
Expected: 7 (연령대 5개 + 성별 2개)

**Step 3: 커밋**

```bash
git add packages/web/src/pages/index.astro
git commit -m "feat(Front): implement input screen with age and gender selection"
```

---

### Task 2.4: 리스트 화면 구현

**Files:**
- Create: `packages/web/src/pages/list.astro`
- Create: `packages/web/src/components/ComicCard.astro`
- Create: `packages/web/public/data/comics.json` (데이터 복사)

**Step 1: ComicCard 컴포넌트 작성**

```astro
---
// packages/web/src/components/ComicCard.astro
interface Props {
  isbn: string;
  title: string;
  author: string;
  cover_url: string;
  price: number;
  buyerPercent: number;
}

const { isbn, title, author, cover_url, price, buyerPercent } = Astro.props;
---

<a href={`/detail/${isbn}`} class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
  <figure class="px-4 pt-4">
    <img src={cover_url} alt={title} class="rounded-xl h-40 object-cover" loading="lazy" />
  </figure>
  <div class="card-body p-4">
    <h2 class="card-title text-sm line-clamp-2">{title}</h2>
    <p class="text-xs text-base-content/70">{author}</p>
    <p class="text-sm font-medium">{price.toLocaleString()}원</p>
    <div class="mt-2">
      <div class="flex justify-between text-xs mb-1">
        <span>구매율</span>
        <span class="font-medium">{buyerPercent}%</span>
      </div>
      <progress class="progress progress-primary" value={buyerPercent} max="100"></progress>
    </div>
  </div>
</a>
```

**Step 2: 리스트 페이지 작성**

```astro
---
// packages/web/src/pages/list.astro
import Layout from '../layouts/Layout.astro';
import ComicCard from '../components/ComicCard.astro';

// 쿼리 파라미터 파싱
const age = Astro.url.searchParams.get('age') || '20s';
const gender = Astro.url.searchParams.get('gender') || 'male';
const buyerKey = `${age}_${gender}` as string;

// 데이터 로드 (빌드 타임)
const data = await Astro.glob('/public/data/comics.json');
const comics = data[0]?.default?.comics || [];

// 정렬: 선택한 그룹 구매율 내림차순
const sorted = [...comics].sort((a, b) =>
  (b.buyer_dist?.[buyerKey] || 0) - (a.buyer_dist?.[buyerKey] || 0)
);

const displayList = sorted.slice(0, 20);
---

<Layout title="추천 리스트">
  <div class="mb-4">
    <a href="/" class="btn btn-ghost btn-sm">
      ← 다시 선택
    </a>
  </div>

  <div class="text-center mb-6">
    <h1 class="text-xl font-bold">{age.replace('s', '대')} {gender === 'male' ? '남성' : '여성'} 추천</h1>
    <p class="text-sm text-base-content/70">구매율 상위 {displayList.length}개</p>
  </div>

  <div class="grid grid-cols-2 gap-4">
    {displayList.map((comic: any) => (
      <ComicCard
        isbn={comic.isbn}
        title={comic.title}
        author={comic.author}
        cover_url={comic.cover_url}
        price={comic.price}
        buyerPercent={comic.buyer_dist?.[buyerKey] || 0}
      />
    ))}
  </div>
</Layout>
```

**Step 3: 샘플 데이터 생성**

```bash
mkdir -p packages/web/public/data
cat > packages/web/public/data/comics.json << 'EOF'
{
  "meta": { "updated_at": "2026-03-09T00:00:00Z", "total_count": 2 },
  "comics": [
    {
      "isbn": "9791162241598",
      "title": "나 혼자만 레벨업 1",
      "author": "추공",
      "publisher": "카카오웹툰",
      "cover_url": "https://image.aladin.co.kr/product/12345/1.jpg",
      "price": 14000,
      "aladin_url": "https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=9791162241598",
      "rating_avg": 9.5,
      "rating_dist": { "5": 80, "4": 15, "3": 3, "2": 1, "1": 1 },
      "buyer_dist": { "10s_male": 5, "10s_female": 2, "20s_male": 35, "20s_female": 8, "30s_male": 25, "30s_female": 10, "40s_male": 10, "40s_female": 5, "50s_male": 0, "50s_female": 0 }
    },
    {
      "isbn": "9791162241604",
      "title": "나 혼자만 레벨업 2",
      "author": "추공",
      "publisher": "카카오웹툰",
      "cover_url": "https://image.aladin.co.kr/product/12345/2.jpg",
      "price": 14000,
      "aladin_url": "https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=9791162241604",
      "rating_avg": 9.3,
      "rating_dist": { "5": 75, "4": 18, "3": 5, "2": 1, "1": 1 },
      "buyer_dist": { "10s_male": 8, "10s_female": 3, "20s_male": 30, "20s_female": 12, "30s_male": 22, "30s_female": 15, "40s_male": 6, "40s_female": 4, "50s_male": 0, "50s_female": 0 }
    }
  ]
}
EOF
```

**Step 4: 빌드 확인**

Run: `cd packages/web && npm run build`
Expected: dist/ 폴더 생성

**Step 5: 커밋**

```bash
git add packages/web/
git commit -m "feat(Front): implement list screen with sorted comic cards"
```

---

### Task 2.5: 상세 화면 구현

**Files:**
- Create: `packages/web/src/pages/detail/[isbn].astro`

**Step 1: 상세 페이지 작성**

```astro
---
// packages/web/src/pages/detail/[isbn].astro
import Layout from '../../layouts/Layout.astro';

export function getStaticPaths() {
  // 샘플 데이터 기반 정적 경로 생성
  return [
    { params: { isbn: '9791162241598' } },
    { params: { isbn: '9791162241604' } },
  ];
}

const { isbn } = Astro.params;

// 샘플 데이터 (실제로는 빌드 타임에 JSON에서 로드)
const comicsData = {
  "9791162241598": {
    isbn: "9791162241598",
    title: "나 혼자만 레벨업 1",
    author: "추공",
    publisher: "카카오웹툰",
    cover_url: "https://image.aladin.co.kr/product/12345/1.jpg",
    price: 14000,
    aladin_url: "https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=9791162241598",
    rating_avg: 9.5,
    rating_dist: { "5": 80, "4": 15, "3": 3, "2": 1, "1": 1 },
    buyer_dist: { "10s_male": 5, "10s_female": 2, "20s_male": 35, "20s_female": 8, "30s_male": 25, "30s_female": 10, "40s_male": 10, "40s_female": 5, "50s_male": 0, "50s_female": 0 }
  },
  "9791162241604": {
    isbn: "9791162241604",
    title: "나 혼자만 레벨업 2",
    author: "추공",
    publisher: "카카오웹툰",
    cover_url: "https://image.aladin.co.kr/product/12345/2.jpg",
    price: 14000,
    aladin_url: "https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=9791162241604",
    rating_avg: 9.3,
    rating_dist: { "5": 75, "4": 18, "3": 5, "2": 1, "1": 1 },
    buyer_dist: { "10s_male": 8, "10s_female": 3, "20s_male": 30, "20s_female": 12, "30s_male": 22, "30s_female": 15, "40s_male": 6, "40s_female": 4, "50s_male": 0, "50s_female": 0 }
  }
};

const comic = comicsData[isbn as keyof typeof comicsData];

if (!comic) {
  return Astro.redirect('/404');
}

const buyerLabels = [
  { key: '10s_male', label: '10대 남성' },
  { key: '10s_female', label: '10대 여성' },
  { key: '20s_male', label: '20대 남성' },
  { key: '20s_female', label: '20대 여성' },
  { key: '30s_male', label: '30대 남성' },
  { key: '30s_female', label: '30대 여성' },
  { key: '40s_male', label: '40대 남성' },
  { key: '40s_female', label: '40대 여성' },
  { key: '50s_male', label: '50대 남성' },
  { key: '50s_female', label: '50대 여성' },
];
---

<Layout title={comic.title}>
  <div class="mb-4">
    <a href="/list" class="btn btn-ghost btn-sm">← 목록</a>
  </div>

  <div class="card bg-base-100 shadow-md">
    <figure class="px-6 pt-6">
      <img src={comic.cover_url} alt={comic.title} class="rounded-xl max-h-64" />
    </figure>
    <div class="card-body">
      <h1 class="card-title text-lg">{comic.title}</h1>
      <p class="text-sm text-base-content/70">{comic.author} · {comic.publisher}</p>
      <p class="text-lg font-bold text-primary">{comic.price.toLocaleString()}원</p>

      <div class="flex items-center gap-2 mt-2">
        <span class="text-yellow-500">★</span>
        <span class="font-medium">{comic.rating_avg}</span>
      </div>

      <a href={comic.aladin_url} target="_blank" class="btn btn-outline btn-sm mt-4">
        알라딘에서 보기
      </a>
    </div>
  </div>

  <!-- 구매자 분포 -->
  <div class="mt-6">
    <h2 class="font-bold mb-3">구매자 분포</h2>
    <div class="space-y-2">
      {buyerLabels.map(({ key, label }) => (
        <div class="flex items-center gap-2">
          <span class="text-xs w-20">{label}</span>
          <progress class="progress progress-secondary flex-1" value={comic.buyer_dist[key]} max="100"></progress>
          <span class="text-xs w-10 text-right">{comic.buyer_dist[key]}%</span>
        </div>
      ))}
    </div>
  </div>

  <!-- 평점 분포 -->
  <div class="mt-6">
    <h2 class="font-bold mb-3">평점 분포</h2>
    <div class="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => (
        <div class="flex items-center gap-2">
          <span class="text-xs w-8">{star}점</span>
          <progress class="progress progress-accent flex-1" value={comic.rating_dist[star.toString() as keyof typeof comic.rating_dist]} max="100"></progress>
          <span class="text-xs w-10 text-right">{comic.rating_dist[star.toString() as keyof typeof comic.rating_dist]}%</span>
        </div>
      ))}
    </div>
  </div>
</Layout>
```

**Step 2: 빌드 확인**

Run: `cd packages/web && npm run build`
Expected: dist/detail/9791162241598/index.html 생성

**Step 3: 커밋**

```bash
git add packages/web/src/pages/detail/
git commit -m "feat(Front): implement detail screen with buyer and rating distribution"
```

---

## Phase 3: 통합 및 검증

### Task 3.1: 최종 빌드 테스트

**Step 1: Web 빌드**

Run: `cd packages/web && npm run build`
Expected: dist/ 폴더에 정적 파일 생성

**Step 2: 빌드 결과 확인**

Run: `ls -la packages/web/dist/`
Expected: index.html, list/index.html, detail/*/index.html 존재

**Step 3: 정적 파일 미리보기**

Run: `cd packages/web && npm run preview &`
Expected: http://localhost:4321 에서 사이트 확인 가능

---

## 실행 요약

| Phase | Task | 예상 시간 | 상태 |
|-------|------|----------|------|
| 1.1 | Scraper 패키지 초기화 | 10분 | ⏳ |
| 1.2 | 타입 정의 | 5분 | ⏳ |
| 1.3 | 유틸리티 함수 | 10분 | ⏳ |
| 1.4 | 스크래퍼 핵심 로직 | 20분 | ⏳ |
| 1.5 | 스크래퍼 테스트 | 10분 | ⏳ |
| 2.1 | Astro 프로젝트 생성 | 10분 | ⏳ |
| 2.2 | 공통 레이아웃 | 10분 | ⏳ |
| 2.3 | 입력 화면 | 15분 | ⏳ |
| 2.4 | 리스트 화면 | 20분 | ⏳ |
| 2.5 | 상세 화면 | 15분 | ⏳ |
| 3.1 | 최종 빌드 테스트 | 5분 | ⏳ |

**총 예상 시간:** ~2시간
