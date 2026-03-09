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
