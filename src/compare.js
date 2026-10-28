import {canonical,sha,actionNames,validateDraft,doiOK} from './protocol.js';
const validAction=a=>Object.hasOwn(actionNames,a);
export async function validateRevision(dossier,review,revision){
 if(!Number.isInteger(revision)||revision<0)throw Error('Invalid revision number');
 validateDraft(dossier.input);
 if(dossier.protocol!=='erratascope-1'||await sha(canonical(dossier.input))!==dossier.input_sha256)throw Error('Sealed dossier digest mismatch');
 if(revision===0){if(review!==null)throw Error('Baseline cannot contain a review');return;}
 if(!review||review.protocol!==dossier.protocol||review.owner!==dossier.owner||review.id!==dossier.id||review.input_sha256!==dossier.input_sha256||review.revision!==revision)throw Error('Revision does not belong to this sealed dossier');
 if(!doiOK(review.notice_doi)||typeof review.source!=='string'||await sha(review.source)!==review.source_sha256)throw Error('Revision source snapshot digest mismatch');
 const claims=dossier.input.claims;
 for(const key of ['actions','cumulative_actions']){
  if(!Array.isArray(review[key])||review[key].length!==claims.length||review[key].some((a,i)=>a.id!==claims[i].id||!validAction(a.action)))throw Error('Incomplete revision action matrix');
 }
 const findings=review.assessment?.findings;
 if(!Array.isArray(findings)||findings.length!==claims.length||findings.some((f,i)=>f.id!==claims[i].id||typeof f.quote!=='string'||typeof f.reason!=='string'||(f.quote&&!review.source.includes(f.quote))))throw Error('Invalid revision findings or source quotations');
}
export async function compareRevisions(dossier,before,after,context){
 const {from,to,contract}=context;
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=to)throw Error('Choose an earlier revision and a later revision');
 await validateRevision(dossier,before,from);await validateRevision(dossier,after,to);
 const rows=dossier.input.claims.map((claim,i)=>{
  const oldAction=before?.actions[i].action??'NOT_ASSESSED';
  const oldCumulative=before?.cumulative_actions[i].action??'NOT_ASSESSED';
  const next=after.actions[i].action,cumulative=after.cumulative_actions[i].action;
  const oldFinding=before?.assessment.findings[i]??null,newFinding=after.assessment.findings[i];
  return {id:claim.id,text:claim.text,locator:claim.locator,before_action:oldAction,after_action:next,before_cumulative:oldCumulative,after_cumulative:cumulative,action_changed:oldAction!==next,cumulative_changed:oldCumulative!==cumulative,evidence_changed:canonical(oldFinding)!==canonical(newFinding),before_finding:oldFinding,after_finding:newFinding,retained_warning:next==='NO_CHANGE_FROM_NOTICE'&&cumulative!=='NO_CHANGE_FROM_NOTICE'};
 });
 return {schema:'erratascope-revision-comparison-1',provenance:'CHAIN_READBACK',exported_at:new Date().toISOString(),network:{chain_id:61999,contract},from,to,dossier,before,after,rows,summary:{action_changes:rows.filter(r=>r.action_changed).length,cumulative_changes:rows.filter(r=>r.cumulative_changed).length,evidence_changes:rows.filter(r=>r.evidence_changed).length,retained_warnings:rows.filter(r=>r.retained_warning).length},limits:'Comparison of two finalized state snapshots, not a new validator assessment or transaction receipt. Baseline 0 is sealed input with no assessment. No change from a notice does not clear earlier warnings or certify the paper. Non-adjacent revisions show endpoint differences only.'};
}
export function comparisonCSV(report){
 // Prevent spreadsheet formula interpretation of user-authored claim text.
 const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 return [['Claim','Citation use','Source location','Earlier notice action','Later notice action','Earlier cumulative action','Later cumulative action','Action changed','Evidence changed','Earlier quotation','Later quotation'],...report.rows.map(r=>[r.id,r.text,r.locator,r.before_action,r.after_action,r.before_cumulative,r.after_cumulative,r.action_changed,r.evidence_changed,r.before_finding?.quote??'',r.after_finding.quote])].map(r=>r.map(cell).join(',')).join('\r\n');
}
