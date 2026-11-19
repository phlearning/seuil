# Seuil - Spécification

> Rien ne passe le seuil sans être conforme.

Statut : version 2, à valider. Date : 19 novembre 2026. Durée prévue : 5 semaines, périmètre complet.

## 1. Objectif

Seuil est un projet vitrine pour une candidature spontanée (stage ou emploi fullstack) chez **Le Labster** (Carouge, Genève). Il doit aussi pouvoir être présenté à d'autres agences de product design.

Le projet doit montrer, en 5 minutes et sans rien installer :

- que je comprends le métier d'une agence qui livre des applications à des clients réglementés ;
- que je sais construire un outil fullstack complet, testé et distribuable ;
- que cet outil est **utile à l'agence dès demain**, pas seulement une démo.

## 2. Contexte : Le Labster

Faits publics (site labster.io, fiche Great Place To Work) :

- Agence de product design et d'IA, environ 17 personnes, à Carouge, avec un bureau à Lausanne.
- Offres : Digital Product Design, Solutions IA, **Design Ops** (audit, design system, workflow UX-IA-Dev), co-design, formations, talent sourcing.
- Clients cités : HUG, IMAD, État de Genève, SIG, Romande Énergie, Lombard Odier, Banque Pictet, Richemont.
- Secteurs : santé, administration publique, énergie, finance, donc des clients soumis à des exigences d'accessibilité et de protection des données.
- Méthode en 3 phases : cadrage, conception, delivery.
- Leur étude « Panorama IA & Design 2026 » indique que 55 % des répondants exigent la souveraineté des données.
- Stack technique non publiée. Leurs clients publics (HUG) recrutent en Java/Angular.

## 3. Concept

Seuil est une **porte de conformité** qui s'insère dans la chaîne de livraison d'une agence. Elle part du design system, passe par les composants et les pages, et bloque une PR tant que les contrôles d'accessibilité, de protection des données ou de sécurité échouent. Elle produit ensuite un **rapport d'audit complet** que l'agence peut remettre à son client.

Deux parties, avec une répartition de l'effort fixée à **70 / 30** :

| Partie | Part de l'effort | Contenu |
|---|---|---|
| Conformité (cœur) | 70 % | Contrôles, audit guidé, registre des flux, CLI, Docker, intégrations CI, commentaire de PR, rapport client |
| Chaîne design | 30 % | Tokens DTCG, Style Dictionary, composants React, Storybook, 3 thèmes |

La chaîne design est un vrai livrable, complet mais simple, sans fonctionnalités supplémentaires.

## 4. Contrôles

Chaque contrôle produit des résultats normalisés : `id`, `sévérité` (`error` | `warning`), `cible` (token, composant, page), `message`, `référence` (critère WCAG, article nLPD...), `correction suggérée`.

### 4.1 Contraste dès les tokens (`tokens/contrast`)

- Entrée : fichiers de tokens au format W3C Design Tokens (DTCG).
- Les paires texte/fond à vérifier sont déclarées dans la config (`pairs`), par thème.
- Calcul du ratio de contraste selon WCAG 2.2 : 4.5:1 pour le texte normal, 3:1 pour le grand texte et les composants d'interface.
- Il n'y a pas de navigateur, donc le contrôle est rapide et tourne au moment du design, avant tout code. C'est l'accroche Design Ops du projet.

### 4.2 Accessibilité automatisée (`a11y/*`)

Le référentiel est **WCAG 2.2 AA**. eCH-0059 v3.0, obligatoire dans l'administration fédérale depuis 2021, exige WCAG 2.1 AA, et un contenu conforme à WCAG 2.2 l'est aussi à WCAG 2.1. Le rapport affiche les deux référentiels.

Les règles tournent avec Playwright, sur chaque story Storybook et sur chaque page des démos :

- `a11y/axe` : `@axe-core/playwright`.
- `a11y/keyboard` : ordre de tabulation cohérent avec l'ordre visuel, focus toujours visible (2.4.7, 2.4.11), aucun piège au clavier (2.1.2), tous les éléments interactifs atteignables.
- `a11y/reflow` : pas de défilement horizontal à 320 px de large (1.4.10), contenu lisible à 200 % de zoom (1.4.4).
- `a11y/text-spacing` : aucune perte de contenu avec les espacements de texte de 1.4.12.
- `a11y/motion` : animations désactivées avec `prefers-reduced-motion`.
- `a11y/target-size` : cibles d'au moins 24 x 24 px (2.5.8).
- `a11y/names` : snapshot de l'arbre d'accessibilité (rôles et noms accessibles), comparé d'une PR à l'autre pour repérer les régressions.

### 4.3 Audit guidé (`seuil review`)

Les critères qu'aucune machine ne peut juger (pertinence d'un texte alternatif, ordre de lecture logique, qualité des sous-titres...) sont traités par un audit guidé, pour que **le rapport couvre 100 % des critères WCAG 2.2 AA**.

- Chaque critère porte l'un de ces statuts : `auto-ok`, `auto-échec`, `à vérifier`, `vérifié-ok`, `vérifié-échec` ou `non applicable`.
- Pour chaque critère "à vérifier", Seuil prépare le matériel : une checklist en français, des captures des éléments concernés (toutes les images avec leur `alt`, l'ordre de lecture superposé à la page...) et la liste des pages concernées.
- `seuil review` ouvre une interface web **locale**. L'auditeur y coche les critères, commente et joint des captures.
- Les réponses sont enregistrées dans `seuil-review.json`, versionné dans le dépôt. Une revue est donc traçable et rejouable, et un critère déjà vérifié repasse "à vérifier" si la page concernée change.

### 4.4 Tiers, localisation et nLPD (`privacy/*`)

- `privacy/third-parties` : pendant le chargement de chaque page, Playwright intercepte toutes les requêtes réseau. Toute requête hors des domaines first-party déclarés est signalée.
- `privacy/consent` : les cookies et le stockage local déposés avant toute interaction (donc avant le consentement) sont signalés.
- **Deux signaux de localisation**, affichés côte à côte :
  - **le pays du serveur**, via la base DB-IP Lite (gratuite, licence CC BY 4.0, embarquée dans l'image Docker, avec l'attribution requise dans le rapport et le README) ;
  - **la juridiction du fournisseur**, via une liste de fournisseurs maintenue dans le dépôt (société mère, pays, exposition au CLOUD Act). Un CDN peut avoir un serveur à Zurich et appartenir à une société américaine.

#### Registre des flux de données

Pour chaque tiers, l'outil indique :

- le fournisseur ;
- les données transmises (IP, cookies, en-têtes) ;
- le pays du serveur et la juridiction du fournisseur ;
- s'il est chargé avant le consentement ;
- les articles nLPD concernés (par exemple l'art. 16, sur la communication de données à l'étranger).

Le registre est exporté en HTML et en CSV, prêt à être complété et validé par le DPO du client (le responsable de la protection des données). Seuil fournit un constat technique documenté et ne rend pas d'avis juridique.

### 4.5 Sécurité (`security/*`)

- `security/headers` : en-têtes HTTP de la page servie (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), avec une analyse de la CSP (`unsafe-inline`, `unsafe-eval`, jokers).
- `security/deps` : lecture du lockfile et requête à la base OSV (osv.dev). Seul le contenu du lockfile est envoyé, jamais le code. Cette requête peut être désactivée pour un usage hors ligne.

## 5. Interfaces

### 5.1 CLI

```
seuil tokens <dossier-tokens>          # contrôle 4.1 seul
seuil audit <url | dossier-storybook>  # contrôles 4.2, 4.4, 4.5
seuil check                            # tout, selon seuil.config.json
seuil review                           # interface locale d'audit guidé (4.3)
seuil report <resultats.json> --format html|md|csv --lang fr|en
```

- Codes de sortie : `0` = conforme, `1` = au moins une erreur, `2` = erreur d'exécution.
- `seuil check` écrit `seuil-results.json`, qui est la source unique pour tous les formats de sortie.
- L'audit d'une URL quelconque se fait **en local** : chacun l'exécute sur sa propre machine, donc aucun serveur public n'est exposé à des abus ou au SSRF.

### 5.2 Configuration (`seuil.config.json`)

```json
{
  "tokens": { "path": "packages/tokens/src", "themes": ["sante", "admin", "energie"],
              "pairs": [["color.text.default", "color.bg.default"]] },
  "targets": ["http://localhost:6006", "http://localhost:3000"],
  "firstParty": ["localhost"],
  "allowThirdParties": [],
  "level": "AA",
  "failOn": "error",
  "offline": false
}
```

### 5.3 Sorties

- **Commentaire de PR** (Markdown) : résumé, puis tableau des erreurs avec lien vers le critère et la correction suggérée. Il est mis à jour à chaque push au lieu d'être dupliqué.
- **Rapport d'audit client** (HTML imprimable en PDF, en français, avec l'anglais en option), destiné au client final de l'agence :
  - synthèse ;
  - périmètre testé ;
  - tableau de couverture des **50+ critères WCAG 2.2 AA**, chacun avec son statut ;
  - résultats par catégorie ;
  - registre des flux de données ;
  - correspondance avec eCH-0059 ;
  - méthode et date.

  L'agence peut le remettre tel quel.

### 5.4 Distribution

L'image Docker appelle le CLI, et les intégrations CI appellent l'image Docker. Une seule logique, quatre portes d'entrée :

- `npx seuil` ;
- l'image Docker `seuil` (Playwright, navigateurs et base DB-IP inclus) ;
- la GitHub Action `action/` ;
- le template GitLab CI `gitlab/seuil.gitlab-ci.yml`, important pour les clients réglementés dont la CI est auto-hébergée.

## 6. Chaîne design

- `packages/tokens` : tokens DTCG (couleurs, typographie, espacements), un fichier de base et 3 thèmes, transformés par Style Dictionary en variables CSS et en TypeScript.
- `packages/ui` : composants React et TypeScript (Button, TextField, Select, Checkbox, Alert, Card, Header, Modal, Form), qui consomment uniquement les variables CSS des tokens.
- Storybook avec un sélecteur de thème. Chaque story est auditée par Seuil.

## 7. Démos : 3 clients fictifs

Les noms et les marques sont inventés. Aucune marque réelle n'est utilisée (ni HUG, ni État de Genève, ni SIG).

| Démo | Secteur | Pages | Violation de la PR rouge |
|---|---|---|---|
| `demos/sante` : Clinique des Aubépines | Santé | Accueil, prise de rendez-vous | Formulaire médical sans labels, modale qui piège le focus clavier |
| `demos/admin` : Commune de Valfleurie | Administration | Démarche en ligne, confirmation | Google Fonts chargé depuis un serveur tiers, contraste d'un token insuffisant, reflow cassé à 320 px |
| `demos/energie` : Cascade Énergie | Énergie | Espace client, consommation | Traceur analytics américain chargé sans consentement, CSP absente, dépendance vulnérable |

Chaque démo a une **PR rouge** (bloquée par Seuil, avec un commentaire), puis une **PR verte** (corrigée), ainsi qu'un **audit guidé complété**, ce qui donne un rapport final à 100 % de couverture. Les PR restent visibles dans le dépôt public.

## 8. Vitrine (GitHub Pages, gratuit)

Le site est statique et généré en CI :

- une page d'accueil (le problème, ce que fait Seuil, comment l'installer en une ligne) ;
- le Storybook des 3 thèmes ;
- les rapports d'audit et les registres des flux des 3 démos, avant et après correction ;
- une démo en lecture seule de l'interface d'audit guidé ;
- des liens vers les PR rouges et vertes.

Note de souveraineté dans le README : la vitrine est hébergée sur GitHub, mais l'outil n'envoie aucune donnée (hormis la requête OSV, désactivable) et peut tourner entièrement sur l'infrastructure du client.

## 9. Structure du dépôt

```
seuil/
  packages/
    tokens/      # DTCG + Style Dictionary
    ui/          # composants React + Storybook
    seuil/       # CLI de conformité (le cœur)
    review/      # interface locale d'audit guidé
  data/
    providers/   # liste des fournisseurs tiers et juridictions
    wcag/        # critères WCAG 2.2 AA, checklists FR/EN, correspondance eCH-0059
  demos/
    sante/  admin/  energie/
  action/        # GitHub Action
  gitlab/        # template GitLab CI
  site/          # vitrine GitHub Pages
  docs/
    SPEC.md
  Dockerfile
  README.md  README.fr.md
```

Monorepo pnpm, TypeScript partout. Le dépôt reste privé pendant le développement et devient public à la mise en ligne de la vitrine.

## 10. Qualité

- Les règles de `packages/seuil` sont développées en TDD. Chaque règle a des fixtures conformes et non conformes.
- Le calcul de contraste est testé avec des valeurs de référence connues.
- La CI du dépôt utilise Seuil sur lui-même : la démo est aussi un test d'intégration.

## 11. Planning (5 semaines)

| Semaine | Livrables | Fin de semaine démontrable |
|---|---|---|
| 1 | Monorepo, tokens et 3 thèmes, `seuil tokens` (TDD), composants et Storybook | `seuil tokens` échoue sur un token mal contrasté |
| 2 | `seuil audit` : axe, clavier, reflow, espacement, mouvement, cibles, noms accessibles. Format de résultats | Audit accessibilité automatisé complet sur Storybook |
| 3 | Tiers et consentement, DB-IP, liste de fournisseurs, registre des flux, en-têtes et CSP, OSV, 3 démos | `seuil check` en local sur les 3 démos |
| 4 | Référentiel WCAG 2.2 AA et eCH-0059, `seuil review` (interface locale), rapport d'audit FR/EN, export CSV | Rapport client à 100 % de couverture sur une démo |
| 5 | Commentaire de PR, Docker, Action, template GitLab, PR rouges et vertes, audits guidés des 3 démos, vitrine, README FR/EN | Vitrine en ligne, dépôt public, candidature envoyée |

## 12. Critères de réussite

- Un visiteur comprend le projet en moins de 5 minutes depuis la vitrine.
- `npx seuil check` fonctionne sur un projet qui n'est pas le mien.
- Chaque PR rouge échoue pour la bonne raison, et chaque PR verte passe.
- Le rapport d'audit couvre 100 % des critères WCAG 2.2 AA et peut être remis tel quel à un client.

## 13. Hors périmètre, prévu ensuite

- **Couche IA** (explication des violations, correctif proposé dans la PR) : le modèle local est trop lent sur ma machine, donc ce sera via une API (fournisseur au choix, clé fournie par l'utilisateur), désactivée par défaut. Le format de résultats (section 4) contient déjà le contexte nécessaire (sélecteur, extrait HTML, critère), donc l'ajout ne demandera aucune refonte.
- Import Figma.
- Lighthouse et la performance.
- Audit d'URL depuis un serveur public.

## 14. Candidature

- Envoi à la fin de la semaine 5 : candidature spontanée avec un lien direct vers la vitrine et une demi-page « pourquoi je l'ai fait pour vous », fondée sur les sections 2 et 3.
- Joindre en privé, avec un ton bienveillant, un audit de labster.io fait avec Seuil : « voici ce que l'outil trouve, et voici comment le corriger ». Seulement si le résultat est mesuré. **Jamais publié.**

## 15. Points à vérifier pendant le développement

- Le texte officiel d'eCH-0059 sur ech.ch, pour confirmer la v3.0 et la liste exacte des exigences au-delà des WCAG.
- La source de la liste des fournisseurs tiers (et sa licence si elle est reprise d'un projet existant).
- Les conditions d'attribution de DB-IP Lite et sa fréquence de mise à jour (mensuelle).
- La taille de l'image Docker avec les navigateurs Playwright et la base DB-IP.
- Le nom `seuil` est libre sur npm au 19 novembre 2026. Le réserver avant la mise en ligne, ou publier sous un scope personnel.
