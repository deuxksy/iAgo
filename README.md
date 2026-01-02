# 🦅 iAgo (이아고)

> **Made with 🌊 Vibe Coding**  
> 이 프로젝트는 AI와 인간의 협업인 [바이브 코딩](https://www.youtube.com/watch?v=hGscAsf5S_c) 방법론으로 제작되었습니다.

<p align="center">
  <img src="docs/iAgo.png" alt="iAgo Logo" width="300">
</p>

알라딘 만화 데이터의 인구통계학적 분석을 통한 직관적인 모바일 웹 가이드

> "단순한 순위 나열을 넘어, 당신의 타겟층이 지지하는 '숨은 명작'과 '우연한 발견'을 선사합니다."

---

## 🌟 프로젝트 비전 (Vision)

디지털 콘텐츠 홍수 시대에 만화 선택의 결정 장애(Decision Fatigue)를 해결합니다. 알라딘(Aladin)의 숨겨진 구매자 데이터와 평점 분포를 분석하여, 단순 베스트셀러가 아닌 **맥락 있는 추천**을 제공합니다.

### 핵심 가치

- **Data-Driven Insight**: 텍스트와 그래프 뒤에 숨겨진 수치 데이터를 정량화.
- **Mobile-First Experience**: 언제 어디서나 빠르게 확인할 수 있는 최적화된 UI.
- **Serendipity**: 특정 세대나 성별이 열광하는 '나만 모르던 명작' 발견.

---

## 🏗️ 시스템 아키텍처 (Architecture)

본 프로젝트는 **정적 호스팅(Static Hosting)** 기반의 고성능 웹 서비스입니다.

- **Data Pipeline**: Playwright 기반 수집 엔진이 알라딘 상세 데이터를 주기적으로 스크레이핑.
- **Frontend**: Astro 프레임워크를 사용한 초경량 모바일 웹.
- **Infrastructure**: AWS S3 + CloudFront를 통한 글로벌 초고속 배포.

---

## 📂 디렉토리 구조 (Structure)

```text
iago/
├── .github/                # CI/CD 및 자동화 스케줄러 (DevOps)
├── data/                   # 수집/가공 데이터 (comics.json 등) (Shared)
├── docs/                   # 기획 및 기술 명세 (CF.md, ROADMAP.md) (PM)
├── infra/                  # AWS 인프라 설정 (IaC) (DevOps)
├── logs/                   # 시스템 실행 로그 (Log)
├── packages/
│   ├── scraper/            # Playwright 수집 엔진 (Data)
│   └── web/                # Astro 모바일 웹 (Front)
├── CHANGELOG.md            # 버전 및 이력 관리
├── GEMINI.md               # AI 실행 지침 (Master Guide)
└── README.md               # 프로젝트 공식 문서
```

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)를 따릅니다.

---
© 2026 Project iAgo. Built with Vibe Coding.
