# 🧪 GUIDE DE TEST COMPLET - DiagPV v3.2

**Version:** 3.2  
**Date:** 2025-10-24  
**Objectif:** Tester la cohésion totale du système après corrections critiques

---

## ✅ CORRECTIONS APPLIQUÉES v3.2

### 1. **diagpv-audit.js**
- ✅ Supprimé toutes dépendances API (4 fetch calls)
- ✅ Corrigé `generateReportHTML()` pour utiliser `Map.values()` au lieu de `.filter()` direct
- ✅ Statistiques défauts calculées correctement avec Array.from()
- ✅ Fonction `saveAuditToLocalStorage()` appelée après chaque modification
- ✅ `window.app` exposé globalement pour accès console

### 2. **diagpv-sync.js**
- ✅ Support paramètre `?token=` en plus de `?sessionId=`
- ✅ Fonction `loadAuditData()` cherche dans `diagpv_audit_` (format principal)
- ✅ Recherche exhaustive localStorage si token non trouvé directement

### 3. **Architecture localStorage**
```javascript
// Format clé principale
"diagpv_audit_a4e19950-c73c-412c-be4d-699c9de1dde1"

// Contenu
{
  "auditToken": "a4e19950-c73c-412c-be4d-699c9de1dde1",
  "auditData": {
    "project_name": "JALIBAT",
    "client_name": "Client Name",
    "location": "Localisation",
    "created_at": "2025-01-15T10:00:00Z",
    "string_count": 8,
    "module_count": 242
  },
  "modules": [
    {
      "id": 1,
      "module_id": "M001",
      "string_number": 1,
      "position_in_string": 1,
      "status": "pending",
      "comment": null,
      "updated_at": null,
      "technician_id": null
    }
    // ... 241 autres modules
  ],
  "lastSync": 1737800000000
}
```

---

## 🧪 PROTOCOLE DE TEST

### **ÉTAPE 1 : Déploiement Cloudflare Pages**

#### 1.1 Redéployer le projet
```bash
# Sur Cloudflare Pages Dashboard
1. Aller sur https://dash.cloudflare.com/
2. Pages > diagpv-audit > View builds
3. Cliquer "Retry deployment" sur le dernier build
   OU
4. Push GitHub déclenchera auto-deployment
```

#### 1.2 Vérifier URL déployée
```
✅ Production: https://diagpv-audit.pages.dev
✅ Audit JALIBAT: https://diagpv-audit.pages.dev/audit.html?token=a4e19950-c73c-412c-be4d-699c9de1dde1
```

---

### **ÉTAPE 2 : Vider cache et cookies**

```javascript
// Dans DevTools > Console de https://diagpv-audit.pages.dev
localStorage.clear()
location.reload()

// OU depuis Settings navigateur
Settings > Privacy > Clear browsing data > Cookies and site data
```

**⚠️ ATTENTION:** Cela effacera vos audits ! Avant de vider, exporter JALIBAT si nécessaire.

---

### **ÉTAPE 3 : Import/Migration JALIBAT**

#### 3.1 Export depuis ancien domaine (si nécessaire)
```javascript
// Sur https://5643d3fa.diagpv-audit.pages.dev
// Console DevTools
const jalibat = localStorage.getItem('diagpv_audit_a4e19950-c73c-412c-be4d-699c9de1dde1')
console.log(jalibat)
// Copier le JSON complet
```

#### 3.2 Import sur nouveau domaine
```javascript
// Sur https://diagpv-audit.pages.dev
// Console DevTools
const jalibaData = `COLLER_ICI_LE_JSON_COPIÉ`
localStorage.setItem('diagpv_audit_a4e19950-c73c-412c-be4d-699c9de1dde1', jalibaData)
location.reload()
```

#### 3.3 Alternative : Utiliser ancien domaine
```
Si pas besoin de migrer, continuer à utiliser:
https://5643d3fa.diagpv-audit.pages.dev/audit.html?token=a4e19950-c73c-412c-be4d-699c9de1dde1
```

---

### **ÉTAPE 4 : Test Calepinage (Grille Modules)**

#### 4.1 Ouvrir audit JALIBAT
```
URL: https://diagpv-audit.pages.dev/audit.html?token=a4e19950-c73c-412c-be4d-699c9de1dde1
```

#### 4.2 Vérifier Console
```javascript
✅ Attendu dans Console:
"🌙 DiagPV Audit Terrain - Token: a4e19950-c73c-412c-be4d-699c9de1dde1"
"✅ Audit chargé: JALIBAT Modules: 242"
"📝 Ouverture modal pour module: M001" (si clic module)
```

#### 4.3 Tester navigation
- ✅ Cliquer sur filtre "TOUS" → Affiche toutes strings
- ✅ Cliquer sur "S1" → Affiche uniquement string 1
- ✅ Swipe gauche/droite (mobile) → Navigation strings
- ✅ Flèches clavier ← → → Navigation strings

#### 4.4 Marquer modules individuels
```
1. Cliquer sur un module (ex: M001)
2. Modal s'ouvre avec 6 statuts
3. Sélectionner "🟡 Inégalité"
4. Ajouter commentaire: "Cellules inégales détectées"
5. Cliquer VALIDER
6. ✅ Module change de couleur immédiatement
7. ✅ Progression mise à jour (1/242)
```

---

### **ÉTAPE 5 : Test Sélection Multiple**

#### 5.1 Activer mode sélection
```
1. Cliquer bouton "SÉLECTION MULTIPLE" (header)
2. ✅ Barre d'outils apparaît
3. ✅ Modules deviennent sélectionnables (bordure jaune au survol)
```

#### 5.2 Sélectionner modules
```
1. Cliquer "TOUT" → Sélectionne tous modules visibles
2. OU cliquer modules un par un
3. ✅ Compteur "Sélectionnés: X" se met à jour
4. ✅ Modules sélectionnés ont checkmark jaune
```

#### 5.3 Action de lot
```
1. Sélectionner 10 modules (M001 à M010)
2. Cliquer "🟠 Fissures" (barre d'outils)
3. Modal confirmation apparaît
4. Ajouter commentaire: "Microfissures visibles EL nocturne"
5. Cliquer CONFIRMER
6. ✅ 10 modules passent en orange instantanément
7. ✅ Progression: 10/242
```

#### 5.4 Quitter mode sélection
```
1. Cliquer "QUITTER SÉLECTION"
2. ✅ Barre d'outils disparaît
3. ✅ Retour mode normal (clic module = modal)
```

---

### **ÉTAPE 6 : Test Génération Rapport**

#### 6.1 Marquer quelques modules
```
- M001: OK
- M002-M010: Microfissures
- M011: HS
- M012: Inégalité
Total marqués: 12/242
```

#### 6.2 Générer rapport
```
1. Cliquer bouton "RAPPORT" (header)
2. ✅ Message "Génération rapport en cours..."
3. ✅ Nouvel onglet s'ouvre avec rapport HTML
```

#### 6.3 Vérifier contenu rapport
```
✅ Header: "RAPPORT D'AUDIT ÉLECTROLUMINESCENCE"
✅ Projet: JALIBAT
✅ Client: (nom client)
✅ Total modules: 242
✅ Modules OK: 1
✅ Défauts: 11
✅ Taux conformité: calculé automatiquement
✅ Tableau défauts par type
✅ Liste modules avec défauts (M002-M012)
✅ Recommandations selon taux conformité
✅ Footer: Token audit + Date génération
```

#### 6.4 Tester impression
```
1. Dans rapport, cliquer "🖨️ Imprimer / PDF"
2. ✅ Aperçu impression correct
3. ✅ Sauvegarde PDF fonctionnelle
```

---

### **ÉTAPE 7 : Test Synchronisation Hub**

#### 7.1 Préparer sync
```javascript
// Console DevTools sur page audit
DiagPVSync.config.debugMode = true
console.log('Session ID:', DiagPVSync.getSessionId())
// ✅ Doit afficher: "a4e19950-c73c-412c-be4d-699c9de1dde1"
```

#### 7.2 Vérifier données localStorage
```javascript
const audit = localStorage.getItem('diagpv_audit_a4e19950-c73c-412c-be4d-699c9de1dde1')
const parsed = JSON.parse(audit)
console.log('Audit data:', parsed.auditData)
console.log('Modules count:', parsed.modules.length)
// ✅ Doit afficher structure complète
```

#### 7.3 Lancer sync Hub
```
1. Cliquer bouton "Sync Hub" (si disponible)
   OU
2. Console: syncAuditToHub()
3. ✅ Logs console:
   "🔄 Début synchronisation vers Hub DiagPV..."
   "📋 Session ID: a4e19950-c73c-412c-be4d-699c9de1dde1"
   "📊 Données audit récupérées: ..."
   "📤 Payload préparé: ..."
```

#### 7.4 Vérifier résultat sync
```javascript
// Si succès
✅ "✅ Synchronisation réussie: {projectId: ..., interventionId: ...}"
✅ Notification: "✅ Projet synchronisé avec le Hub DiagPV !"
✅ localStorage: clé "diagpv_audit_..._synced" créée

// Si erreur
❌ "❌ Erreur synchronisation Hub: ..."
→ Vérifier Hub API accessible
→ Vérifier structure payload
```

---

### **ÉTAPE 8 : Test Interface Hub**

#### 8.1 Vérifier projet créé
```
1. Aller sur https://diagnostic-hub.pages.dev/projects
2. ✅ Projet "JALIBAT" visible dans liste
3. ✅ 242 modules
4. ✅ Taux conformité correct
5. ✅ Date audit
```

#### 8.2 Vérifier intervention
```
1. Cliquer sur projet JALIBAT
2. ✅ Intervention "Audit Électroluminescence" visible
3. ✅ Statut "Terminé"
4. ✅ Techniciens listés
```

---

### **ÉTAPE 9 : Test Fonctionnalités Avancées**

#### 9.1 Édition audit
```
1. Cliquer icône 🖊️ à côté du titre projet
2. Modal édition s'ouvre
3. Modifier:
   - Nom projet: "JALIBAT - Audit Complet 2025"
   - Client: "Nouveau Client SARL"
   - Localisation: "Bordeaux, France"
4. Cliquer SAUVEGARDER
5. ✅ Titre header mis à jour instantanément
6. ✅ localStorage mis à jour (vérifier console)
```

#### 9.2 Mode offline
```
1. DevTools > Network > Offline
2. Marquer plusieurs modules
3. ✅ Modifications enregistrées localement
4. ✅ Message "Mis à jour en mode offline"
5. Revenir Online
6. ✅ Sync automatique (si configuré)
```

#### 9.3 Collaboration temps réel (simulation)
```
1. Ouvrir 2 onglets même audit
2. Marquer module M050 dans onglet 1
3. (Actuellement: pas de sync temps réel automatique)
4. Rafraîchir onglet 2
5. ✅ Modifications visibles après refresh
```

---

### **ÉTAPE 10 : Tests Régression**

#### 10.1 Console sans erreurs
```javascript
// Aucune de ces erreurs ne doit apparaître:
❌ "Uncaught SyntaxError"
❌ "Uncaught TypeError"
❌ "fetch failed"
❌ "undefined is not a function"
❌ "Cannot read property of undefined"
```

#### 10.2 Performance
```
- Chargement audit < 2s
- Ouverture modal module < 100ms
- Génération rapport < 1s
- Sélection multiple 100 modules < 500ms
```

#### 10.3 Compatibilité mobile
```
- ✅ Responsive design fonctionne
- ✅ Touch optimisé (boutons 44x44px minimum)
- ✅ Swipe navigation strings
- ✅ Pas de zoom accidentel
```

---

## 🐛 PROBLÈMES CONNUS & SOLUTIONS

### Problème 1: "Session ID introuvable"
```
Cause: Paramètre URL incorrect
Solution: Utiliser ?token= au lieu de ?sessionId=
Exemple: /audit.html?token=a4e19950-c73c-412c-be4d-699c9de1dde1
```

### Problème 2: "Audit introuvable dans localStorage"
```
Cause: Données sur ancien domaine (5643d3fa.diagpv-audit.pages.dev)
Solution: Soit migrer données, soit utiliser ancien domaine
```

### Problème 3: Rapport génération échoue
```
Cause: this.modules est Map, pas Array
Solution: ✅ CORRIGÉ dans v3.2 (utilise Array.from())
```

### Problème 4: Module ne change pas de couleur
```
Cause: updateModuleButton() cherche module_id incorrect
Solution: Vérifier module.module_id existe et est correct
```

---

## 📊 CHECKLIST VALIDATION COMPLÈTE

### ✅ Core Fonctionnalités
- [ ] Chargement audit depuis localStorage
- [ ] Affichage grille modules (calepinage)
- [ ] Navigation strings (TOUS, S1-S8)
- [ ] Modal diagnostic module
- [ ] Marquage individuel modules (6 statuts)
- [ ] Commentaires modules
- [ ] Progression temps réel

### ✅ Sélection Multiple
- [ ] Activation/désactivation mode
- [ ] Sélection modules (clic)
- [ ] "Tout sélectionner"
- [ ] "Aucun" (clear selection)
- [ ] Actions de lot (6 statuts)
- [ ] Commentaire global
- [ ] Compteur sélectionnés

### ✅ Génération Rapport
- [ ] Bouton RAPPORT fonctionnel
- [ ] Ouverture nouvel onglet
- [ ] Statistiques correctes
- [ ] Tableau défauts par type
- [ ] Liste modules défectueux
- [ ] Recommandations dynamiques
- [ ] Impression/PDF

### ✅ Synchronisation Hub
- [ ] Détection token URL
- [ ] Chargement données localStorage
- [ ] Préparation payload
- [ ] Envoi API Hub
- [ ] Marquage "synced"
- [ ] Notification succès

### ✅ Interface & UX
- [ ] Design nocturne (fond noir)
- [ ] Boutons tous fonctionnels
- [ ] Icônes FontAwesome affichées
- [ ] Responsive mobile
- [ ] Animations smooth
- [ ] Notifications visuelles

### ✅ Performance
- [ ] Chargement < 2s
- [ ] Pas de freeze UI
- [ ] LocalStorage < 5MB
- [ ] Console sans erreurs critiques

---

## 🚀 PROCHAINES ÉTAPES RECOMMANDÉES

### Court terme (Sprint actuel)
1. ✅ Déployer v3.2
2. ✅ Tester JALIBAT complet (242 modules)
3. ✅ Valider sync Hub
4. ✅ Générer rapport réel
5. ⏳ Migration DEMO et LES FORGES si nécessaire

### Moyen terme (Sprint suivant)
1. Synchronisation temps réel (WebSocket/SSE)
2. Upload photos défauts
3. Import données PVserv (courbes IV)
4. Export Excel défauts
5. Signature électronique rapports

### Long terme (Roadmap)
1. Mode hors-ligne avancé (Service Worker)
2. Compression images EL
3. Comparaison audits multiples
4. Dashboard KPI client
5. API REST publique

---

## 📞 SUPPORT

**En cas de problème:**
1. Vérifier Console DevTools (F12)
2. Copier logs complets
3. Screenshot interface
4. Indiquer URL exacte
5. Décrire étapes reproduction

**Contact:** DiagPV Assistant (ce système IA)

---

**Version:** 3.2  
**Date:** 2025-10-24  
**Statut:** ✅ Prêt pour tests
