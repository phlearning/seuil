# WCAG 2.2 AA reference data

`criteria.json` lists the 55 success criteria of WCAG 2.2 levels A and AA (4.1.1 Parsing was removed in 2.2), with:

- the English title and the French title of the [W3C authorized French translation](https://www.w3.org/Translations/WCAG22-fr-20250317/);
- `wcag21`: true when the criterion already exists in WCAG 2.1. eCH-0059 v3.0 requires WCAG 2.1 AA, so these 49 criteria are the ones it covers;
- `checks`: the Seuil rules that test part of the criterion. No automated rule proves a criterion on its own, which is why every criterion also goes through the guided review (`seuil review`);
- `notApplicableWithout`: a page feature (media, forms, images, links, password fields). When no audited page has it, the review suggests "not applicable";
- a short French and English checklist for the human reviewer.
