# Seuil

> Rien ne passe le seuil sans être conforme.

[English version](README.md)

Seuil est une porte de conformité pour les agences qui livrent des produits web à des clients réglementés (santé, administration publique, énergie). Il s'insère dans la chaîne de livraison, des design tokens jusqu'aux pages déployées, et bloque une pull request tant que les contrôles d'accessibilité, de protection des données et de sécurité échouent. Il produit ensuite un rapport d'audit que l'agence peut remettre tel quel à son client.

**Statut : squelette.** Les commandes existent mais ne sont pas encore implémentées. La spécification complète et le planning sur 5 semaines sont dans [docs/SPEC.md](docs/SPEC.md).

## Ce que Seuil contrôle

- **Le contraste dans les design tokens**, avant même le code (WCAG 2.2, 1.4.3 et 1.4.11).
- **L'accessibilité des pages et des stories Storybook** : axe-core, navigation au clavier, reflow, espacement du texte, réduction des animations, taille des cibles, noms accessibles. Le référentiel est WCAG 2.2 AA, qui couvre eCH-0059 v3.0 (WCAG 2.1 AA).
- **Un audit manuel guidé** pour les critères qu'aucune machine ne peut juger, afin que le rapport couvre 100 % des critères WCAG 2.2 AA.
- **Les tiers et la protection des données (nLPD)** : chaque requête externe, les cookies déposés avant le consentement, le pays du serveur et la juridiction du fournisseur, exportés en registre des flux pour le DPO du client (le responsable de la protection des données).
- **La sécurité** : en-têtes HTTP, analyse de la CSP, dépendances vulnérables (OSV).

Seuil fait un constat technique. Ce n'est pas un avis juridique, et des contrôles automatisés ne remplacent jamais un audit humain : c'est la raison d'être de l'audit guidé.

## Organisation

| Chemin | Contenu |
|---|---|
| `packages/seuil` | Le CLI, cœur du projet |
| `packages/tokens` | Design tokens DTCG et trois thèmes clients |
| `packages/ui` | Composants React et Storybook |
| `packages/review` | Interface locale d'audit guidé |
| `data/` | Liste des fournisseurs tiers, référentiel WCAG |
| `demos/` | Trois clients fictifs : santé, administration, énergie |
| `action/`, `gitlab/` | GitHub Action et template GitLab CI |
| `site/` | Vitrine statique pour GitHub Pages |

## Développement

Nécessite Node 22 ou plus récent et pnpm 12.

```bash
pnpm install
pnpm test
pnpm build
node packages/seuil/dist/cli.js --help
```

## Souveraineté des données

L'outil n'envoie aucune donnée, hormis la requête optionnelle de vulnérabilités à OSV (contenu du lockfile uniquement, désactivable avec `"offline": true`). Il peut tourner entièrement sur l'infrastructure du client, y compris sur un GitLab auto-hébergé.
