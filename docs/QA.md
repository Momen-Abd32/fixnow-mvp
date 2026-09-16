# FixNow QA Notes

## Visual preview

A mobile-size web preview was captured at 390 × 844 for the customer home, service history, technician workspace, profile, diagnosis, and administrator routes.

| Route | Result | Observation |
|---|---|---|
| `/` | Pass | Branded FixNow home renders with accessible header actions, hero call-to-action, AI triage entry, loading state and bottom navigation. |
| `/(tabs)/jobs` | Pass | The signed-out history state clearly explains that secure sign-in is required and gives a working sign-in action. |
| `/(tabs)/technician` | Pass | The signed-out specialist onboarding state renders correctly and explains the verification path. |
| `/(tabs)/profile` | Pass | Account protection boundary, navigation tabs, typography, and sign-in action are legible. |
| `/diagnosis` | Pass | The sensitive AI diagnosis data boundary requires sign-in before a description or image is submitted. |
| `/admin` | Pass | Administrative route correctly rejects unauthenticated/non-admin access without exposing operational records. |

The uncredentialed preview correctly renders protected screens as account gates. Authenticated request creation, matching, technician actions, media uploads, location consent, payment confirmation, review creation, and administrative data controls are wired to protected API procedures and require a real session plus test records.

## Automated validation

- `pnpm check`: passed.
- `pnpm test`: passed 3 tests across lifecycle/matching and OAuth logout fixtures.
- Database migration `drizzle/0001_curly_gabe_jones.sql`: reviewed and successfully applied to the managed database.

## Follow-up catalogue verification

After the public catalogue API initialized the service records, the 390 × 844 home preview was re-captured. **AC repair** and **Plumbing** cards rendered with their category icons and 15–40 JOD / 12–45 JOD starting ranges, confirming that the customer home consumes the live catalog rather than only its loading state.

## Final settled home check

After the post-edit client reload settled, the mobile preview showed the live service cards beneath the home hero with no layout clipping. The temporary loading state observed immediately after a hot reload resolved normally once the public catalogue query completed.
