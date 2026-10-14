# 독서해마 (Reading Hippocampus)

책별 마인드맵 위에 질문·토의 말풍선을 띄우고, 공유 링크로 들어온 익명 참여자와 의견을 나누는 독서 정리·토론 앱.

## 핵심 개념

| 개념 | 설명 |
|---|---|
| Book (보드) | 책 1권 = 마인드맵 캔버스 1개 = 공유 링크 1개 |
| TOC node | 목차 트리 (카테고리 → 장). 마인드맵의 뼈대 |
| Bubble | 목차 노드에 붙는 질문/토의 말풍선. 작성자가 색을 직접 고름. 참여자도 생성 가능 |
| Reply | 말풍선에 다는 댓글/의견 |
| Participant | 링크로 입장한 사람. 보드별 닉네임 + 고유 색 |
| 우체통 | 내 말풍선에 답이 달리면 쌓이는 알림 (Realtime) |

## Stack

- **Next.js** (App Router, TypeScript, Tailwind)
- **React Flow** (`@xyflow/react`) — 마인드맵 캔버스, 커스텀 말풍선 노드
- **Supabase** — Auth(Anonymous Sign-in), Postgres + RLS, Realtime

## MVP 로드맵

- [ ] 1. 책 생성 · 목차 입력 · 마인드맵 렌더링
- [ ] 2. 말풍선 생성 + 색 선택
- [ ] 3. 공유 링크 → 익명 입장(닉네임·색) → 말풍선/댓글
- [ ] 4. 우체통 (Realtime 알림)
- [ ] 5. 관리: 댓글 삭제, 링크 비활성화·재발급

## 시작하기

```bash
npm install
cp .env.example .env.local   # Supabase URL / anon key 입력
npm run dev
```

Supabase 대시보드에서
1. **Authentication → Providers → Anonymous Sign-ins** 활성화
2. `supabase/migrations/0001_init.sql` 실행 (SQL Editor 또는 `supabase db push`)

## 권한 요약 (RLS)

- 목차: 보드 주인만 편집
- 말풍선: 멤버(주인+참여자) 누구나 생성, 작성자 수정, 작성자·주인 삭제
- 댓글: 멤버 누구나 작성, 작성자·주인 삭제
- 우체통: 본인 알림만 조회
- 입장: `join_book(share_token, nickname, color)` RPC — 링크가 비활성화되면 신규 입장 차단

> 공개 링크로 공유되는 구조이므로 책 본문을 길게 옮기기보다 목차와 자신의 생각 위주로 기록하는 것을 권장.
