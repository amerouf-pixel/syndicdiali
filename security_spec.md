# Security Specification — SyndicSimple / SyndicDiali

## 1. Data Invariants
1. **Default-Deny Catch-All**: All paths not explicitly matched are denied for both `read` and `write`.
2. **Verified Authentication & Ownership**: Every write (`create`, `update`, `delete`) requires `request.auth != null`, `request.auth.token.email_verified == true`, and strict ownership (`ownerUid == request.auth.uid`) or bootstrapped admin verification (`exists(/databases/$(database)/documents/admins/$(request.auth.uid))`).
3. **Path Variable Hardening**: Every single-document ID (`{aptId}`, `{expenseId}`, `{incidentId}`, `{annoId}`, `{pollId}`) must match `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
4. **Strict Schema & No Shadow Fields**: Every `create` operation validates `keys().hasAll(...)` and `keys().hasOnly(...)`. Every `update` operation begins with the `isValid[Entity](incoming())` helper AND uses action-based `affectedKeys().hasOnly(...)`.
5. **PII Isolation**: No raw PII (phone numbers or emails) is stored in shared building ledger collections (`apartments`, `expenses`, `incidents`, `announcements`, `polls`).
6. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.ownerUid == request.auth.uid` (no blanket `isSignedIn()` reads).
7. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on `create` and remain immutable (`incoming().createdAt == existing().createdAt`) on `update`. `updatedAt` must equal `request.time` on `create` and `update`. `ownerUid` is immutable after creation.
8. **Terminal State Locking**: Once an `incident` reaches `status == 'fixed'`, non-admin users cannot mutate it further.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth == null` attempting to create an expense in `/expenses/exp_1`.
2. **Unverified Email Spoof**: `auth.uid == 'user_1'`, `auth.token.email_verified == false` attempting to create an apartment record.
3. **Identity Spoofing on Create**: `auth.uid == 'user_1'` creating `/expenses/exp_1` with `ownerUid: 'user_2'`.
4. **Shadow Field Injection on Create**: Creating `/expenses/exp_1` with an undeclared field `isApprovedByBank: true`.
5. **Shadow Field Injection on Update**: Updating `/apartments/apt_1` with an extra field `adminOverride: true`.
6. **Owner Hijack on Update**: Updating `/expenses/exp_1` to change `ownerUid` from `'user_1'` to `'attacker_uid'`.
7. **Timestamp Forgery on Create**: Creating `/incidents/inc_1` with a past client timestamp `createdAt: Timestamp(2020, 1, 1)` instead of `request.time`.
8. **Immutable `createdAt` Tampering on Update**: Updating `/incidents/inc_1` while modifying `createdAt`.
9. **Terminal State Bypass**: Non-admin user attempting to update `/incidents/inc_fixed` when `existing().status == 'fixed'`.
10. **ID Poisoning Attack**: Creating a document with a 300-character or special-character ID `/expenses/bad$id!@#`.
11. **Value / Resource Poisoning**: Updating `amount` on `/expenses/exp_1` with a negative number (`-500`) or string (`"1000000"`).
12. **Cross-Tenant List Scraping**: Authenticated user `'user_1'` querying `/expenses` without `where('ownerUid', '==', 'user_1')` to read `'user_2'` documents.
