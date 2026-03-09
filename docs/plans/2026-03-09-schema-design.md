# iAgo 데이터 스키마 설계

## 개요

성별과 나이를 입력받아 만화책을 추천하는 2단계 서비스를 위한 JSON 데이터 스키마.

## 서비스 플로우

```
[입력 화면]              [리스트 화면]           [상세 화면]
나이 슬라이더    →    작품 카드 리스트    →    구매자 분포 그래프
성별 좌우 선택         (해당 그룹 구매율 순)      평점 분포 그래프
```

## 데이터 구조

### 파일: `data/comics.json`

```json
{
  "meta": {
    "updated_at": "2026-03-09T00:00:00Z",
    "total_count": 500
  },
  "comics": [
    {
      "isbn": "9791162241598",
      "title": "나 혼자만 레벨업 1",
      "author": "추공",
      "publisher": "카카오웹툰",
      "cover_url": "https://image.aladin.co.kr/...",
      "price": 14000,
      "aladin_url": "https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=...",
      "rating_avg": 9.5,
      "rating_dist": {
        "5": 80, "4": 15, "3": 3, "2": 1, "1": 1
      },
      "buyer_dist": {
        "10s_male": 5, "10s_female": 2,
        "20s_male": 35, "20s_female": 8,
        "30s_male": 25, "30s_female": 10,
        "40s_male": 10, "40s_female": 5,
        "50s_male": 0, "50s_female": 0
      }
    }
  ]
}
```

## 필드 명세

### 메타 정보 (`meta`)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `updated_at` | string | Y | 데이터 갱신 일시 (ISO 8601) |
| `total_count` | number | Y | 전체 작품 수 |

### 작품 정보 (`comics[]`)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `isbn` | string | Y | 고유 식별자 (ISBN13) |
| `title` | string | Y | 도서 제목 |
| `author` | string | Y | 저자 |
| `publisher` | string | N | 출판사 |
| `cover_url` | string | Y | 표지 이미지 URL |
| `price` | number | Y | 정가 (원) |
| `aladin_url` | string | Y | 알라딘 상세 페이지 URL |
| `rating_avg` | number | Y | 평균 평점 (0-10) |
| `rating_dist` | object | Y | 별점별 비율 (%), 합계 100 |
| `buyer_dist` | object | Y | 연령대×성별 구매 비율 (%), 합계 100 |

### 구매자 분포 키 (`buyer_dist`)

```
{연령대}_{성별}
- 연령대: 10s, 20s, 30s, 40s, 50s
- 성별: male, female
```

예: `20s_male` = 20대 남성 구매 비율

## 클라이언트 로직

### 1. 나이 → 연령대 매핑

```typescript
function ageToGroup(age: number): string {
  if (age < 20) return "10s";
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  return "50s";
}
```

### 2. 추천 정렬

```typescript
function sortByBuyerDist(comics: Comic[], age: number, gender: "male" | "female"): Comic[] {
  const key = `${ageToGroup(age)}_${gender}`;
  return [...comics].sort((a, b) =>
    (b.buyer_dist[key] || 0) - (a.buyer_dist[key] || 0)
  );
}
```

## 화면별 데이터 사용

### 입력 화면
- 데이터 사용 없음 (입력만 받음)

### 리스트 화면
- `comics[]` 전체 로드
- 입력값 기준 정렬 후 상위 N개 표시
- 카드 표시: `cover_url`, `title`, `author`, `price`

### 상세 화면
- 선택된 작품 1개 표시
- 기본 정보: 전체 필드
- 시각화: `rating_dist` (평점 분포), `buyer_dist` (구매자 분포)

## 결정 사항

1. **Flat 구조 채택**: 정적 호스팅에 최적, 단일 파일로 관리
2. **정확히 일치 매칭**: 입력 연령대/성별과 정확히 매칭되는 구매율로 정렬
3. **퍼센트 기반**: `rating_dist`, `buyer_dist` 모두 합계 100인 비율(%)
