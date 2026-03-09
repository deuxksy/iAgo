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
