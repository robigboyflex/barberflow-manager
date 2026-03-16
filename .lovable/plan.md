

# Security Review Findings

The automated scan plus manual code review surfaced **3 critical issues**, **2 moderate issues**, and **2 low-severity items**.

---

## Critical (must fix)

### 1. All appointment data is publicly readable
The RLS policy `Appointments viewable by shop staff` uses `USING: true` for the `public` role. This means **any unauthenticated user** can query the `appointments` table and read every customer's name, phone number, notes, and payment details across all shops.

**Fix:** Drop this policy. Replace it with a scoped policy that only allows authenticated owners to read appointments in their own shops (already covered by the existing owner policy) and keep the anon INSERT policy for booking.

### 2. Shift records are readable and writable by anyone
The three staff-facing RLS policies on `shifts` (`Staff can view own shifts`, `Staff can insert own shifts`, `Staff can update own shifts`) check only that a matching active staff record exists — they do **not** verify the requester's identity via `auth.uid()` or session token. Any anonymous user can read all shift records (including `total_revenue`, `total_transactions`) and insert/update shifts for any staff member.

**Fix:** Drop the three permissive staff policies. Shift operations are already handled through RPCs (`staff_clock_in`, `staff_clock_out`, `close_shift`). The owner ALL policy already covers owner access. No direct staff policies are needed.

### 3. Staff table leaks barber names to anonymous users
The `BookAppointment` page queries `staff` directly for barber names. The RLS on `staff` only allows owners. This query likely fails silently for anon users, but the attempt reveals the design expects public access to staff data. If a permissive SELECT policy were ever added for anon, it would expose PINs (`pin_plain`), phone numbers, and salary data.

**Fix:** The booking page should fetch barbers through a public RPC that returns only `id` and `name` for active barbers in a given shop, rather than querying the `staff` table directly.

---

## Moderate

### 4. Leaked password protection is disabled
Supabase's built-in check against known breached passwords is turned off. Users can sign up with passwords like `password123` that appear in public breach databases.

**Fix:** Enable leaked password protection in the Supabase dashboard under **Authentication > Settings**.

### 5. No input length/format validation on booking form
The `BookAppointment` page does minimal validation — only checking that fields are non-empty. There are no length limits on `customer_name`, `customer_phone`, or `notes`, and no phone format validation. This could allow excessively large payloads or malformed data.

**Fix:** Add Zod validation to the booking form (similar to the Auth page), enforcing max lengths and a phone number pattern.

---

## Low

### 6. No password reset flow
There is no forgot-password or `/reset-password` page. If an owner forgets their password, they have no self-service recovery path.

**Fix:** Add a "Forgot Password" link on the Auth page and a `/reset-password` route.

### 7. Console error logging includes raw errors
Several pages use `console.error` with raw error objects (e.g., `BookAppointment`, `StaffLogin`). In production, this could leak internal details in browser dev tools.

**Fix:** Use the existing `logError` utility consistently and avoid logging raw error objects.

---

## Implementation Plan

### Database migration (single SQL migration)

1. **Drop the overly permissive appointments SELECT policy** and replace with an owner-scoped one (already exists, so just drop the bad one).
2. **Drop the three staff-facing shifts policies** — RPCs and the owner ALL policy cover all legitimate access.
3. **Create a public RPC** `get_public_shop_barbers(p_shop_id uuid)` that returns only `id` and `name` for active barbers, so the booking page doesn't need direct staff table access.

### Frontend changes

1. **`src/pages/BookAppointment.tsx`** — Switch from querying `staff` table directly to calling the new `get_public_shop_barbers` RPC. Add Zod validation for form inputs.
2. **`src/pages/Auth.tsx`** — Add a "Forgot Password?" link (and create a `/reset-password` page) — optional, lower priority.

### Supabase dashboard

1. Enable **Leaked Password Protection** in Authentication settings.

---

## Summary Table

```text
#  Severity  Issue                                    Action
─  ────────  ───────────────────────────────────────  ──────────────────────────
1  CRITICAL  Appointments publicly readable           Drop bad RLS policy
2  CRITICAL  Shifts readable/writable by anyone       Drop 3 staff RLS policies
3  CRITICAL  Staff table queried from public page     New public RPC for barbers
4  MODERATE  Leaked password protection off           Enable in dashboard
5  MODERATE  No booking form validation               Add Zod schema
6  LOW       No password reset flow                   Add reset pages
7  LOW       Raw console.error logging                Use logError utility
```

