# Citation impact protocol

`ErrataScope` is a reusable GenLayer Intelligent Contract with one nondeterministic entry point, `assess`. The complete source is `contracts/errata_scope.py`.

| Method         | Arguments                                 | Behavior                                                                 |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| `seal`         | dossier_id, payload                       | Owner-scoped immutable paper and citation-use record                     |
| `assess`       | dossier_id, notice_doi, expected_revision | Owner-only publisher retrieval and independently validated impact matrix |
| `get_dossier`  | owner, dossier_id                         | Original record and input SHA256                                         |
| `get_revision` | owner, dossier_id                         | Latest retained revision number                                          |
| `get_review`   | owner, dossier_id, revision               | Notice snapshot, findings, per-notice actions and cumulative actions     |
| `get_protocol` | none                                      | `erratascope-1`                                                          |

## Independent consensus

The leader fetches the canonical PLOS ONE page and proposes a bounded claim matrix. Each validator independently fetches and normalizes the page, requires the same source digest, and derives the original-paper link and notice kind from that source. It checks every proposed effect, quotation and reason against the source and declared citation use. All three support checks must be literal true for every claim. Candidate assertions are untrusted. JSON shape or a single overall approval is insufficient.

Validation checks the proposed assessment against publisher evidence. Rejection codes identify invalid structure, source changes, unsupported findings and runtime errors.

The contract verifies exact quotation membership, claim identity, complete matrix coverage and notice-type constraints. A full retraction must withdraw every claim. An expression of concern cannot clear a claim. Only an accepted assessment reaches deterministic storage.

| Effect            | Per-notice action       |
| ----------------- | ----------------------- |
| `UNCHANGED_SCOPE` | `NO_CHANGE_FROM_NOTICE` |
| `CHANGED`         | `REWRITE`               |
| `WITHDRAWN`       | `STOP_CITING`           |
| `UNCERTAIN`       | `REVIEW`                |

Cumulative actions retain the maximum severity in the order `STOP_CITING > REVIEW > REWRITE > NO_CHANGE_FROM_NOTICE`. This conservative summary applies only to reviewed notices. It is not a claim that an unresolved issue still exists in a separately revised manuscript. A revised citation context should be sealed as a new dossier. There is no automatic clearing or appeal workflow in this release.

## State and failure behavior

Dossier keys are `lowercase-owner::dossier-id`. Review keys append the revision. A caller can neither alter another owner’s dossier nor replace a sealed one. Expected revision prevents assessment against an unexpectedly changed history. A notice can be assessed only once per dossier; a materially changed page at the same DOI needs a new dossier in this release.

Bounds: 1–4 claims, 500 characters per claim, 120 per locator, 200 per paper title, 80,000 characters per raw page. Pages are rejected rather than silently truncated. Source text is whitespace-normalized before hashing, quoting and persistence. Original HTTP bytes are not preserved.

Source drift, malformed extraction, missing paper linkage, unsupported notice types and validator disagreement leave the existing history unchanged. A positive chain execution can still persist `UNCERTAIN`; transaction success is distinct from a favorable assessment.

## Trust boundary

Publisher text is fetched from a fixed HTTPS host. The original paper’s full text is not retrieved. Claims and locators remain user declarations; the contract does not verify their original experimental support. A notice must identify the original paper, but the system does not discover all notices or treat a lack of corrections as proof of reliability. LLM-based interpretation can be mistaken despite consensus. Image-only evidence and ambiguous notices need human review.

## References

- [GenLayer independent verification and Equivalence Principle](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle)
- [GenLayer web access](https://docs.genlayer.com/developers/intelligent-contracts/features/web-access)
- [Crossmark publication-status metadata](https://www.crossref.org/services/crossmark/)
- [Worked-example publisher notice](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0269047)

Crossmark and Scite already help identify publication notices. ErrataScope’s narrower implementation preserves claim-specific citation uses, consensus-backed notice impact and an append-only history with conservative cumulative actions. No claim of market exclusivity is made.
