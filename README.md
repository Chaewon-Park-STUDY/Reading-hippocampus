# 독서해마 (Reading Hippocampus)

책 목차 위에 질문 말풍선을 띄우고, 링크로 누구와든 의견을 나누는 마인드맵 독서 노트.

## 기능

- **서가**: 왼쪽에 책 목록. 책 제목을 누르면 목차(부 → 장)가 펼쳐짐. **누구나** 책과 목차를 추가할 수 있음 (같은 제목+저자는 중복 등록 불가)
- **마인드맵**: 책 → 목차 → 말풍선이 큰 캔버스에 펼쳐짐. 목차를 누르면 해당 위치로 이동
- **말풍선**: 읽다 든 의문·토의 거리를 목차(또는 책 전체)에 띄움. 색은 팔레트나 직접 고르기
- **의견**: 말풍선을 누르면 오른쪽 패널에서 댓글. 사람마다 고유 색
- **우체통 📮**: 내 말풍선에 다른 사람이 의견을 달면 실시간으로 도착
- **링크 공유**: `?book=…&bubble=…` 주소를 그대로 뿌리면 같은 화면으로 입장
- **가입 없음**: 처음 들어오면 닉네임 + 색만 고르면 됨 (Supabase 익명 로그인)

## Stack

Next.js (App Router, TS, Tailwind) · React Flow (`@xyflow/react`) · Supabase (Anonymous Auth, Postgres + RLS, Realtime)

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

Supabase 설정 없이 실행하면 **데모 모드**로 열림 (이 브라우저에만 저장, 샘플 책 + 우체통 예시 포함).

### Supabase 연결

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins** 켜기
3. **SQL Editor**에 `supabase/migrations/0001_init.sql` 붙여넣고 실행
4. `.env.example`을 `.env.local`로 복사하고 **Project Settings → API**의 URL, anon key 입력
5. `npm run dev` 재시작 → 헤더의 "데모 모드" 배지가 사라지면 연결 완료

## 권한 (RLS)

| | 읽기 | 추가 | 수정·삭제 |
|---|---|---|---|
| 책 · 목차 · 말풍선 · 의견 | 누구나 | 로그인(익명 포함)한 누구나, 본인 명의로만 | 작성자만 |
| 우체통 | 본인만 | DB 트리거가 자동 생성 | 본인(읽음 처리) |

## 구조

```
src/
  app/                 page.tsx (클라이언트 전용 진입), layout, globals.css
  components/
    App.tsx            상태·데이터 흐름
    Sidebar.tsx        서가 + 목차 트리
    MindMap.tsx        React Flow 캔버스, 커스텀 노드(책/목차/말풍선)
    Panels.tsx         말풍선 작성, 스레드 패널, 우체통, 프로필
  lib/
    types.ts           데이터 타입 + Store 인터페이스
    layout.ts          좌→우 트리 자동 배치
    store/             supabase.ts (실서비스) · local.ts (데모)
supabase/migrations/   스키마 · RLS · 우체통 트리거
```

## 다음 할 일

- [ ] 목차·책 이름 수정/삭제 UI
- [ ] 말풍선 위치 직접 드래그해서 저장
- [ ] 신고/숨김 (익명 공간 관리)
- [ ] 배포 (Vercel)

> 공개 공간이므로 책 본문을 길게 옮기기보다 목차와 자신의 생각 위주로 기록하는 것을 권장.
