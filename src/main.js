import "./style.css";
import {compareRevisions,comparisonCSV} from "./compare.js";
import deployment from "../deployment.json";
import { exampleInput, exampleNotice, exampleReview } from "./example.js";
import {
  json,
  canonical,
  sha,
  addressOK,
  doiOK,
  actionNames,
  statusOf,
  executionOK,
  finalSuccess,
  validateDraft,
  bindReadback,
  bindReceipt,
} from "./protocol.js";
import * as chain from "./chain.js";
let comparison = null, viewVersion = 0;
const $ = (s) => document.querySelector(s);
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const saved = (k) => {
  try {
    return JSON.parse(localStorage.getItem("errata:" + k));
  } catch {
    return null;
  }
};
const save = (k, v) => {
  if (v === null) localStorage.removeItem("errata:" + k);
  else localStorage.setItem("errata:" + k, json(v));
};
let mode = "example",
  wallet = null,
  verified = "",
  loaded = null,
  receipt = null,
  busy = false;
let draft = structuredClone(exampleInput);
let pending = saved("pending");
let contract = saved("contract") || deployment.contract_address || "";
let owner = saved("owner") || "";
let dossierId = saved("id") || "citation-notebook";
let notice = exampleNotice;
function msg(text, kind = "") {
  $("#message").innerHTML = text
    ? `<div role="status" class="notice ${kind}">${esc(text)}</div>`
    : "";
  if ($("#settings-message"))
    $("#settings-message").innerHTML = $("#message").innerHTML;
}
async function task(fn) {
  if (busy) return;
  busy = true;
  buttons();
  try {
    await fn();
  } catch (e) {
    msg(e.shortMessage || e.message || String(e), "error");
  } finally {
    busy = false;
    buttons();
  }
}
function snapshot() {
  draft = {
    doi: $("#doi").value.trim().toLowerCase(),
    title: $("#title").value.trim(),
    claims: [...document.querySelectorAll(".claim")].map((el, i) => ({
      id: "C" + (i + 1),
      text: el.querySelector("textarea").value.trim(),
      locator: el.querySelector("input").value.trim(),
    })),
  };
  dossierId = $("#dossier-id").value.trim();
  notice = $("#notice-doi").value.trim().toLowerCase();
  if (mode === "live") {
    save("draft", draft);
    save("id", dossierId);
    save("notice", notice);
  }
}
function draw() {
  viewVersion++;
  comparison = null;
  $("#app").innerHTML =
    `<div class="shell"><header><div class="brand"><img src="./mark.svg" alt="ErrataScope mark">ErrataScope<small>THE CITATION REVIEW DESK</small></div><nav><a href="#workspace">Review desk</a><a href="#method">The method</a><button id="network"><span class="dot"></span>Studionet settings</button></nav></header><main><section class="hero"><div><div class="eyebrow">Research changes. Context matters.</div><h1>A correction.<br>Not every claim<br><em>changes with it.</em></h1><p class="intro">Follow a publisher’s correction to the exact claims you cite. Keep the context, inspect the evidence, and leave a shared record on GenLayer.</p><div class="hero-actions"><button class="red" id="start">Open the review desk ↗</button><button id="recorded" ${deployment.verified_records.length ? "" : "disabled"}>Read finalized example</button><button id="walkthrough">Explore a worked example</button></div><div class="hero-note">PLOS ONE notices · Up to 4 citation uses · No paid API key</div></div><div class="diagram" aria-label="A correction linked to two citation uses"><div class="paper"><div class="mini">RESEARCH NOTE / 001</div><h3>The paper changed.<br>What about your citation?</h3><div class="paper-line"></div><div class="paper-line short"></div><p style="font:italic 16px Georgia;color:#9c4738;border-bottom:1px solid #bb7865;padding:8px 0">Correction: author affiliation</p><div class="paper-line"></div><div class="paper-line short"></div><div style="font-size:10px;letter-spacing:1px;margin-top:28px">C1 · STUDY SCOPE &nbsp;&nbsp; → &nbsp; RETAIN<br><br>C2 · AFFILIATION &nbsp;&nbsp;&nbsp; → &nbsp; REVISE</div></div><div class="stamp">Same notice. <span>Different impact.</span></div></div></section><div class="stats"><div><b>One paper</b>A fixed record of how you cite it</div><div><b>Every claim</b>Its own evidence and next step</div><div><b>A shared record</b>Independently reviewed on GenLayer</div></div><section id="workspace"><div class="section-head"><div class="eyebrow">01 / The review desk<h2>Keep the claim in view.</h2></div><span class="pill" id="mode-label">WORKED EXAMPLE</span></div><div class="tabs"><button id="example-tab" class="${mode === "example" ? "active" : ""}">Worked example</button><button id="live-tab" class="${mode === "live" ? "active" : ""}">Your citation dossier</button><button id="read-tab">Read a chain record</button></div><div id="message"></div><div class="workspace"><div class="card"><div class="cardhead"><h3>The citation dossier</h3><span class="step">01 / SEAL THE CONTEXT</span></div><p class="small">Write what you intend to cite, including the figure, table, method or author detail you depend on. Sealing preserves this exact version.</p><label class="field"><span>Dossier ID</span><input id="dossier-id" maxlength="48" pattern="[a-zA-Z0-9_-]{3,48}" value="${esc(dossierId)}"></label><label class="field"><span>Original paper DOI · PLOS ONE</span><input id="doi" value="${esc(draft.doi)}" maxlength="31"></label><label class="field"><span>Paper title</span><textarea id="title" maxlength="200">${esc(draft.title)}</textarea></label><div id="claims"></div><button id="add">+ Add a citation use</button><div class="buttons"><button class="primary" id="seal">Seal dossier on GenLayer</button></div><p class="small" id="seal-hint">${mode === "example" ? "The worked example is authored locally. Switch to your dossier to sign a transaction." : "Connect your wallet and verify the contract in Studionet settings."}</p></div><div class="side"><div class="card"><div class="cardhead"><h3>The publisher notice</h3><span class="step">02 / TRACE THE IMPACT</span></div><label class="field"><span>Correction or retraction DOI · PLOS ONE</span><input id="notice-doi" value="${esc(notice)}" maxlength="31"></label><p class="small">GenLayer reads the publisher’s page and verifies its relationship to your original paper. Each validator independently checks the claim matrix.</p><div class="buttons"><button class="red" id="assess">Assess this notice</button><button id="reload">Reload chain state</button></div></div><div id="pending"></div><div id="results"></div></div></div><div id="comparison-workspace"></div></section><section class="method" id="method"><div class="eyebrow">02 / The method</div><h2>Less guesswork. More context.</h2><div class="method-grid"><div><b>01 &nbsp; Fix the citation use</b><p>A correction can affect an author detail without changing a study’s subject. Separate your uses before evaluating the notice. Sealed claims cannot be silently edited.</p></div><div><b>02 &nbsp; Check the primary source</b><p>Leader and validators read the publisher notice. They independently assess the same claims, agree on the effects, and audit the supporting quotations.</p></div><div><b>03 &nbsp; Preserve the trail</b><p>Each notice adds a revision. Earlier concerns remain visible even when a later notice affects a different detail. Export source snapshots and hashes to review the decision later.</p></div></div><details><summary>What does an assessment establish?</summary><p>It describes how one notice affects your declared citation use. Cumulative actions preserve the most cautious action across reviewed notices and do not automatically resolve earlier issues. “No change from this notice” is limited to that notice: it is not a truth score, an all-clear for the paper, or proof that no other notices exist. Claims and locators are supplied by the user. ErrataScope does not reproduce experiments or verify that a claim was originally supported. First release supports PLOS ONE only; paywalled, image-only or ambiguous notices can fail or require human review.</p></details></section></main><footer><span>ErrataScope &nbsp; / &nbsp; Read the correction. Keep the context.</span><span>Built on GenLayer · Stable Studionet 61999 · v0.2</span></footer></div><dialog id="settings"><div class="cardhead"><h3>Studionet connection</h3><button id="close">Close</button></div><div id="settings-message"></div><p class="small">Verify this release’s full deployed source before signing. Reads require no wallet.</p><label class="field"><span>Contract address</span><input id="address" placeholder="0x…" value="${esc(contract)}"></label><div class="buttons"><button id="verify">Verify contract source</button><button id="connect">Connect wallet</button></div><p class="connection" id="connection">${verified ? "Source verified · " : ""}${wallet ? esc(wallet.owner) : "Wallet not connected"}</p><div class="hash" id="source-hash"></div><label class="field"><span>Record owner address · public read</span><input id="owner" value="${esc(owner)}" placeholder="0x…"></label><label class="field"><span>Dossier ID for public read</span><input id="record-id" value="${esc(dossierId)}" maxlength="48"></label><div class="buttons"><button id="read-record">Read dossier</button></div><details><summary>Deploy this contract from your wallet</summary><p>For an unpublished installation, deploy the bundled source once. This requests a wallet signature on Stable Studionet. Wait for finality before setting the contract address. Deployment is not a claim assessment.</p><button id="deploy">Deploy bundled contract</button></details><details><summary>Transaction evidence</summary><pre id="raw-receipt">${receipt ? esc(json(receipt)) : "No receipt loaded."}</pre></details></dialog>`;
  renderClaims();
  bind();
  renderResults();
  renderComparison();
  renderPending();
  buttons();
}
function renderClaims() {
  $("#claims").innerHTML = draft.claims
    .map(
      (x, i) =>
        `<div class="claim"><div class="claim-index">C${i + 1} / CITATION USE</div>${i ? '<button class="remove" data-remove="' + i + '">Remove</button>' : ""}<label class="field"><span>What will you cite?</span><textarea maxlength="500">${esc(x.text)}</textarea></label><label class="field"><span>Source location / dependency</span><input maxlength="120" value="${esc(x.locator)}"></label></div>`,
    )
    .join("");
  document.querySelectorAll("[data-remove]").forEach(
    (el) =>
      (el.onclick = () => {
        snapshot();
        draft.claims.splice(Number(el.dataset.remove), 1);
        draw();
      }),
  );
}
function bind() {
  $("#recorded").onclick = () =>
    task(async () => {
      const record = deployment.verified_records[0];
      if (!record)
        throw Error("No finalized example is recorded in this release yet.");
      const address = deployment.contract_address;
      await chain.verify(address);
      const tx = await chain.transaction(record.transaction);
      if (!finalSuccess(tx, true))
        throw Error(
          "The example receipt does not establish finalized successful consensus.",
        );
      const state = await chain.read(
        address,
        record.owner,
        record.id,
        record.revision,
      );
      bindReadback(
        {
          type: "assess",
          owner: record.owner,
          id: record.id,
          input_sha256: record.input_sha256,
          notice: record.notice_doi,
          revision: record.revision - 1,
        },
        state.dossier,
        state.review,
      );
      bindReceipt(
        {
          type: "assess",
          owner: record.owner,
          address,
          args: [record.id, record.notice_doi, record.revision - 1],
        },
        tx,
        chain.receiptCall(tx),
      );
      if ((await sha(state.review.source)) !== state.review.source_sha256)
        throw Error("Source snapshot digest mismatch.");
      loaded = state;
      receipt = tx;
      contract = address;
      owner = record.owner;
      dossierId = record.id;
      draft = structuredClone(state.dossier.input);
      mode = "live";
      verified = address.toLowerCase();
      draw();
      msg(
        "Finalized example verified against its receipt, deployed source and saved dossier.",
        "good",
      );
      $("#workspace").scrollIntoView({ behavior: "smooth" });
    });
  $("#network").onclick = () => $("#settings").showModal();
  $("#close").onclick = () => $("#settings").close();
  $("#start").onclick = () =>
    $("#workspace").scrollIntoView({ behavior: "smooth" });
  $("#walkthrough").onclick = () => {
    snapshot();
    mode = "example";
    draft = structuredClone(exampleInput);
    notice = exampleNotice;
    draw();
    $("#workspace").scrollIntoView({ behavior: "smooth" });
  };
  $("#example-tab").onclick = () => {
    snapshot();
    mode = "example";
    draft = structuredClone(exampleInput);
    notice = exampleNotice;
    draw();
  };
  $("#live-tab").onclick = () => {
    if (mode === "live") snapshot();
    mode = "live";
    draft = saved("draft") || structuredClone(exampleInput);
    dossierId = saved("id") || "citation-notebook";
    notice = saved("notice") || exampleNotice;
    draw();
  };
  $("#read-tab").onclick = () => {
    $("#settings").showModal();
    $("#owner").focus();
  };
  $("#add").onclick = () => {
    snapshot();
    if (draft.claims.length < 4) {
      draft.claims.push({
        id: "C" + (draft.claims.length + 1),
        text: "",
        locator: "",
      });
      draw();
    }
  };
  $("#verify").onclick = () =>
    task(async () => {
      const nextAddress = $("#address").value.trim();
      if (nextAddress !== contract) loaded = null;
      contract = nextAddress;
      verified = "";
      const hash = await chain.verify(contract);
      verified = contract.toLowerCase();
      save("contract", contract);
      $("#source-hash").textContent = hash;
      $("#connection").textContent =
        "Source verified" + (wallet ? " · " + wallet.owner : "");
      msg("The complete deployed source matches this release.", "good");
    });
  $("#connect").onclick = () =>
    task(async () => {
      wallet = await chain.connect();
      owner = wallet.owner;
      save("owner", owner);
      $("#owner").value = owner;
      $("#connection").textContent =
        (verified ? "Source verified · " : "") + owner;
      for (const event of ["accountsChanged", "chainChanged"])
        wallet.provider.on?.(event, () => {
          wallet = null;
          verified = "";
          loaded = null;
          draw();
          msg("Wallet changed. Reconnect and reload before signing.");
        });
    });
  $("#read-record").onclick = () =>
    task(async () => {
      snapshot();
      const next = $("#address").value.trim();
      if (next !== contract) {
        contract = next;
        verified = "";
      }
      save("contract", contract);
      owner = $("#owner").value.trim().toLowerCase();
      save("owner", owner);
      dossierId = $("#record-id").value.trim();
      save("id", dossierId);
      receipt = null;
      loaded = await chain.read(contract, owner, dossierId);
      draft = structuredClone(loaded.dossier.input);
      mode = "live";
      draw();
      msg("Dossier loaded from GenLayer.", "good");
    });
  $("#reload").onclick = () =>
    task(async () => {
      snapshot();
      receipt = null;
      loaded = await chain.read(contract, owner, dossierId);
      draft = structuredClone(loaded.dossier.input);
      draw();
      msg("Chain record refreshed.", "good");
    });
  $("#seal").onclick = () =>
    task(async () => {
      snapshot();
      validateDraft(draft);
      if (!/^[a-zA-Z0-9_-]{3,48}$/.test(dossierId))
        throw Error("Use a 3–48 character dossier ID");
      await send("seal", [dossierId, canonical(draft)]);
    });
  $("#assess").onclick = () =>
    task(async () => {
      snapshot();
      if (!doiOK(notice)) throw Error("Enter a PLOS ONE notice DOI");
      if (
        !loaded ||
        loaded.dossier.owner !== wallet?.owner ||
        loaded.dossier.id !== dossierId
      )
        throw Error("Load your sealed dossier before assessing");
      if (canonical(draft) !== canonical(loaded.dossier.input))
        throw Error(
          "The form differs from your sealed dossier. Reload it, or seal a new dossier ID.",
        );
      await send("assess", [dossierId, notice, loaded.revision]);
    });
  $("#deploy").onclick = () =>
    task(async () => {
      await chain.checkWallet(wallet);
      if (pending) throw Error("Resolve the pending transaction first");
      pending = {
        type: "deploy",
        owner: wallet.owner,
        address: "",
        id: "",
        created: new Date().toISOString(),
      };
      save("pending", pending);
      try {
        const hash = await wallet.client.deployContract({
          code: chain.source,
          args: [],
          leaderOnly: false,
        });
        pending.hash = hash;
        save("pending", pending);
        $("#settings").close();
        renderPending();
        msg("Deployment submitted. Recheck finality; do not deploy again.");
      } catch (e) {
        if (e.code === 4001 || e.cause?.code === 4001) {
          pending = null;
          save("pending", null);
        } else {
          pending.uncertain = true;
          save("pending", pending);
        }
        renderPending();
        throw e;
      }
    });
}
async function send(type, args) {
  if (mode !== "live") throw Error("Switch to your citation dossier");
  if (pending) throw Error("Resolve the pending transaction first");
  await chain.checkWallet(wallet);
  if (verified !== contract.toLowerCase())
    throw Error("Verify the deployed source first");
  await chain.verify(contract);
  await chain.checkWallet(wallet);
  pending = {
    type,
    args,
    address: contract,
    owner: wallet.owner,
    id: dossierId,
    input_sha256: await sha(canonical(draft)),
    notice,
    revision: loaded?.revision || 0,
    created: new Date().toISOString(),
  };
  save("pending", pending);
  try {
    pending.hash = await wallet.client.writeContract({
      address: contract,
      functionName: type,
      args,
      value: 0n,
      leaderOnly: false,
    });
    save("pending", pending);
    renderPending();
    msg("Transaction submitted. Recheck to read its final result.", "good");
  } catch (e) {
    if (e.code === 4001 || e.cause?.code === 4001) {
      pending = null;
      save("pending", null);
    } else {
      pending.uncertain = true;
      save("pending", pending);
    }
    renderPending();
    throw e;
  }
}
function buttons() {
  if ($("#compare-revisions")) $("#compare-revisions").disabled = busy;
  document
    .querySelectorAll(
      "#dossier-id,#doi,#title,#notice-doi,#claims input,#claims textarea",
    )
    .forEach((el) => (el.readOnly = mode === "example"));
  document
    .querySelectorAll("[data-remove]")
    .forEach((el) => (el.disabled = mode === "example" || busy));
  for (const id of ["seal", "assess"])
    if ($("#" + id))
      $("#" + id).disabled =
        busy ||
        !!pending ||
        mode !== "live" ||
        !wallet ||
        verified !== contract.toLowerCase();
  if ($("#add"))
    $("#add").disabled = draft.claims.length >= 4 || busy || mode === "example";
}
function renderPending() {
  if (!pending) {
    $("#pending").innerHTML = "";
    return;
  }
  $("#pending").innerHTML =
    `<div class="notice"><strong>${pending.type === "deploy" ? "Deployment" : "Transaction"} awaiting verification</strong><span class="hash">${esc(pending.hash || "No transaction hash returned. Inspect wallet activity before another write.")}</span><div class="buttons"><button id="recheck" ${pending.hash ? "" : "disabled"}>Recheck · read only</button>${pending.hash ? `<a target="_blank" rel="noopener noreferrer" href="${chain.explorer}/tx/${esc(pending.hash)}">Explorer ↗</a>` : '<button id="attach-hash">Attach wallet transaction hash</button>'}</div></div>`;
  $("#recheck").onclick = () => task(recheck);
  if ($("#attach-hash"))
    $("#attach-hash").onclick = () => {
      const hash = prompt(
        "Paste the exact transaction hash from your wallet activity. No transaction will be sent.",
      );
      if (/^0x[0-9a-fA-F]{64}$/.test(hash || "")) {
        pending.hash = hash;
        save("pending", pending);
        renderPending();
      } else msg("A 32-byte transaction hash is required.", "error");
    };
  buttons();
}
async function recheck() {
  const p = { ...pending };
  receipt = await chain.transaction(p.hash);
  if (!receipt)
    throw Error("Transaction not yet available; keep the pending record");
  const status = statusOf(receipt);
  if (status !== "FINALIZED") {
    if (
      [
        "CANCELED",
        "UNDETERMINED",
        "LEADER_TIMEOUT",
        "VALIDATORS_TIMEOUT",
      ].includes(status)
    ) {
      pending = null;
      save("pending", null);
      renderPending();
      throw Error(
        "Transaction ended as " +
          status +
          ". Inspect its receipt before signing again.",
      );
    }
    throw Error(
      "Current transaction status: " +
        status +
        ". Recheck later; no transaction resent.",
    );
  }
  const sender = String(
    receipt.from_address || receipt.from || "",
  ).toLowerCase();
  if (sender !== p.owner.toLowerCase())
    throw Error("Receipt sender differs from the signed intent");
  if (!executionOK(receipt)) {
    pending = null;
    save("pending", null);
    renderPending();
    throw Error(
      "Transaction finalized with unsuccessful execution. Inspect the receipt; no result was accepted.",
    );
  }
  if (p.type === "deploy") {
    const addr = receipt.contract_address || receipt.data?.contract_address;
    if (!addressOK(addr))
      throw Error("Finalized deployment address missing. Inspect receipt.");
    await chain.verify(addr);
    contract = addr;
    verified = addr.toLowerCase();
    save("contract", addr);
    pending = null;
    save("pending", null);
    draw();
    msg(
      "Deployment finalized and source verified. Seal your first dossier.",
      "good",
    );
    return;
  }
  const target = String(receipt.to_address || receipt.to || "").toLowerCase();
  if (target !== p.address.toLowerCase())
    throw Error("Receipt destination differs from the signed intent");
  bindReceipt(p, receipt, chain.receiptCall(receipt));
  if (!finalSuccess(receipt, p.type === "assess"))
    throw Error(
      "Finalized receipt lacks independently verifiable majority agreement. Pending record retained. Inspect the receipt.",
    );
  const state = await chain.read(
    p.address,
    p.owner,
    p.id,
    p.type === "assess" ? p.revision + 1 : undefined,
  );
  bindReadback(p, state.dossier, state.review);
  loaded = state;
  contract = p.address;
  owner = p.owner;
  dossierId = p.id;
  draft = structuredClone(state.dossier.input);
  mode = "live";
  pending = null;
  save("pending", null);
  draw();
  msg(
    "Finalized execution verified and the signed record read back from GenLayer.",
    "good",
  );
}
function renderResults() {
  let r = mode === "example" ? exampleReview : loaded?.review;
  let d = mode === "example" ? exampleInput : loaded?.dossier?.input;
  $("#mode-label").textContent =
    mode === "example"
      ? "AUTHORED WALKTHROUGH"
      : loaded
        ? "CHAIN READBACK"
        : "YOUR DRAFT";
  $("#results").innerHTML =
    `<div class="card"><div class="cardhead"><h3>Claim-by-claim impact</h3><span class="step">03 / KEEP THE TRAIL</span></div>${mode === "example" ? '<div class="notice"><strong>Worked example · not a chain result</strong>Authored interpretation of a real PLOS ONE affiliation correction. No model call or transaction is made here.</div>' : ""}${r ? `<p class="small">${esc(r.assessment.kind)} · Revision ${r.revision} · <a target="_blank" rel="noopener noreferrer" href="https://journals.plos.org/plosone/article?id=${encodeURIComponent(r.notice_doi)}">Publisher notice ↗</a></p>${r.assessment.findings.map((f, i) => `<article class="finding"><div class="finding-header"><span class="claim-index">${esc(f.id)}</span><span class="result-label ${f.effect === "UNCHANGED_SCOPE" ? "ok" : ""}">${esc(actionNames[r.actions[i].action])}</span></div><p>${esc(d.claims[i].text)}</p><blockquote>${esc(f.quote)}</blockquote><p class="small">${esc(f.reason)}</p>${r.cumulative_actions ? '<p class="small"><strong>Across reviewed notices:</strong> ' + esc(actionNames[r.cumulative_actions[i].action]) + "</p>" : ""}</article>`).join("")}<div class="buttons"><button id="export">Export ${mode === "example" ? "example" : "chain record"} JSON ↓</button></div>${r.source_sha256 ? '<p class="hash">Source SHA256 ' + esc(r.source_sha256) + "</p>" : ""}<div class="history" id="history"></div>` : '<div class="empty"><svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true"><path d="M12 6h22l7 7v33H12zM19 23h15M19 30h15M19 37h9" stroke="#9ba58b" stroke-width="1.5"/></svg><p>No notice assessed yet.</p><p class="small">Seal a dossier, then assess a publisher notice.<br>Existing records can be read without a wallet.</p></div>'}${mode === "live" && loaded && !r ? '<p class="small">Dossier is sealed. Ready for its first notice.</p>' : ""}</div>`;
  if ($("#export"))
    $("#export").onclick = () => {
      const obj = {
        provenance: mode === "example" ? "AUTHORED_EXAMPLE" : "CHAIN_READBACK",
        exported_at: new Date().toISOString(),
        network: {
          chain_id: 61999,
          contract: mode === "live" ? contract : null,
        },
        dossier: mode === "example" ? { input: exampleInput } : loaded.dossier,
        review: r,
        receipt: mode === "live" ? receipt : null,
      };
      const url = URL.createObjectURL(
        new Blob([json(obj)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "erratascope-" +
        (mode === "example" ? "example" : dossierId) +
        "-r" +
        r.revision +
        ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  if (mode === "live" && loaded?.revision && $("#history")) {
    const n = loaded.revision;
    $("#history").innerHTML =
      '<p class="small">Recent revisions · every earlier revision remains readable through get_review.</p>' +
      Array.from({ length: Math.min(n, 10) }, (_, i) => n - i)
        .map((i) => `<button data-revision="${i}">R${i}</button>`)
        .join("");
    document.querySelectorAll("[data-revision]").forEach(
      (el) =>
        (el.onclick = () =>
          task(async () => {
            receipt = null;
            loaded = await chain.read(
              contract,
              owner,
              dossierId,
              Number(el.dataset.revision),
            );
            renderResults();
          })),
    );
  }
}
function downloadComparison(content,type,extension){
 const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download='erratascope-revisions-'+comparison.from+'-'+comparison.to+'.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderComparison(){
 const host=$('#comparison-workspace');if(!host)return;
 const available=mode==='live'&&loaded?.revision>0;
 const current=loaded?.revision||0;
 host.innerHTML=`<section class="card revision-desk" aria-label="Revision comparison workspace"><div class="cardhead"><h3>What changed between reviews?</h3><span class="step">04 / COMPARE REVISIONS</span></div><p class="small">Compare sealed input (baseline 0) or any earlier revision with a later revision. Notice-specific actions and cumulative warnings stay separate. Non-adjacent comparisons show endpoint differences.</p>${available?`<div class="revision-fields"><label class="field"><span>Earlier revision (0 = sealed baseline)</span><input id="compare-from" type="number" min="0" max="${current-1}" value="${comparison?.from??Math.max(0,current-1)}" step="1"></label><label class="field"><span>Later revision</span><input id="compare-to" type="number" min="1" max="${current}" value="${comparison?.to??current}" step="1"></label></div><button id="compare-revisions" class="primary">Compare finalized revisions</button><p class="small">Reads only. Dossier identity, input digest, source digests and claim IDs are checked before displaying a comparison.</p><div id="comparison-status" role="status"></div>`:'<p class="notice">Load a finalized dossier with at least one assessed notice to compare revisions. Use “Read finalized example” for a wallet-free baseline-to-R1 comparison.</p>'}${comparison?comparisonHTML(comparison):''}</section>`;
 if(available)$('#compare-revisions').onclick=()=>task(async()=>{
  const from=Number($('#compare-from').value),to=Number($('#compare-to').value);
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>current||from>=to)throw Error('Choose an earlier revision from 0 and a later revision up to '+current+'.');
  const version=viewVersion;
  const address=contract,recordOwner=loaded.dossier.owner,id=loaded.dossier.id,expected=loaded.dossier.input_sha256;
  comparison=null;host.querySelector('.comparison-output')?.remove();$('#comparison-status').textContent='Reading finalized revisions and verifying source snapshots…';
  try{
   await chain.verify(address);
   const [left,right]=await Promise.all([chain.read(address,recordOwner,id,from),chain.read(address,recordOwner,id,to)]);
   if(canonical(left.dossier)!==canonical(right.dossier)||right.dossier.input_sha256!==expected||right.dossier.owner!==recordOwner||right.dossier.id!==id)throw Error('Dossier identity changed during comparison');
   const result=await compareRevisions(right.dossier,left.review,right.review,{from,to,contract:address});
   if(version!==viewVersion)throw Error('The displayed dossier changed. Compare the current record again.');
   comparison=result;
   renderComparison();msg('Revision comparison verified against finalized state and source digests. No transaction sent.','good');
  }catch(error){renderComparison();$('#comparison-status').textContent=error.message;throw error;}
 });
 if(comparison){$('#comparison-json').onclick=()=>downloadComparison(json(comparison),'application/json','json');$('#comparison-csv').onclick=()=>downloadComparison(comparisonCSV(comparison),'text/csv','csv');}
}
function comparisonHTML(r){
 const name=a=>a==='NOT_ASSESSED'?'Not assessed (sealed baseline)':actionNames[a];
 return `<div class="comparison-output"><p class="notice"><strong>Baseline / R${r.from} → R${r.to}</strong>${r.summary.action_changes} notice-action changes · ${r.summary.cumulative_changes} cumulative-action changes · ${r.summary.evidence_changes} evidence changes</p><p class="small">Earlier notice: ${esc(r.before?.notice_doi||'None — sealed input only')}<br>Later notice: ${esc(r.after.notice_doi)}</p>${r.rows.map(row=>`<article class="revision-claim"><h4>${esc(row.id)} · ${row.action_changed?'Action changed':'Action unchanged'}</h4><p>${esc(row.text)}</p><p class="small">Source location: ${esc(row.locator)}</p><div class="revision-columns"><div><b>Earlier · ${r.from===0?'sealed baseline':'R'+r.from}</b><p>${esc(name(row.before_action))}</p><p class="small">Cumulative: ${esc(name(row.before_cumulative))}</p><blockquote>${esc(row.before_finding?.quote||'No assessment at sealed baseline.')}</blockquote><p class="small">${esc(row.before_finding?.reason||'')}</p></div><div><b>Later · R${r.to}</b><p>${esc(name(row.after_action))}</p><p class="small">Cumulative: ${esc(name(row.after_cumulative))}</p><blockquote>${esc(row.after_finding.quote||'No supporting quotation.')}</blockquote><p class="small">${esc(row.after_finding.reason)}</p></div></div>${row.retained_warning?'<p class="notice">Earlier warning retained: this notice does not change the claim, but the cumulative action still requires attention.</p>':''}<p class="small">Evidence ${row.evidence_changed?'changed':'unchanged'} · Cumulative action ${row.cumulative_changed?'changed':'unchanged'}</p></article>`).join('')}<div class="buttons"><button id="comparison-json">Export revision comparison JSON</button><button id="comparison-csv">Export revision comparison CSV</button></div><details><summary>Verification digests and limits</summary><p class="hash">Input: ${esc(r.dossier.input_sha256)}<br>Earlier source: ${esc(r.before?.source_sha256||'No source at baseline')}<br>Later source: ${esc(r.after.source_sha256)}</p><p class="small">${esc(r.limits)}</p></details></div>`;
}
draw();
