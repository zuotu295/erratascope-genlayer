# ErrataScope v0.2 — Revision comparison workspace

Baseline: `84549369a40143af238e44e05ad3d95907fe6492`.

## What changed

The earlier release displayed one notice assessment at a time and provided buttons for the ten most recent revisions. Readers had to manually track changes to each citation use.

This release adds a read-only revision comparison workflow:

- Compare sealed input (baseline 0) or any earlier revision with a later retained revision, including revisions outside the recent-history buttons.
- Inspect both notice-specific and cumulative actions for every claim, side by side with source quotations and explanations.
- Identify action changes, cumulative-action changes, evidence-only changes and retained earlier warnings.
- Distinguish an unassessed sealed baseline from a notice-specific no-change result.
- Export self-contained JSON comparison reports and CSV comparison tables; protect CSV fields from spreadsheet formula interpretation.
- Verify contract source, dossier identity, canonical input digest, requested revision numbers, source snapshot digests and complete ordered claim/action matrices before presenting results.

## Reproduce

1. Open https://zuotu295.github.io/erratascope-genlayer/ and select **Read finalized example**. This verifies the original assessment receipt and reads the saved dossier.
2. Scroll below the review desk to **What changed between reviews?**
3. Leave Earlier revision at 0 and Later revision at 1. Select **Compare finalized revisions**. No wallet is needed and no transaction is submitted.
4. C1 changes from Not assessed to No change from this notice. C2 changes from Not assessed to Rewrite this citation. Both source quotations and cumulative actions are visible.
5. Download both JSON and CSV. JSON preserves the sealed input, both endpoint records, verification digests, per-claim changes and explicit limits.
6. Set Earlier revision to 1 while Later revision remains 1: comparison is rejected. Return to the authored walkthrough: the chain comparison is cleared.

For a dossier with multiple notices, enter any valid earlier/later pair. Non-adjacent endpoints do not claim to show every intermediate event. An unchanged notice action does not clear a previous cumulative warning.

## Verification

31 JavaScript tests (including seven new comparison tests), 36 existing mocked-host contract tests, production build with contract-source verification, and DOM interaction checks passed. Tests cover retained warnings, evidence-only changes, arbitrary revision endpoints, invalid ranges, substituted dossier/source/claim identities, baseline semantics and CSV escaping. GitHub test/build and Pages deployment succeeded for feature commit `ec9fc26c046526c672ad6f0bfc8164adbf0505d2`. Live browser checks read the original finalized example, verified the baseline-to-R1 comparison, downloaded and inspected both JSON/CSV reports, and rejected an equal-revision range. The exported live report is [evidence/milestone-1/comparison-0-1.json](evidence/milestone-1/comparison-0-1.json). The two claims correctly move from unassessed baseline to NO_CHANGE_FROM_NOTICE and REWRITE, respectively. This verification reads existing chain state; it creates no transaction. Desktop layout was visually checked; mobile layout is implemented but not visually verified in a mobile browser.

The deployed contract and its protocol are unchanged. This release adds application functionality over retained GenLayer records. It does not claim new on-chain assessments, a new contract deployment, new users or traction. Existing network receipts describe the original deployment and assessment only.
