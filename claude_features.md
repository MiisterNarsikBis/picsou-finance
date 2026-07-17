# claude_features.md

Idées de fonctionnalités pour Picsou — pistes à explorer, pas un engagement de roadmap. Avant de
lancer l'une d'elles : vérifier [`docs/INDEX.md`](docs/INDEX.md) / [`docs/decisions/`](docs/decisions/)
pour l'existant (certaines zones sont déjà couvertes par une ADR), et suivre le workflow "New
feature" de `CLAUDE.md` (note de feature + ADR si le choix est structurant).

## Budget & suivi du quotidien

1. **Budgets par catégorie avec alertes de dépassement** — enveloppes budgétaires mensuelles par
   poste de dépense (courses, transport, loisirs...), calculées sur les transactions déjà
   synchronisées, avec alerte au dépassement du plafond.
2. ✅ **Détection des abonnements récurrents** — repérer automatiquement les prélèvements récurrents
   (streaming, salle de sport, assurances), afficher leur coût total mensuel, alerter en cas de
   hausse de prix ou d'abonnement "oublié". *Implémenté le 2026-07-17, voir
   [`docs/features/recurring-subscriptions.md`](docs/features/recurring-subscriptions.md).*
3. **Prévision de trésorerie (cash-flow prévisionnel)** — projeter le solde des comptes courants
   sur les 30 prochains jours à partir des prélèvements récurrents et échéances connues (loyer,
   prêt, salaire), pour anticiper un découvert.
4. **Auto-catégorisation apprenante des transactions** — affiner la catégorisation automatique à
   partir des corrections manuelles de l'utilisateur au lieu de règles figées.
5. **Tags et recherche avancée sur les transactions** — étiquettes libres en plus des catégories
   (ex. "vacances 2026", "travaux"), recherche plein texte et filtres combinés.

## Notifications & assistant

6. **Notifications et alertes proactives** — canal email/push pour solde sous un seuil, échéance
   de prêt proche, objectif en retard sur sa trajectoire, variation significative d'un actif
   suivi. Aujourd'hui tout est "pull" (rien n'est poussé vers l'utilisateur).
7. **Assistant financier conversationnel intégré** — page de chat interne branchée sur les mêmes
   outils `@Tool` member-scopés que le serveur MCP déjà embarqué
   ([`docs/features/mcp-server.md`](docs/features/mcp-server.md)), pour poser des questions en
   langage naturel sans app tierce.
8. **Alertes de sécurité du compte** — notification à l'utilisateur en cas de connexion depuis un
   nouvel appareil/pays, ou de changement de mot de passe/2FA — complément naturel au TOTP déjà en
   place.

## Famille & partage

9. **Répartition des dépenses communes entre membres du foyer** — marquer une dépense comme
   partagée, définir une clé de répartition, calculer le solde "qui doit combien à qui" (type
   Tricount), en s'appuyant sur le système multi-membre déjà existant.
10. **Cagnottes / objectifs collaboratifs multi-contributeurs** — étendre les `goals` existants
    pour visualiser la contribution de chaque membre à un objectif commun (achat immobilier,
    voyage), pas seulement le total.
11. **Accès en lecture seule pour un tiers de confiance** — partage temporaire et révocable d'une
    vue en lecture seule à un conseiller financier ou un comptable, sans lui donner un compte
    membre complet.

## Reporting & analyse

12. **Rapport patrimonial mensuel automatique** — digest de fin de mois (évolution du net worth,
    comparaison au mois précédent, top variations, progression des objectifs), généré à partir des
    `BalanceSnapshot` déjà calculés quotidiennement.
13. **Score de santé financière** — indicateur synthétique (taux d'épargne, diversification, niveau
    d'endettement, régularité) affiché sur le dashboard.
14. **Détection d'anomalies de dépenses** — repérer un doublon de prélèvement, une fraude ou un
    montant atypique par rapport à l'historique du marchand/de la catégorie.
15. **Comparateur de performance vs indices de référence** — comparer la performance d'un
    portefeuille d'ETF/actions à un benchmark (CW8, S&P 500...) sur la même période.
16. **Comparateur de rendement de l'épargne** — visualiser en un coup d'œil quel compte
    (livret, PEA, assurance-vie...) rapporte le mieux et suggérer où placer un excédent de
    trésorerie.

## Fiscalité & projection

17. **Simulateur de projection patrimoniale / indépendance financière** — projection "et si..." à
    ce rythme d'épargne (FIRE, achat immobilier, retraite anticipée), en s'appuyant sur les mêmes
    données que l'amortissement de prêt déjà calculé à la volée.
18. **Simulateur fiscal** — estimation de l'impôt sur les plus-values (flat tax) ou de l'IFI à
    partir des positions et ventes déjà suivies, pour anticiper avant la déclaration.

## Import & accès

19. **Import de relevés bancaires par PDF/OCR** — pour les banques non couvertes par les
    connecteurs existants (Enable Banking, Powens), extraire les transactions d'un relevé PDF
    importé manuellement.
20. **Application mobile / PWA installable** — installation sur mobile avec notifications push,
    en s'appuyant sur le frontend React existant plutôt qu'une app native séparée.
