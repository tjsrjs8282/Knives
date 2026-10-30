import type { ImageMetadata } from "astro";
import windows from "./windows.json";

/**
 * The ten windows of the house poster. In 2020 these descriptions were pixels
 * burned into cast_twoClick.jpg (with two wrong names: Joni was "Nick's" wife);
 * here they are text, corrected, and spoiler-free — only what the first act
 * of the film tells you.
 */
export interface Suspect {
  id: keyof typeof windows;
  name: string;
  nameEn: string;
  actor: string;
  actorEn: string;
  role: string;
  profile: string;
  /** Why they are on the list — first-act information only. */
  motive: string;
}

export const SUSPECTS: Suspect[] = [
  {
    id: "harlan",
    name: "할런 트롬비",
    nameEn: "Harlan Thrombey",
    actor: "크리스토퍼 플러머",
    actorEn: "Christopher Plummer",
    role: "피해자 · 트롬비가의 가장",
    profile: "추리소설로 출판 제국을 일군 85세의 베스트셀러 작가. 생일 파티 다음 날 아침, 자기 방에서 숨진 채 발견됐다.",
    motive: "생일 밤, 그는 가족들을 한 명씩 따로 불러 이야기를 나눴다. 그 대화가 모두에게 동기가 됐다.",
  },
  {
    id: "blanc",
    name: "브누아 블랑",
    nameEn: "Benoit Blanc",
    actor: "다니엘 크레이그",
    actorEn: "Daniel Craig",
    role: "사립 탐정",
    profile: "‘마지막 신사 탐정’이라 불리는 명탐정. 누군가 현금이 든 봉투와 함께 익명으로 이 사건을 맡겼다.",
    motive: "용의자는 아니다. 다만 의뢰인이 누구인지는 그 자신도 모른다.",
  },
  {
    id: "marta",
    name: "마르타 카브레라",
    nameEn: "Marta Cabrera",
    actor: "아나 데 아르마스",
    actorEn: "Ana de Armas",
    role: "할런의 간병인",
    profile: "할런의 간병인이자 바둑 상대, 그리고 친구. 거짓말을 하면 구토를 하는 특이한 체질을 지녔다.",
    motive: "생일 밤 늦게까지 할런의 방에서 그와 바둑을 뒀다.",
  },
  {
    id: "linda",
    name: "린다 드라이스데일",
    nameEn: "Linda Drysdale",
    actor: "제이미 리 커티스",
    actorEn: "Jamie Lee Curtis",
    role: "할런의 장녀",
    profile: "아버지에게 손 벌리지 않고 부동산 회사를 일궜다고 자부하는 장녀. 집안의 실질적인 가장이다.",
    motive: "유산이 걸린 집안에서, 가장 잃을 것이 많은 사람 중 하나.",
  },
  {
    id: "richard",
    name: "리처드 드라이스데일",
    nameEn: "Richard Drysdale",
    actor: "돈 존슨",
    actorEn: "Don Johnson",
    role: "린다의 남편 · 할런의 사위",
    profile: "린다의 남편. 처가의 넉넉한 울타리 안에서 여유로운 삶을 즐긴다.",
    motive: "생일 밤, 할런이 그의 외도를 눈치챘다. 아내에게 직접 말하라는 최후통첩과 함께.",
  },
  {
    id: "ransom",
    name: "휴 랜섬 드라이스데일",
    nameEn: "Hugh Ransom Drysdale",
    actor: "크리스 에반스",
    actorEn: "Chris Evans",
    role: "린다와 리처드의 아들",
    profile: "집안의 골칫덩이 손자. 솔직하고 거침없지만 누구에게나 무례하다.",
    motive: "파티 도중 할런과 큰 소리로 다툰 뒤, 누구보다 먼저 저택을 떠났다.",
  },
  {
    id: "walt",
    name: "월트 트롬비",
    nameEn: "Walt Thrombey",
    actor: "마이클 섀넌",
    actorEn: "Michael Shannon",
    role: "할런의 막내아들",
    profile: "아버지의 소설을 펴내는 출판사를 맡고 있는 막내아들. 다친 발 때문에 지팡이를 짚는다.",
    motive: "생일 밤, 할런이 그에게 출판사에서 손을 떼라고 통보했다.",
  },
  {
    id: "joni",
    name: "조니 트롬비",
    nameEn: "Joni Thrombey",
    actor: "토니 콜렛",
    actorEn: "Toni Collette",
    role: "할런의 며느리",
    profile: "세상을 떠난 할런의 아들 닐의 아내. 라이프스타일 뷰티 브랜드를 운영하는 자유로운 영혼.",
    motive: "딸의 학비를 이중으로 받아 온 사실이 할런에게 들통났다.",
  },
  {
    id: "meg",
    name: "메그 트롬비",
    nameEn: "Meg Thrombey",
    actor: "캐서린 랭퍼드",
    actorEn: "Katherine Langford",
    role: "닐과 조니의 딸",
    profile: "할아버지가 학비를 대 주는 진보적인 대학생. 가족 중 마르타와 가장 가깝게 지낸다.",
    motive: "할아버지의 지원이 끊기면, 학교를 그만둬야 한다.",
  },
  {
    id: "elliott",
    name: "엘리엇 경위",
    nameEn: "Lt. Elliott",
    actor: "라키스 스탠필드",
    actorEn: "LaKeith Stanfield",
    role: "주 경찰 경위",
    profile: "사건을 맡은 경위. 블랑의 유별난 수사 방식에 의문을 품으면서도 함께 저택을 조사한다.",
    motive: "용의자는 아니다. 그에게 이 사건은 처음부터 ‘자살’이었다.",
  },
];

/** Everyone else at the house — no window in the poster, but on the guest list. */
export const OTHERS = [
  { name: "제이콥 트롬비", actor: "제이든 마텔", note: "월트의 아들. 파티 내내 휴대폰만 들여다봤다." },
  { name: "돈나 트롬비", actor: "리키 린드홈", note: "월트의 아내." },
  { name: "와그너 경관", actor: "노아 시건", note: "할런 소설의 열혈 팬인 경관." },
  { name: "프랜", actor: "에디 패터슨", note: "저택의 가정부. 시신을 처음 발견했다." },
  { name: "와네타 할머니", actor: "K. 캘런", note: "할런의 노모. 아주, 아주 나이가 많다." },
  { name: "앨런 스티븐스", actor: "프랭크 오즈", note: "할런의 변호사. 유언장을 쥐고 있다." },
];

const painted = import.meta.glob<{ default: ImageMetadata }>("../assets/suspects/painted/*.jpg", { eager: true });
const photos = import.meta.glob<{ default: ImageMetadata }>("../assets/suspects/photo/*.jpg", { eager: true });

export const paintedOf = (id: string) => painted[`../assets/suspects/painted/${id}.jpg`].default;
export const photoOf = (id: string) => photos[`../assets/suspects/photo/${id}.jpg`].default;
export const windowOf = (id: Suspect["id"]) => windows[id];
