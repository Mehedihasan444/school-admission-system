# UI / UX Specification (tabular)

Single-page React application (Vite 6, React 18, TypeScript, shadcn/ui, Tailwind, TanStack Query).
Frontend URL: `http://localhost:3000` | API: `http://localhost:8080`
All user-facing text lives in `frontend/src/shared/i18n/messages.bn.ts` (Bangla) and `frontend/src/shared/i18n/errorMessages.ts`.

---

## 1. Screen inventory

| # | Screen | Location | Purpose | Entry trigger |
|---|---|---|---|---|
| 1 | App shell | `src/app/App.tsx` | Layout container: header, student bar, class list, my applications | Page load |
| 2 | Student identity bar | `src/features/student/components/StudentBar/StudentBar.tsx` | Enter / view / change 17-digit birth registration number (student ID) | Always visible at top |
| 3 | Create class | `src/features/classes/components/CreateClassForm/CreateClassForm.tsx` | Admin creates a class (name + seat count) | Left column of App shell |
| 4 | Class list | `src/features/classes/components/ClassList/ClassList.tsx` | Browse classes with live seat counts; apply for a seat | Right column of App shell |
| 5 | Class card | `src/features/classes/components/ClassCard/ClassCard.tsx` | Per-class seat counts + apply button | Inside class list grid |
| 6 | My applications | `src/features/holds/components/MyHoldsList/MyHoldsList.tsx` | Student's own holds across classes, with status + countdown | Bottom section of App shell |
| 7 | Hold card | `src/features/holds/components/HoldCard/HoldCard.tsx` | Per-hold: status badge, countdown, pay / cancel buttons | Inside my applications grid |

---

## 2. Layout and shell

| Area | Component | Position | Visible when | Notes |
|---|---|---|---|---|
| Header | inline (`App.tsx`) | Top center | Always | App title + subtitle |
| Student bar | `StudentBar` | Below header, full width | Always | Edit mode when no student ID saved |
| Admin form | `CreateClassForm` | Left column (`grid lg:grid-cols-2`) | Always | Creates classes |
| Class list | `ClassList` | Right column (`grid lg:grid-cols-2`) | Always | Polls `GET /classes` every ~3 s |
| My applications | `MyHoldsList` | Bottom, full width | Always | Polls `GET /me/holds` every ~3 s |
| Error boundary | `ErrorBoundary` | Wraps entire app (`AppProviders`) | On unexpected render error | Shows Bangla unknown-error alert |

Global container: `mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6`.

---

## 3. Screen 2 — Student identity bar

| Element | Label | Type | Validation | Behavior | Persistence |
|---|---|---|---|---|---|
| Heading | "শিক্ষার্থীর পরিচয়" | text | — | Shown in form mode | — |
| Input | "জন্ম নিবন্ধন নম্বর (১৭ অঙ্ক)" | text, `inputmode="numeric"` | Exactly 17 digits (`isValidStudentId`) | On submit: save via `saveStudentId` | `localStorage` key `admission-student-id` |
| Set button | "সংরক্ষণ করুন" | submit | Form valid | Saves ID, exits edit mode | — |
| Change button | "পরিবর্তন" | button | — | Re-enters edit mode | — |
| Saved view | "শিক্ষার্থী:" + id | read-only | — | Badge + id in mono font + change button | — |
| Error | "জন্ম নিবন্ধন নম্বর ১৭ অঙ্কের হতে হবে।" | `role="alert"` | Shown when invalid | Inline, text-destructive | — |
| Hint | "এই নম্বরটি আপনার ব্রাউজারে সংরক্ষিত থাকবে।" | text | — | Below form | — |

Source: `messages.student.*`.

---

## 4. Screen 3 — Create class (admin)

| Field | Label | Type | Validation | Default |
|---|---|---|---|---|
| Class name | "class-এর নাম" | text | Non-empty, trimmed | "" |
| Seat count | "মোট seat সংখ্যা" | text, `inputmode="numeric"` | Positive integer, 1–100,000 | "" |
| Submit | "class তৈরি করুন" | button | — | Disabled while in flight |
| Submitting label | "তৈরি হচ্ছে…" | — | — | Shown while `isPending` |

Messages:
- name required: "class-এর নাম লিখুন।"
- seats invalid: "seat সংখ্যা ১ থেকে ১,০০,০০০ এর মধ্যে হতে হবে।"
- success: "class সফলভাবে তৈরি হয়েছে।" (`role="status"`)

On success: fields cleared, success message shown, class list refetched.

---

## 5. Screen 4 — Class list

| Element | Description | Format | Refresh | Accessibility |
|---|---|---|---|---|
| Heading | "class তালিকা" | `text-xl font-semibold` | — | `aria-labelledby="classes-heading"` |
| Loading | 2 skeleton cards | — | While `isLoading` | `aria-busy="true"`, sr-only label |
| Empty | "এখনো কোনো class তৈরি করা হয়নি।" | muted centered | When `data.length === 0` | — |
| Error | Inline alert + retry button | `messages.retry` | On `isError`, refetch on click | — |
| Cards | One `ClassCard` per class | Grid `gap-4 md:grid-cols-2` | Every ~3 s via `useClasses` | — |

Polling: `useClasses` refetches every 3 s; paused when tab hidden (React Query default). `staleTime: 1000 ms`, `retry: 1`.

---

## 6. Screen 5 — Class card

| Element | Label (Bangla) | Value | State rule | Disabled when |
|---|---|---|---|---|
| Total seats | "মোট seat" | `classSummary.totalSeats` | — | — |
| Held seats | "hold করা" | `classSummary.heldSeats` | unexpired HELD only | — |
| Confirmed seats | "নিশ্চিত" | `classSummary.confirmedSeats` | — | — |
| Available seats | "খালি seat" | `classSummary.availableSeats` | `total - held - confirmed` | — |
| Apply button | "আবেদন করুন" / "আবেদন করা হয়েছে" / "ভর্তি নিশ্চিত" / "আবেদন হচ্ছে…" | label by status | `messages.classes.apply` | No student ID, no seats, already applied, applying |
| No seats hint | "কোনো seat খালি নেই" | — | Shown when `availableSeats === 0` | — |
| Need ID hint | "আবেদন করতে উপরে জন্ম নিবন্ধন নম্বর দিন" | — | Shown when no student ID | — |
| Apply error | Inline alert | `toMessage(error)` | Per-class error map | Dismissible |

`applyButtonLabel` logic:
- `!canApply` → "আবেদন করুন"
- `!hasSeats` → "আবেদন করুন"
- status `HELD` → "আবেদন করা হয়েছে"
- status `CONFIRMED` → "ভর্তি নিশ্চিত"
- default → "আবেদন করুন"

`disabled = !canApply || !hasSeats || isApplying || alreadyApplied` where `alreadyApplied = status === HELD || status === CONFIRMED`.

Counts use `tabular-nums` and `aria-live="polite"`, `aria-atomic="true"`.

---

## 7. Screen 6 — My applications

| Element | Description | Format | Refresh |
|---|---|---|---|
| Heading | "আমার আবেদন" | `text-xl font-semibold` | — |
| No ID | "আপনার কোনো আবেদন নেওয়া যাচ্ছে না" (needStudentId) | muted centered | When `studentId === null` |
| Loading | skeleton | — | While loading |
| Empty | "আপনার কোনো আবেদন নেই।" | muted centered | When `data.length === 0` |
| Error | Inline alert + retry | `messages.retry` | On error |
| Cards | One `HoldCard` per hold | Grid `gap-4 md:grid-cols-2` | Every ~3 s via `useMyHolds` |

Source: `messages.holds.heading/empty/loading`.

---

## 8. Screen 7 — Hold card

| Element | Label | Value / behavior | Disabled when |
|---|---|---|---|
| Class title | `hold.className` | Card title | — |
| Status badge | `messages.status[status]` | Variant by status (see §9) | — |
| Countdown badge | "বাকি সময়: mm:ss" | Ticks every second from `expiresAt` | Hidden unless HELD or EXPIRED |
| Expiry time | "শেষ হওয়া: <ISO>" | `formatExpiryTime(expiresAt)` | Shown when HELD or EXPIRED |
| Pay button | "ভর্তি ফি দিন" / "নিশ্চিত হচ্ছে…" | `useConfirmHold` mutation | `!canConfirm || isBusy` |
| Cancel button | "বাতিল করুন" / "বাতিল হচ্ছে…" | `useCancelHold` mutation | `!canCancel || isBusy` |
| Hold error | Inline alert | `toMessage(error)` | Dismissible |

`displayStatus = (status === HELD && isExpired) ? EXPIRED : status` — flips to EXPIRED without reload when countdown hits zero.

Actions (`holdActionsFor` in `src/features/holds/model/types.ts`):

| Status | canConfirm | canCancel | showCountdown | showApplyAgainHint | confirmLabel | cancelLabel | notice |
|---|---|---|---|---|---|---|---|
| HELD | true | true | true | false | "ভর্তি ফি দিন" | "বাতিল করুন" | null |
| CONFIRMED | false | false | false | false | "নিশ্চিত" | "নিশ্চিত" | "আপনার ভর্তি নিশ্চিত হয়েছে।" |
| EXPIRED | false | false | false | true | "মেয়াদ শেষ" | "মেয়াদ শেষ" | "মেয়াদ শেষ হয়েছে। আবার আবেদন করতে পারবেন।" |
| CANCELLED | false | false | false | true | "বাতিল" | "বাতিল" | "আবেদনটি বাতিল করা হয়েছে। আবার আবেদন করতে পারবেন।" |

Terminal statuses (no actions): CONFIRMED, EXPIRED, CANCELLED.

---

## 9. Hold status → UI mapping

| Status | Badge variant | Countdown | Pay enabled | Cancel enabled | Notice shown | Apply-again hint |
|---|---|---|---|---|---|---|
| HELD | `secondary` | Yes | Yes | Yes | No | No |
| CONFIRMED | `default` | No | No | No | Yes ("আপনার ভর্তি নিশ্চিত হয়েছে।") | No |
| EXPIRED | `outline` | No | No | No | Yes ("মেয়াদ শেষ হয়েছে…") | Yes |
| CANCELLED | `destructive` | No | No | No | Yes ("আবেদনটি বাতিল করা হয়েছে…") | Yes |

`effectiveStatus(status, expiresAt, nowMs)` in `src/features/holds/model/types.ts`: a stored HELD hold with `expires_at <= now` reads as EXPIRED everywhere, matching backend behavior.

---

## 10. User flows

### 10.1 Apply flow (guardian)
| Step | Action | Endpoint | UI effect |
|---|---|---|---|
| 1 | Enter 17-digit student ID | — | Saved to `localStorage`, shown at top |
| 2 | Browse class list | `GET /classes` (poll) | Seat counts refresh live |
| 3 | Click "আবেদন করুন" | `POST /classes/{id}/holds` | Button shows "আবেদন হচ্ছে…", disabled |
| 4a | Success (201) | — | Button → "আবেদন করা হয়েছে", class list + my holds refetch |
| 4b | Full (409) | — | Inline Bangla error "দুঃখিত, এই class-এ এখন কোনো seat খালি নেই।" |
| 4c | Already applied (409) | — | Inline Bangla error "আপনি এই class-এ ইতিমধ্যে আবেদন করেছেন।" |

### 10.2 Confirm flow (guardian)
| Step | Action | Endpoint | UI effect |
|---|---|---|---|
| 1 | Hold is HELD, countdown running | — | Pay button enabled |
| 2 | Click "ভর্তি ফি দিন" | `POST /holds/{id}/confirm` | Button → "নিশ্চিত হচ্ছে…", disabled |
| 3a | Success (200) | — | Card → CONFIRMED, pay disabled, notice shown, lists refetch |
| 3b | Expired (409) | — | Bangla error "আপনার আবেদনের মಟ್ಟ শেষ হয়ে গেছে। আবার আবেদন করুন।" |
| 3c | Confirm twice | — | Idempotent: both 200, `confirmedSeats` rises once |

### 10.3 Cancel flow (guardian)
| Step | Action | Endpoint | UI effect |
|---|---|---|---|
| 1 | Hold is HELD | — | Cancel button enabled |
| 2 | Click "বাতিল করুন" | `DELETE /holds/{id}` | Button → "বাতিল হচ্ছে…", disabled |
| 3a | Success (204) | — | Card → CANCELLED, cancel disabled, notice + apply-again hint, lists refetch |
| 3b | Already confirmed (409) | — | Bangla error "এই আবেদনটি ইতিমধ্যে নিশ্চিত করা হয়েছে।" |

### 10.4 Expiry flow (no user action)
| Step | Trigger | UI effect |
|---|---|---|
| 1 | Local countdown reaches 0 | Status flips to EXPIRED immediately, pay button disabled |
| 2 | Next poll (~3 s) | Server reconciles, `GET /holds/{id}` returns EXPIRED |
| 3 | Class list | Seat freed on next read/apply (backend treats stale HELD as expired) |

---

## 11. Error messages (Bangla)

| Code | HTTP | Bangla message | UI placement |
|---|---|---|---|
| CLASS_FULL | 409 | দুঃখিত, এই class-এ এখন কোনো seat খালি নেই। | Class card inline alert |
| HOLD_EXPIRED | 409 | আপনার আবেদনের মেয়াদ শেষ হয়ে গেছে। আবার আবেদন করুন। | Hold card inline alert |
| ALREADY_APPLIED | 409 | আপনি এই class-এ ইতিমধ্যে আবেদন করেছেন। | Class card inline alert |
| INVALID_STUDENT_ID | 400 | জন্ম নিবন্ধন নম্বর ১৭ অঙ্কের হতে হবে। | Student bar error + API |
| VALIDATION_ERROR | 400 | দেওয়া তথ্যে ভুল আছে। অনুগ্রহ করে যাচাই করুন。 | Create class field errors |
| CLASS_NOT_FOUND | 404 | class-টি খুঁজে পাওয়া যায়নি। | Inline alert |
| HOLD_NOT_FOUND | 404 | আবেদনটি খুঁজে পাওয়া যায়নি। | Inline alert |
| HOLD_CANCELLED | 409 | এই আবেদনটি ইতিমধ্যে বাতিল করা হয়েছে। | Hold card inline alert |
| HOLD_ALREADY_CONFIRMED | 409 | এই আবেদনটি ইতিমধ্যে নিশ্চিত করা হয়েছে। | Hold card inline alert |
| NETWORK | — | সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন। | Query error inline alert |
| UNKNOWN | — | কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন। | Error boundary / fallback |

Dismiss label: "বাদ দিন". Retry label: "আবার চেষ্টা করুন".

Mapping: `src/shared/i18n/errorMessages.ts` `toMessage(error)`.

---

## 12. Polling, timers, and clock

| Target | Interval | Condition | Purpose |
|---|---|---|---|
| `GET /classes` | ~3 s | Tab visible | Live seat counts |
| `GET /me/holds` | ~3 s | Tab visible | Fresh hold statuses |
| Countdown tick | 1 s | Always (component mounted) | Local `remainingMs` from `expiresAt` |
| Clock source | — | `Date` response header offset | `serverClock.getServerNow()` corrects client drift |

Countdown: `useCountdown(expiresAt)` returns `{ remainingMs, isExpired }`. When `remainingMs === 0`, `isExpired = true` and UI shows EXPIRED without reload.

`staleTime: 1000 ms`, `retry: 1` in `AppProviders` QueryClient.

---

## 13. Accessibility

| Element | ARIA attribute | Value / purpose |
|---|---|---|
| Class list section | `aria-labelledby="classes-heading"` | Section label |
| My holds section | `aria-labelledby="holds-heading"` | Section label |
| Loading skeletons | `aria-busy="true"` | Busy region |
| Counts | `aria-live="polite"`, `aria-atomic="true"` | Live region for seat numbers |
| Status badge | `aria-live="polite"` | Status changes announced |
| Countdown badge | `aria-live="polite"` | Timer changes announced |
| Student ID input | `aria-invalid`, `aria-describedby` | Validation state |
| Inline error dismiss | `aria-label="বাদ দিন"` | Dismiss button |
| Error boundary alert | `aria-live="assertive"` | Unexpected errors |
| Apply button | — | Disabled state communicated visually |

---

## 14. Component catalog

| Component | File | Props (key) | Purpose |
|---|---|---|---|
| App | `src/app/App.tsx` | — | Shell: header, student bar, class list, my holds |
| AppProviders | `src/app/AppProviders.tsx` | `children` | QueryClientProvider + ErrorBoundary |
| StudentBar | `src/features/student/components/StudentBar/StudentBar.tsx` | `studentId`, `onSave` | Enter / view / change student ID |
| CreateClassForm | `src/features/classes/components/CreateClassForm/CreateClassForm.tsx` | — | Admin class creation form |
| ClassList | `src/features/classes/components/ClassList/ClassList.tsx` | `studentId`, `applyingClassId`, `onApply`, `myHolds`, `applyErrorByClassId`, `onDismissApplyError` | Class grid + loading/error/empty |
| ClassCard | `src/features/classes/components/ClassCard/ClassCard.tsx` | `classSummary`, `canApply`, `isApplying`, `applicationStatus`, `applyError`, `onDismissError`, `onApply` | Per-class counts + apply button |
| MyHoldsList | `src/features/holds/components/MyHoldsList/MyHoldsList.tsx` | `studentId` | Student's holds grid |
| HoldCard | `src/features/holds/components/HoldCard/HoldCard.tsx` | `hold`, `studentId` | Per-hold status, countdown, pay/cancel |
| CountdownBadge | `src/features/holds/components/CountdownBadge/CountdownBadge.tsx` | `status`, `expiresAt` | Time remaining + expiry time |
| HoldStatusBadge | `src/features/holds/components/HoldStatusBadge/HoldStatusBadge.tsx` | `status` | Colored status pill |
| InlineError | `src/shared/components/InlineError/InlineError.tsx` | `error`, `message`, `onDismiss` | Destructive alert with dismiss |
| ErrorBoundary | `src/shared/components/ErrorBoundary/ErrorBoundary.tsx` | `children`, `fallback` | Catch unexpected render errors |

---

## 15. Hooks catalog

| Hook | File | Purpose |
|---|---|---|
| useStudentId | `src/features/student/hooks/useStudentId.ts` | Read/write 17-digit student ID in `localStorage` |
| useClasses | `src/features/classes/hooks/useClasses.ts` | Poll `GET /classes` (~3 s) |
| useCreateClass | `src/features/classes/hooks/useCreateClass.ts` | `POST /classes` mutation |
| useApplyHold | `src/features/holds/hooks/useApplyHold.ts` | `POST /classes/{id}/holds` mutation |
| useConfirmHold | `src/features/holds/hooks/useConfirmHold.ts` | `POST /holds/{id}/confirm` mutation |
| useCancelHold | `src/features/holds/hooks/useCancelHold.ts` | `DELETE /holds/{id}` mutation |
| useMyHolds | `src/features/holds/hooks/useMyHolds.ts` | Poll `GET /me/holds` (~3 s) |
| useCountdown | `src/shared/hooks/useCountdown.ts` | 1-second countdown from `expiresAt` |

---

## 16. API → UI contract (frontend side)

| Endpoint | Method | Used by | Success handling | Error mapping |
|---|---|---|---|---|
| POST /classes | — | useCreateClass | 201 → clear form, success msg, refetch classes | 400 → field errors |
| GET /classes | — | useClasses | 200 → render class cards | → inline alert + retry |
| POST /classes/{id}/holds | — | useApplyHold | 201 → refetch classes + my holds | 409 → per-class inline alert |
| GET /holds/{id} | — | (via my holds) | 200 → render hold card | → inline alert |
| POST /holds/{id}/confirm | — | useConfirmHold | 200 → refetch classes + my holds | 409 → hold inline alert |
| DELETE /holds/{id} | — | useCancelHold | 204 → refetch classes + my holds | 409 → hold inline alert |
| GET /me/holds | — | useMyHolds | 200 → render hold cards | → inline alert + retry |

Base URL from `window.__CONFIG__` (`public/config.js`) or `http://localhost:8080` fallback.

---

## 17. LocalStorage

| Key | Value | Lifetime | Used by |
|---|---|---|---|
| `admission-student-id` | 17-digit string | Persists across refresh / reopen | `useStudentId` |

---

## 18. Visual design notes

- Framework: shadcn/ui primitives (`Button`, `Input`, `Label`, `Card`, `Badge`, `Alert`, `Skeleton`) in `src/components/ui/`.
- Styling: Tailwind utility classes + `cn()` from `src/lib/utils.ts`; no CSS Modules or ad-hoc global CSS.
- Icons: `lucide-react` (`AlertCircle`, `BadgeCheck`, `UserRound`).
- Font: Bangla-capable stack in `src/index.css`.
- Colors: shadcn semantic tokens (`primary`, `destructive`, `muted`, `card`, `background`, `foreground`).
- Density: compact cards, `gap-4` grids, `max-w-5xl` centered container.
- No visual polish beyond correctness/clarity (per PRD non-goals).

---

This document is generated from the implemented frontend source under `frontend/src/`. It reflects the actual UI/UX as built, not aspirational design.
