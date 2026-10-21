export const json = (x) =>
  JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
export const addressOK = (x) => /^0x[0-9a-fA-F]{40}$/.test(x);
export const doiOK = (x) => /^10\.1371\/journal\.pone\.[0-9]{7}$/.test(x);
export const actionNames = {
  NO_CHANGE_FROM_NOTICE: "No change from this notice",
  REWRITE: "Rewrite this citation",
  STOP_CITING: "Stop citing this claim",
  REVIEW: "Needs human review",
};
export const sha = async (text) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
export function canonical(x) {
  if (Array.isArray(x)) return "[" + x.map(canonical).join(",") + "]";
  if (x && typeof x === "object")
    return (
      "{" +
      Object.keys(x)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(x[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(x);
}
export function statusOf(tx) {
  return String(
    tx.status_name ||
      tx.statusName ||
      { 7: "FINALIZED" }[tx.status] ||
      tx.status ||
      "UNKNOWN",
  ).toUpperCase();
}
export function executionOK(tx) {
  const leaders = tx.consensus_data?.leader_receipt;
  const rows = Array.isArray(leaders) ? leaders : leaders ? [leaders] : [];
  return (
    rows.length > 0 &&
    rows.every(
      (x) =>
        String(x.execution_result).toUpperCase() === "SUCCESS" &&
        !x.error &&
        (!x.result ||
          (typeof x.result === "string" && atob(x.result).charCodeAt(0) === 0)),
    )
  );
}
export function agreementOK(tx) {
  const votes = tx.consensus_data?.votes;
  if (votes && typeof votes === "object" && Object.keys(votes).length) {
    const values = Object.values(votes);
    return (
      values.filter((x) => String(x).toUpperCase() === "AGREE").length >
      values.length / 2
    );
  }
  const rows = tx.consensus_data?.validators;
  const receipts = Array.isArray(rows)
    ? rows
    : rows && typeof rows === "object"
      ? Object.values(rows)
      : [];
  if (!receipts.length) return false;
  return (
    receipts.filter((x) => String(x.vote).toUpperCase() === "AGREE").length >
    receipts.length / 2
  );
}
export function finalSuccess(tx, requiresConsensus = true) {
  return (
    statusOf(tx) === "FINALIZED" &&
    executionOK(tx) &&
    (!requiresConsensus || agreementOK(tx))
  );
}
export function bindReadback(pending, dossier, review) {
  if (
    !dossier ||
    dossier.owner?.toLowerCase() !== pending.owner.toLowerCase() ||
    dossier.id !== pending.id ||
    dossier.input_sha256 !== pending.input_sha256
  )
    throw Error("Readback does not match signed dossier");
  if (
    pending.type === "assess" &&
    (!review ||
      review.notice_doi !== pending.notice ||
      review.revision !== pending.revision + 1 ||
      review.input_sha256 !== dossier.input_sha256 ||
      review.owner !== dossier.owner ||
      review.id !== dossier.id)
  )
    throw Error("Readback does not match the signed notice and revision");
  return true;
}
export function validateDraft(data) {
  if (
    !doiOK(data.doi) ||
    data.title.trim().length < 3 ||
    data.title.length > 200
  )
    throw Error("Enter a PLOS ONE DOI and paper title");
  if (data.claims.length < 1 || data.claims.length > 4)
    throw Error("Use one to four claims");
  data.claims.forEach((x, i) => {
    if (
      x.id !== `C${i + 1}` ||
      x.text.trim().length < 8 ||
      x.text.length > 500 ||
      x.locator.trim().length < 2 ||
      x.locator.length > 120
    )
      throw Error("Each claim needs its text and a source location");
  });
  return data;
}

export function bindReceipt(p, tx, call) {
  if (
    String(tx.from_address || tx.from || "").toLowerCase() !==
    p.owner.toLowerCase()
  )
    throw Error("Receipt sender differs from signed intent");
  if (
    String(tx.to_address || tx.to || "").toLowerCase() !==
    p.address.toLowerCase()
  )
    throw Error("Receipt destination differs from signed intent");
  if (call.method !== p.type || json(call.args) !== json(p.args))
    throw Error("Receipt method or arguments differ from signed intent");
  return true;
}
