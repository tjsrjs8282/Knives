import type { ImageMetadata } from "astro";

/** Page sections, in order — drives the HUD nav and the scroll progress. */
export const SECTIONS = [
  { id: "case", label: "사건 개요", en: "The Case" },
  { id: "suspects", label: "용의자", en: "Suspects" },
  { id: "evidence", label: "현장 사진", en: "Evidence" },
  { id: "trailers", label: "예고편", en: "Trailers" },
  { id: "series", label: "블랑의 사건들", en: "The Blanc Files" },
  { id: "office", label: "탐정 사무소", en: "The Office" },
] as const;

// ── Evidence photos ───────────────────────────────────────────────────────────
const stills = import.meta.glob<{ default: ImageMetadata }>("../assets/stills/*.jpg", { eager: true });
const still = (name: string) => stills[`../assets/stills/${name}.jpg`].default;

export const EVIDENCE = [
  { src: still("family-portrait"), place: "응접실", caption: "트롬비 일가의 단체 초상. 가운데 의자에 할런이 앉아 있다." },
  { src: still("birthday-cake"), place: "식당", caption: "85번째 생일 케이크. 린다와 할런, 리처드." },
  { src: still("go-board"), place: "할런의 방", caption: "생일 밤, 할런과 마르타의 바둑 한 판." },
  { src: still("drawing-room"), place: "응접실", caption: "응접실에 모인 가족들. 발치에는 할런의 개." },
  { src: still("front-lawn"), place: "저택 앞", caption: "메그, 조니, 린다, 리처드, 월트, 돈나, 제이콥." },
  { src: still("foyer"), place: "현관 홀", caption: "와그너 경관과 엘리엇 경위, 마르타, 랜섬, 그리고 블랑." },
  { src: still("interview"), place: "서재", caption: "심문을 준비하는 엘리엇 경위와 와그너 경관, 블랑." },
  { src: still("piano"), place: "서재", caption: "피아노 앞에 기대앉아 건반을 하나씩 누르는 블랑." },
  { src: still("throne-blanc"), place: "서재", caption: "칼 왕좌 앞의 블랑." },
  { src: still("throne-linda"), place: "서재", caption: "칼 왕좌 앞의 린다." },
  { src: still("throne-richard"), place: "서재", caption: "칼 왕좌 앞의 리처드." },
  { src: still("throne-marta"), place: "서재", caption: "칼 왕좌 앞의 마르타." },
  { src: still("blanc-marta"), place: "서재", caption: "블랑과 마르타." },
  { src: still("library"), place: "서재", caption: "블랑, 와그너, 랜섬, 엘리엇. 늦게 도착한 손자." },
  { src: still("ransom-study"), place: "서재", caption: "할아버지의 서재에 앉은 랜섬." },
  { src: still("ransom-sweater"), place: "저택 밖", caption: "랜섬과, 영화보다 유명해진 그 꽈배기 니트." },
  { src: still("woods"), place: "저택 밖", caption: "숲길을 걷는 블랑과 엘리엇 경위." },
];

// ── Trailers (official uploads only; all embeddable, checked via oEmbed) ──────
export const TRAILERS = [
  { id: "gBiE4_kFNuw", title: "메인 예고편", meta: "2:31 · 한국어 자막", by: "올스타엔터테인먼트", preview: "preview-main" },
  { id: "WWKsAqGvWCk", title: "1차 예고편", meta: "2:11 · 한국어 자막", by: "올스타엔터테인먼트", preview: "preview-teaser" },
  { id: "lBb4RSAez8g", title: "명탐정 브누아 블랑 특별 예고편", meta: "0:31 · 한국어 자막", by: "올스타엔터테인먼트", preview: "preview-blanc" },
  { id: "qGqiHJTsRkQ", title: "Official Trailer", meta: "2:18 · 영어", by: "Lionsgate Movies", preview: "preview-lionsgate" },
] as const;

// ── The Benoit Blanc mysteries ────────────────────────────────────────────────
export const SERIES = [
  {
    no: "01",
    title: "나이브스 아웃",
    titleEn: "Knives Out",
    year: "2019",
    release: "극장 개봉 · 북미 2019.11.27 / 국내 2019.12.04",
    premise: "베스트셀러 작가의 85번째 생일 다음 날. 저택에 모인 가족 모두가 용의자다.",
    song: "Radiohead, 「Knives Out」 (2001)",
    trailer: "gBiE4_kFNuw",
    current: true,
  },
  {
    no: "02",
    title: "나이브스 아웃: 글래스 어니언",
    titleEn: "Glass Onion",
    year: "2022",
    release: "넷플릭스 2022.12.23",
    premise: "테크 억만장자 마일스 브론이 친구들을 그리스의 개인 섬으로 초대한다. 살인 미스터리 게임을 하자고.",
    song: "The Beatles, 「Glass Onion」 (1968)",
    trailer: "ShPYQxNPYuY",
    current: false,
  },
  {
    no: "03",
    title: "나이브스 아웃: 웨이크 업 데드 맨",
    titleEn: "Wake Up Dead Man",
    year: "2025",
    release: "넷플릭스 2025.12.12",
    premise: "작은 마을의 교회에서 일어난 ‘불가능한 범죄’. 블랑의 가장 위험한 사건.",
    song: "U2, 「Wake Up Dead Man」 (1997)",
    trailer: "NVAU888YJGE",
    current: false,
  },
] as const;

// ── Facts & links (each one checked; see README) ──────────────────────────────
export const CREDITS = [
  ["각본·감독", "라이언 존슨"],
  ["출연", "다니엘 크레이그, 크리스 에반스, 아나 데 아르마스, 제이미 리 커티스, 마이클 섀넌, 돈 존슨, 토니 콜렛, 라키스 스탠필드, 캐서린 랭퍼드, 제이든 마텔, 크리스토퍼 플러머"],
  ["촬영", "스티브 예들린"],
  ["음악", "네이선 존슨"],
  ["제작", "라이언 존슨, 램 버그먼"],
  ["러닝타임", "130분"],
  ["개봉", "북미 2019.11.27 · 국내 2019.12.04"],
] as const;

export const LINKS = {
  justwatch: "https://www.justwatch.com/kr/%EC%98%81%ED%99%94/naibeuseu-aus",
  youtubeMovies: "https://www.youtube.com/watch?v=0j4r1N5WqiQ",
};
