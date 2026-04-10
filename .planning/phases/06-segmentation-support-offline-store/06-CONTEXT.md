# Phase 6: Segmentation, Support & Offline Store - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Customer segment selection with segment-specific recommendations and scanning guidance, FAQ/support pages with 90-day satisfaction guarantee, and offline store introduction page featuring 강남역 지하상가 location with smart insole kit service and reservation system.

</domain>

<decisions>
## Implementation Decisions

### Customer Segmentation
- **D-01:** Segment selection on landing page or first visit — 3 options: 발 건강 고민 / 일반 소비자 / 운동선수
- **D-02:** Segment stored in user profile (or localStorage for guests)
- **D-03:** Segment-specific recommendations: health segment → cushioning + support shoes, general → comfort, athlete → performance
- **D-04:** Health segment scanning page shows condition-specific guidance: 평발 / 요족 / 무지외반 / 족저근막염
- **D-05:** Athlete segment scan flow emphasizes walking video + links to SALTED kit rental program
- **D-06:** Segment-specific product filter pre-applied on catalog page

### Support & Guarantee
- **D-07:** FAQ page at /faq with accordion sections: 측정 정확도 / 배송 / 반품/교환 / 맞춤 인솔 / 오프라인 매장
- **D-08:** Contact form at /support with email submission (subject categories)
- **D-09:** 90-day satisfaction guarantee displayed on landing page footer + FAQ + product pages
- **D-10:** Free remake policy page explaining remake process

### Offline Store Page (강남역 지하상가)
- **D-11:** Store page at /stores/gangnam with sections: 히어로 (매장 사진) / 위치 안내 / 스마트 인솔 키트 서비스 / 예약 폼 / FAQ
- **D-12:** Store info: 서울특별시 강남구 강남역 지하상가 (example address). Hours: 평일 10:00-21:00, 주말 10:00-20:00. 전화: 02-XXX-XXXX
- **D-13:** Location map using Kakao Maps static image (or embedded Kakao Maps if API available)
- **D-14:** Reservation form: 이름, 연락처, 방문 희망 날짜/시간, 관심 서비스 (일반측정 / SALTED 정밀측정 / 운동선수 키트 대여). Posts to /api/reservations created in Phase 5
- **D-15:** Athlete kit rental info section explaining 1-2 week rental for 운동선수 customers

### Claude's Discretion
- FAQ content specifics (boilerplate Korean text)
- Store photo placeholders (use abstract illustrations)
- Exact Kakao Maps integration approach (static image vs JS SDK)
- Contact form email template

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — Two-line approach, offline store decision
- `.planning/REQUIREMENTS.md` — SEGM-01~03, SUPP-01~03, OFFL-01~04
- Phase 5 reservations API created for admin management

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(main)/layout.tsx` — Add store page to main layout
- `src/components/empty-state.tsx` — Reusable for FAQ sections
- `src/components/ui/accordion.tsx` — Install via shadcn for FAQ (if not present)
- Existing reservation schema from Phase 5 admin

### Established Patterns
- shadcn/ui, Pretendard, Korean UI
- Server components with auth() check for authenticated pages
- TanStack Query for client data fetching

### Integration Points
- Segment selection affects Phase 3 product catalog filtering
- Reservation form posts to Phase 5 reservation API
- FAQ links from multiple pages

</code_context>

<specifics>
## Specific Ideas

- 강남역 지하상가 매장은 예시 데이터 — 실제 매장 정보는 나중에 수정 가능
- Smart insole kit service 설명에 Phase 2-3에서 언급된 Moticon/SALTED 제품 기반 측정 서비스임을 명시
- Athlete rental section은 축구화/마라톤화 맞춤 제작용으로 1-2주 대여 프로그램

</specifics>

<deferred>
## Deferred Ideas

- Store photo gallery — need real photos
- Multi-store support — v2 feature
- Live chat — use email contact form for v1

</deferred>

---

*Phase: 06-segmentation-support-offline-store*
*Context gathered: 2026-04-10*
