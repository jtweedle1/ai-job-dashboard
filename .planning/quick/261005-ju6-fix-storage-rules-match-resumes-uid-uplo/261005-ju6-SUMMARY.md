---
phase: quick-261005-ju6
plan: 01
status: complete
requirements: [SEC-05]
key-files:
  modified: [storage.rules]
commit: 81b4d06
---

# Quick 261005-ju6: storage.rules fix

Rewrote storage.rules: removed bypassing `/{uid}/{allPaths=**}` block; added `resumes/{uid}/{fileName}` (owner, PDF, 5 MB on create/update; read/delete owner) and `{uid}/companies/{companyId}/logo` (owner, image/*, 2 MB); explicit default deny retained. Client code untouched. No deploy; user pastes into Firebase Console.

## Deviations
Worktree base was 9f353b2; reset to expected base 8553b78 per branch check. Otherwise none.
