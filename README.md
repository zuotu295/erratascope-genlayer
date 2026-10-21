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

This source release has no recorded deployed address or finalized live assessment. The deployment manifest deliberately contains null deployment fields. A working example, a successful local build, and mocked tests do not establish a live GenVM deployment. Wallet, live consensus and public hosting require separate verification.

The included GitHub Actions workflow tests the project and publishes `dist/` when GitHub Pages is configured to use Actions.

## Boundaries

First release: PLOS ONE textual publisher corrections, retractions and expressions of concern. An inaccessible, oversized or changing source fails closed. Missing linkage or inadequate evidence cannot clear a claim. This is an assessment of one notice against user-declared citation uses, not a paper truth score or a search for every notice.

MIT · zuotu295

## Network verification

The previous source deployed and sealed the example on Stable Studionet, but its assessment ended with `MAJORITY_DISAGREE` after three rotations and persisted no review. [Pinned network observations](evidence/studionet-v1.json) identify that source and all three transactions. The revised source-grounded validator included here has passed local protocol tests but has not yet been deployed or verified by live consensus.
