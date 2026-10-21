# ErrataScope

[Open the review desk](https://zuotu295.github.io/erratascope-genlayer/) · [Standalone Intelligent Contract](https://github.com/zuotu295/citation-impact-primitive)

Read a publisher correction in the context of the exact claims you cite. One notice can change an author detail while leaving a citation to the study’s subject outside its scope.

ErrataScope seals up to four citation uses, asks a GenLayer Intelligent Contract to assess a PLOS ONE publisher notice, and records a separate action for each use. Each notice adds a revision. A later unrelated notice cannot erase an earlier warning.

## Run locally

Node.js 22 and Python 3.12+:

```sh
npm ci
npm test
python -m unittest discover -s contract-tests -v
npm run build
npm run dev
```

The static production output is `dist/`. No backend, paid API subscription, or application API key is required. Browser-wallet transactions use Stable Studionet, chain ID 61999. Do not use mainnet funds.

## Use the desk

- **Worked example** explains a real publisher affiliation correction. Its interpretations are authored examples, visibly labeled, and are not chain results.
- **Your citation dossier** lets you fix a paper DOI, title, one to four citation uses, and source locators. A wallet signs `seal` to preserve that input.
- **Assess this notice** requests a new assessment of the sealed dossier. The contract reads the publisher source; the browser never supplies its own outcome.
- **Read a chain record** loads a public owner-qualified dossier without a wallet. Each retained revision is available through the contract.
- **Export JSON** includes the input, assessment, source snapshot, hashes and any receipt loaded during the current browser session. An export labeled `CHAIN_READBACK` is a state read; inspect its receipt independently when using it as transaction evidence.

See [USAGE.md](USAGE.md) for deployment, wallet, and recovery instructions, and [CONTRACT.md](CONTRACT.md) for the protocol and trust boundary.

## Source and deployment

The complete contract is included at `contracts/errata_scope.py`. `deployment.json` fixes its SHA256, protocol and network. `npm run build` verifies that digest before bundling. The browser compares the full deployed source to the bundled source before enabling writes.

The release is deployed on Stable Studionet. **Read finalized example** verifies the deployed source, successful consensus receipt, signed arguments and persisted revision without a wallet. [Network evidence](evidence/studionet-v3.json) records the deployment, seal and assessment. [Revision 1](evidence/review-1.json) preserves the input, notice snapshot, findings and actions. The recorded transactions use Studio full consensus; they do not exercise an external wallet extension.

The included GitHub Actions workflow tests the project and publishes `dist/` when GitHub Pages is configured to use Actions.

## Boundaries

First release: PLOS ONE textual publisher corrections, retractions and expressions of concern. An inaccessible, oversized or changing source fails closed. Missing linkage or inadequate evidence cannot clear a claim. This is an assessment of one notice against user-declared citation uses, not a paper truth score or a search for every notice.

## Finalized example

The sealed dossier cites study scope (C1) and reproduces an author affiliation (C2). The official affiliation correction finalized with majority agreement and persisted revision 1: C1 `NO_CHANGE_FROM_NOTICE`, C2 `REWRITE`. This result concerns this notice only; it does not establish the paper’s scientific validity.

MIT · zuotu295
