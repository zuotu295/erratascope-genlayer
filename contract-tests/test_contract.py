"""Local protocol tests with mocked GenLayer host; not GenVM or live consensus."""
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest

class TreeMap(dict):
    @classmethod
    def __class_getitem__(cls, item):
        return cls

class Return:
    def __init__(self, calldata):
        self.calldata = calldata

class Host:
    def __init__(self):
        self.source = ''
        self.fetches = 0
        self.answers = []
        self.force_reject = False
        self.second_source = None
    def render(self, url, mode):
        self.fetches += 1
        return self.second_source if self.fetches > 1 and self.second_source else self.source
    def prompt(self, prompt, response_format):
        return self.answers.pop(0)
    def run(self, leader, validator):
        value = leader()
        if self.force_reject or not validator(Return(value)):
            raise ValueError('Consensus rejected')
        return value

host=Host()
gl=types.SimpleNamespace(Contract=object,public=types.SimpleNamespace(write=lambda f:f,view=lambda f:f),message=types.SimpleNamespace(sender_address='0x'+'1'*40),nondet=types.SimpleNamespace(web=types.SimpleNamespace(render=host.render),exec_prompt=host.prompt),vm=types.SimpleNamespace(Return=Return,run_nondet_unsafe=host.run))
module=types.ModuleType('genlayer');module.gl=gl;module.TreeMap=TreeMap;module.u256=int
sys.modules['genlayer']=module
spec=importlib.util.spec_from_file_location('errata_scope',Path(__file__).parents[1]/'contracts/errata_scope.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
DOI='10.1371/journal.pone.0251194';NOTICE='10.1371/journal.pone.0269047'
QUOTE='The author affiliation has been corrected.'
SOURCE='Correction: '+NOTICE+' Reference: '+DOI+' '+QUOTE+' Publisher metadata and citation record. '*8
INPUT={'doi':DOI,'title':'A computational reproducibility study','claims':[{'id':'C1','text':'I cite the scope of this computational study.','locator':'Title'},{'id':'C2','text':'I reproduce the original author affiliation.','locator':'Affiliation 5'}]}

def result(effects=('UNCHANGED_SCOPE','CHANGED'),kind='CORRECTION'):
    return {'linked':True,'kind':kind,'findings':[{'id':'C'+str(i+1),'effect':effect,'quote':QUOTE,'reason':'The notice explicitly bounds this correction to affiliation.'} for i,effect in enumerate(effects)]}

def audit(kind='CORRECTION', supported=True):
    return {'paper_linked':True,'notice_kind':kind,'claims':[{'id':'C'+str(i+1),'effect_supported':supported,'quote_supported':True,'reason_supported':True} for i in range(2)]}

class ProtocolTests(unittest.TestCase):
    def setUp(self):
        self.contract=c.ErrataScope()
        for field in ['dossiers','reviews','revisions','seen']:setattr(self.contract,field,TreeMap())
        gl.message.sender_address='0x'+'1'*40
        host.source=SOURCE;host.fetches=0;host.answers=[];host.force_reject=False;host.second_source=None
    def seal(self):
        return json.loads(self.contract.seal('research-1',json.dumps(INPUT)))
    def assess(self,effects=('UNCHANGED_SCOPE','CHANGED'),kind='CORRECTION'):
        host.answers=[result(effects,kind),audit(kind)]
        return json.loads(self.contract.assess('research-1',NOTICE,0))
    def test_owner_and_input_hash_bound(self):
        d=self.seal();self.assertEqual(d['input_sha256'],c.digest(c.canonical(INPUT)));self.assertEqual(d['owner'],gl.message.sender_address)
    def test_sealed_dossier_cannot_be_replaced(self):
        self.seal()
        with self.assertRaisesRegex(ValueError,'already sealed'):self.seal()
    def test_owner_cannot_assess_another_owners_dossier(self):
        self.seal();gl.message.sender_address='0x'+'2'*40
        with self.assertRaisesRegex(ValueError,'Seal your dossier'):self.contract.assess('research-1',NOTICE,0)
    def test_same_id_different_owner_independent(self):
        self.seal();gl.message.sender_address='0x'+'2'*40;self.seal();self.assertEqual(len(self.contract.dossiers),2)
    def test_corrected_affiliation_leaves_other_claim_scoped(self):
        self.seal();r=self.assess();self.assertEqual([x['action'] for x in r['actions']],['NO_CHANGE_FROM_NOTICE','REWRITE']);self.assertEqual(host.fetches,2)
    def test_legacy_json_text_audit_is_supported(self):
        self.seal();host.answers=[json.dumps(result()),json.dumps(audit())]
        r=json.loads(self.contract.assess('research-1',NOTICE,0))
        self.assertEqual(r['revision'],1)
    def test_retraction_stops_all_citation_uses(self):
        self.seal();r=self.assess(('WITHDRAWN','WITHDRAWN'),'RETRACTION');self.assertTrue(all(x['action']=='STOP_CITING' for x in r['actions']))
    def test_concern_requires_review(self):
        self.seal();r=self.assess(('UNCERTAIN','UNCERTAIN'),'EXPRESSION_OF_CONCERN');self.assertTrue(all(x['action']=='REVIEW' for x in r['actions']))
    def test_concern_cannot_clear_claim(self):
        with self.assertRaisesRegex(ValueError,'Concern cannot clear'):c.parse_assessment(result(kind='EXPRESSION_OF_CONCERN'),INPUT['claims'],SOURCE)
    def test_partial_retraction_matrix_rejected(self):
        with self.assertRaisesRegex(ValueError,'Retraction must withdraw'):c.parse_assessment(result(kind='RETRACTION'),INPUT['claims'],SOURCE)
    def test_stale_revision_no_model_call(self):
        self.seal()
        with self.assertRaisesRegex(ValueError,'Revision changed'):self.contract.assess('research-1',NOTICE,1)
        self.assertEqual(host.fetches,0)
    def test_duplicate_notice_does_not_append(self):
        self.seal();self.assess()
        with self.assertRaisesRegex(ValueError,'already assessed'):self.contract.assess('research-1',NOTICE,1)
        self.assertEqual(len(self.contract.reviews),1)
    def test_disagreement_leaves_all_storage_unchanged(self):
        self.seal();host.answers=[result(),audit(supported=False)]
        with self.assertRaisesRegex(ValueError,'Consensus rejected'):self.contract.assess('research-1',NOTICE,0)
        self.assertFalse(self.contract.reviews);self.assertFalse(self.contract.seen);self.assertEqual(self.contract.get_revision(gl.message.sender_address,'research-1'),0)
    def test_unrelated_notice_rejected(self):
        self.seal();r=result();r['linked']=False;host.answers=[r]
        with self.assertRaisesRegex(ValueError,'supported link'):self.contract.assess('research-1',NOTICE,0)
        self.assertFalse(self.contract.reviews)
    def test_changing_source_rejects_consensus(self):
        self.seal();host.second_source=SOURCE+' changed';host.answers=[result()]
        with self.assertRaisesRegex(ValueError,'Consensus rejected'):self.contract.assess('research-1',NOTICE,0)
        self.assertFalse(self.contract.reviews)
    def test_audit_rejects_unsupported_reason(self):
        self.seal();host.answers=[result(),audit(supported=False)]
        with self.assertRaisesRegex(ValueError,'Consensus rejected'):self.contract.assess('research-1',NOTICE,0)
        self.assertFalse(self.contract.reviews)
    def test_fabricated_quote_rejected(self):
        r=result();r['findings'][0]['quote']='A fabricated quotation.'
        with self.assertRaisesRegex(ValueError,'exact notice excerpt'):c.parse_assessment(r,INPUT['claims'],SOURCE)
    def test_reordered_findings_rejected(self):
        r=result();r['findings'].reverse()
        with self.assertRaisesRegex(ValueError,'claim binding'):c.parse_assessment(r,INPUT['claims'],SOURCE)
    def test_empty_or_oversized_source_no_state_change(self):
        for source in ['',SOURCE*1000]:
            host.source=source;self.contract.dossiers.clear();self.seal()
            with self.assertRaisesRegex(ValueError,'inaccessible or too large'):self.contract.assess('research-1',NOTICE,0)
            self.assertFalse(self.contract.reviews)
    def test_same_paper_cannot_be_notice(self):
        self.seal()
        with self.assertRaisesRegex(ValueError,'must differ'):self.contract.assess('research-1',DOI,0)
    def test_input_bounds_and_claim_ids(self):
        for data in [{**INPUT,'claims':[]},{**INPUT,'doi':'https://evil.example/'},{**INPUT,'claims':[{**INPUT['claims'][0],'id':'C2'}]}]:
            with self.assertRaises(ValueError):c.parse_input(json.dumps(data))
    def test_second_notice_appends_without_overwrite(self):
        self.seal();first=self.assess();other='10.1371/journal.pone.0306187';host.source=SOURCE.replace(NOTICE,other);host.fetches=0;host.answers=[result(('UNCERTAIN','UNCERTAIN')),audit()]
        self.contract.assess('research-1',other,1)
        self.assertEqual(self.contract.get_revision(gl.message.sender_address,'research-1'),2)
        self.assertEqual(json.loads(self.contract.get_review(gl.message.sender_address,'research-1',1)),first)
    def test_missing_original_reference_rejected_before_model(self):
        self.seal();host.source=SOURCE.replace(DOI,'unrelated')
        with self.assertRaisesRegex(ValueError,'reference missing'):self.contract.assess('research-1',NOTICE,0)
    def test_unrelated_later_notice_cannot_clear_prior_citation_problem(self):
        previous=[{'id':'C1','action':'STOP_CITING'},{'id':'C2','action':'REWRITE'}]
        later=[{'id':'C1','action':'NO_CHANGE_FROM_NOTICE'},{'id':'C2','action':'NO_CHANGE_FROM_NOTICE'}]
        self.assertEqual(c.merge_actions(previous,later),previous)
    def test_cumulative_identity_cannot_be_reordered(self):
        with self.assertRaisesRegex(ValueError,'identity changed'):
            c.merge_actions([{'id':'C2','action':'REWRITE'}],[{'id':'C1','action':'REWRITE'}])
    def test_grounded_audit_requires_every_claim(self):
        value=audit();value['claims'].pop()
        self.assertFalse(c.audit_supported(value,INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_rejects_wrong_paper(self):
        value=audit();value['paper_linked']=False
        self.assertFalse(c.audit_supported(value,INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_rejects_wrong_notice_kind(self):
        self.assertFalse(c.audit_supported(audit('RETRACTION'),INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_rejects_reordered_rows(self):
        value=audit();value['claims'].reverse()
        self.assertFalse(c.audit_supported(value,INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_rejects_string_boolean(self):
        value=audit();value['claims'][0]['effect_supported']='true'
        self.assertFalse(c.audit_supported(value,INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_rejects_numeric_boolean(self):
        value=audit();value['claims'][0]['effect_supported']=1
        self.assertFalse(c.audit_supported(value,INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_rejects_missing_quote_support(self):
        value=audit();value['claims'][1]['quote_supported']=False
        self.assertFalse(c.audit_supported(value,INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_rejects_unsupported_reason(self):
        value=audit();value['claims'][1]['reason_supported']=False
        self.assertFalse(c.audit_supported(value,INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_rejects_overall_only_approval(self):
        self.assertFalse(c.audit_supported({'supported':True},INPUT['claims'],'CORRECTION'))
    def test_grounded_audit_does_not_need_a_second_candidate(self):
        self.seal();self.assess();self.assertEqual(host.answers,[])
    def test_unicode_hash_is_canonical(self):
        self.assertNotEqual(c.digest('研究'),c.digest('research'));self.assertIn('研究',c.canonical({'x':'研究'}))

if __name__=='__main__':unittest.main()
