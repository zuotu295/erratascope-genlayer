// Authored walkthrough, based on the linked publisher notice. Not chain output.
export const exampleInput = {
  doi: "10.1371/journal.pone.0251194",
  title:
    "A computational reproducibility study of PLOS ONE articles featuring longitudinal data analyses",
  claims: [
    {
      id: "C1",
      text: "I cite this paper as a computational reproducibility study of longitudinal data analyses.",
      locator: "Title and study scope",
    },
    {
      id: "C2",
      text: "I will reproduce Verena Loidl’s affiliation from the original publication.",
      locator: "Author affiliation 5",
    },
  ],
};
export const exampleNotice = "10.1371/journal.pone.0269047";
const quote = "There is an error in affiliation 5 for author Verena Loidl.";
export const exampleReview = {
  protocol: "erratascope-1",
  revision: 1,
  notice_doi: exampleNotice,
  notice_url: "https://journals.plos.org/plosone/article?id=" + exampleNotice,
  assessment: {
    linked: true,
    kind: "CORRECTION",
    findings: [
      {
        id: "C1",
        effect: "UNCHANGED_SCOPE",
        quote,
        reason:
          "This bounded notice corrects an author affiliation. That correction does not modify the declared citation to the study’s subject. This does not certify the study’s findings.",
      },
      {
        id: "C2",
        effect: "CHANGED",
        quote,
        reason:
          "The declared use reproduces the affiliation that this notice corrects. Consult the publisher notice and use the corrected affiliation.",
      },
    ],
  },
  actions: [
    { id: "C1", action: "NO_CHANGE_FROM_NOTICE" },
    { id: "C2", action: "REWRITE" },
  ],
};
