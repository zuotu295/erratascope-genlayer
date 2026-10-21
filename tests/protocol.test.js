import test from "node:test";
import assert from "node:assert/strict";
import { abi } from "genlayer-js";
import {
  canonical,
  statusOf,
  executionOK,
  agreementOK,
  finalSuccess,
  bindReadback,
  bindReceipt,
  validateDraft,
  sha,
} from "../src/protocol.js";
import { exampleInput } from "../src/example.js";
const owner = "0x" + "1".repeat(40),
  address = "0x" + "2".repeat(40);
const receipt = {
  status_name: "FINALIZED",
  from_address: owner,
  to_address: address,
  consensus_data: {
    leader_receipt: [
      { execution_result: "SUCCESS", result: "AA==", error: null },
    ],
    validators: [{ vote: "AGREE" }, { vote: "AGREE" }, { vote: "DISAGREE" }],
  },
};
const intent = {
  type: "assess",
  owner,
  address,
  id: "abc",
  args: ["abc", "10.1371/journal.pone.0269047", 0],
  input_sha256: "input",
  notice: "10.1371/journal.pone.0269047",
  revision: 0,
};
const dossier = { owner, id: "abc", input_sha256: "input" };
const review = {
  owner,
  id: "abc",
  input_sha256: "input",
  notice_doi: intent.notice,
  revision: 1,
};
test("status_name FINALIZED is recognized", () =>
  assert.equal(statusOf(receipt), "FINALIZED"));
test("numeric stable SDK finality is recognized", () =>
  assert.equal(statusOf({ status: 7 }), "FINALIZED"));
test("accepted is not final success", () =>
  assert.equal(finalSuccess({ ...receipt, status_name: "ACCEPTED" }), false));
test("finalized and majority plus successful execution", () =>
  assert.equal(finalSuccess(receipt), true));
test("failed execution rejected despite finality", () =>
  assert.equal(
    executionOK({
      ...receipt,
      consensus_data: { leader_receipt: [{ execution_result: "ERROR" }] },
    }),
    false,
  ));
test("VM rollback prefix rejected despite success label", () =>
  assert.equal(
    executionOK({
      ...receipt,
      consensus_data: {
        leader_receipt: [{ execution_result: "SUCCESS", result: "AQ==" }],
      },
    }),
    false,
  ));
test("tie does not establish majority", () =>
  assert.equal(
    agreementOK({
      consensus_data: { validators: [{ vote: "AGREE" }, { vote: "DISAGREE" }] },
    }),
    false,
  ));
test("missing voting evidence fails closed", () =>
  assert.equal(agreementOK({}), false));
test("address vote map establishes majority", () =>
  assert.equal(
    agreementOK({
      consensus_data: { votes: { a: "AGREE", b: "AGREE", c: "DISAGREE" } },
    }),
    true,
  ));
test("signed readback binds all fields", () =>
  assert.equal(bindReadback(intent, dossier, review), true));
test("different owner record rejected", () =>
  assert.throws(() =>
    bindReadback(intent, { ...dossier, owner: address }, review),
  ));
test("different notice rejected", () =>
  assert.throws(() =>
    bindReadback(intent, dossier, { ...review, notice_doi: "other" }),
  ));
test("later revision cannot impersonate requested revision", () =>
  assert.throws(() =>
    bindReadback(intent, dossier, { ...review, revision: 2 }),
  ));
test("mismatched payload digest rejected", () =>
  assert.throws(() =>
    bindReadback(intent, { ...dossier, input_sha256: "other" }, review),
  ));
test("method and exact signed arguments bound to receipt", () =>
  assert.equal(
    bindReceipt(intent, receipt, { method: "assess", args: intent.args }),
    true,
  ));
test("unrelated method rejected even with matching saved state", () =>
  assert.throws(() =>
    bindReceipt(intent, receipt, { method: "seal", args: intent.args }),
  ));
test("unrelated target rejected", () =>
  assert.throws(() =>
    bindReceipt(
      intent,
      { ...receipt, to_address: owner },
      { method: "assess", args: intent.args },
    ),
  ));
test("wrong revision argument rejected", () =>
  assert.throws(() =>
    bindReceipt(intent, receipt, {
      method: "assess",
      args: [...intent.args.slice(0, 2), 1],
    }),
  ));
test("SDK calldata preserves method and args", () => {
  let value = abi.calldata.decode(
    abi.calldata.encode(abi.calldata.makeCalldataObject("assess", intent.args)),
  );
  assert.equal(value.get("method"), "assess");
  assert.equal(value.get("args")[2], 0n);
});
test("frontend and Python canonical digest vector match", async () =>
  assert.equal(
    await sha(canonical({ z: "研究", a: [1, true] })),
    "6594da02237f9b3bbcc78ab5079540054e058e9633445e7942efa4da552d3020",
  ));
test("example draft meets contract input rules", () =>
  assert.equal(validateDraft(structuredClone(exampleInput)).claims.length, 2));
test("draft with empty citation use rejected", () =>
  assert.throws(() =>
    validateDraft({
      ...exampleInput,
      claims: [{ id: "C1", text: "", locator: "x" }],
    }),
  ));
