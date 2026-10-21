# Using ErrataScope

## Configure a deployment

1. Build and serve the application over HTTP or HTTPS.
2. Open **Studionet settings**. Connect an EIP-1193 wallet on **Stable Studionet, 61999**. OKX Wallet is preferred when present; other EIP-1193 providers are supported by the client integration.
3. For a new deployment, expand **Deploy this contract from your wallet** and select **Deploy bundled contract**. Review the wallet request and sign once. The application uses the included source and full-consensus mode, with no constructor arguments.
4. Use **Recheck · read only** until finality and successful execution are available. Rechecking never sends another transaction. The deployed address is accepted only after a complete source comparison and protocol read.
5. For an existing installation, paste its contract address and choose **Verify contract source**. An unexpected source or protocol blocks writes.
6. After independently verifying deployment, record its address and deployment hash in `deployment.json`. Add only real finalized records to `verified_records`.

Connecting a wallet does not switch networks or import a private key. Switch to Stable Studionet in the wallet if asked. The application stores addresses and pending transaction references locally, never private keys.

## Seal and assess

1. Choose **Your citation dossier**. Enter a unique 3–48 character dossier ID containing letters, digits, hyphens or underscores.
2. Enter the original PLOS ONE DOI, paper title, and 1–4 citation uses with source locations. Use DOI text such as `10.1371/journal.pone.0251194`, not a URL.
3. Select **Seal dossier on GenLayer** and sign. Recheck until successful finalized execution and matching state readback. Editing the form afterwards does not edit the sealed record.
4. Enter a distinct publisher-notice DOI. Choose **Assess this notice** and sign once. The request includes the current expected revision.
5. Recheck its receipt. The application requires finalized status, successful execution, majority agreement for assessments, matching sender/destination/method/arguments and matching state readback.
6. Inspect each claim’s per-notice action and cumulative action. Read the source evidence. Export the dossier when needed.

The worked example uses Seibold et al.’s 2022 affiliation correction for their 2021 reproducibility study. Its two local interpretations illustrate study scope versus affiliation use. The **Worked example** tab contains local illustrations. **Read finalized example** retrieves the saved on-chain assessment and verifies its receipt.

## Read and recover

Enter a contract address, record owner address and dossier ID to read public state without connecting a wallet. Reads explicitly request finalized state. Recent revision buttons load up to ten retained revisions; older ones remain available using `get_review`.

A pending submission is saved before requesting a wallet signature. Refresh preserves it. A known wallet rejection clears that intent. An uncertain provider error keeps it locked to prevent accidental duplication. If the wallet submitted without returning a hash, inspect wallet activity and attach the exact hash. The application does not guess or automatically resend.

Account or chain changes invalidate the connection. Reload and reconnect before another write. A failed finalized execution is shown as a failure; missing consensus evidence retains the pending record for inspection.

## Verification scope

Python tests cover contract rules with mocked retrieval and model responses. JavaScript tests cover receipt validation, calldata encoding, request binding and canonical hashes. The deployment evidence separately records the finalized Studio deployment, seal and assessment. **Read finalized example** verifies the deployed source, receipt and saved state without a wallet. This example does not exercise an external wallet extension.
