# claude_features.md

Idées de fonctionnalités pour Picsou — pistes à explorer, pas un engagement de roadmap. Chaque
idée indique pourquoi elle serait utile et comment elle s'appuierait sur l'architecture existante
(voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/INDEX.md`](docs/INDEX.md) pour
l'existant avant de démarrer une de ces pistes — certaines touchent des zones déjà couvertes par
une ADR).

## 1. Budgets par catégorie avec alertes de dépassement

Aujourd'hui Picsou suit les objectifs d'épargne (`goals`) et le patrimoine, mais pas un budget
mensuel par poste de dépense (courses, transport, loisirs...). Ajouter des enveloppes budgétaires
par catégorie, avec une alerte quand une catégorie dépasse son plafond en cours de mois.
S'appuierait sur les transactions déjà importées/synchronisées (bancaires + manuelles) et sur le
`SchedulerService` existant pour le calcul périodique.

## 2. Détection des abonnements récurrents

Repérer automatiquement les prélèvements récurrents (Netflix, salle de sport, assurances...) à
partir de l'historique de transactions, afficher le coût total mensuel des abonnements, et alerter
en cas de hausse de prix ou d'abonnement "oublié" (aucune activité associée). Un des cas d'usage
les plus demandés sur ce type d'app — et une bonne matière pour l'assistant IA (idée 4).

## 3. Notifications et alertes proactives

Un canal de notifications (email, ou push si une PWA voit le jour) pour : solde sous un seuil,
échéance de prêt qui approche, objectif d'épargne en retard sur sa trajectoire, variation
significative d'un actif crypto/bourse suivi. Actuellement rien n'est poussé vers l'utilisateur en
dehors du dashboard — tout est "pull". Nécessite un service d'envoi (SMTP déjà probablement présent
pour d'autres flux à vérifier) et des préférences par membre.

## 4. Assistant financier conversationnel intégré

Picsou expose déjà un serveur MCP embarqué avec des clés d'accès scopées par membre
(voir [`docs/features/mcp-server.md`](docs/features/mcp-server.md)) pensé pour des clients MCP
externes (Claude Desktop, etc.). Une page de chat interne au produit, branchée sur ces mêmes
outils `@Tool` déjà member-scopés, permettrait de poser des questions en langage naturel
("combien j'ai dépensé en restaurants ce mois-ci ?") sans dépendre d'une app tierce. Gros levier
produit, risque architectural faible car la couche outils existe déjà.

## 5. Répartition des dépenses communes entre membres du foyer

Le multi-membre existe (`family_member`, `sharing_settings`), mais pour un couple/famille qui
partage certains comptes, il manque un mécanisme de "qui doit combien à qui" sur les dépenses
communes (type Tricount) — marquer une dépense comme partagée, définir une clé de répartition, et
calculer un solde entre membres.

## 6. Rapport patrimonial mensuel automatique

Un digest généré et envoyé (email ou consultable dans l'app) en fin de mois : évolution du
patrimoine net, comparaison au mois précédent, top variations, progression des objectifs. Combine
les snapshots de solde déjà calculés quotidiennement (`BalanceSnapshot`) avec un job planifié
supplémentaire dans `SchedulerService`.

## 7. Simulateur de projection patrimoniale / indépendance financière

Un outil de simulation "et si..." : à ce rythme d'épargne, quand est-ce que je peux couvrir mes
dépenses avec le patrimoine investi (FIRE), ou combien coûterait un projet (achat immobilier,
retraite anticipée) compte tenu des flux actuels. S'appuierait sur les mêmes données que
l'amortissement de prêt déjà calculé à la volée
([`docs/decisions/2026-04-26-loan-amortization-on-the-fly.md`](docs/decisions/2026-04-26-loan-amortization-on-the-fly.md)).

## 8. Score de santé financière et détection d'anomalies

Un score synthétique (taux d'épargne, diversification, niveau d'endettement, régularité) affiché
sur le dashboard, plus une détection de transactions inhabituelles (montant ou marchand atypique)
pour repérer un doublon de prélèvement, une fraude, ou une dépense oubliée. Peut démarrer simple
(règles statistiques sur l'historique) avant d'envisager un vrai modèle.

---

Avant de lancer l'une de ces pistes : vérifier `docs/decisions/` pour une ADR déjà existante sur
le sujet, et suivre le workflow "New feature" de `CLAUDE.md` (note de feature + ADR si le choix est
structurant).
