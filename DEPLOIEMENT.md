# 🚀 Guide de Déploiement - DiagPV Audit EL v3.1

## ✅ Corrections Appliquées

### v3.1 (2025-01-24 - Fix Rapports)
- ✅ **Génération rapports côté client** (plus besoin d'API backend)
- ✅ **Exposition `window.app`** pour accès aux fonctions
- ✅ **Sauvegarde localStorage automatique** sur chaque modification
- ✅ **Suppression appels API** (4 fetch supprimés)
- ✅ **Outil nettoyage audits corrompus** (`/cleanup.html`)

---

## 📦 Déploiement Depuis Windows

### Étape 1 : Télécharger depuis GitHub

```
https://github.com/pappalardoadrien-design/DiagnosticEL/archive/refs/heads/main.zip
```

Extraire dans :
```
C:\Users\AdrienPappalardo\WEBAPP\DiagnosticEL-v3.1
```

### Étape 2 : Déployer sur Cloudflare Pages

```cmd
cd "C:\Users\AdrienPappalardo\WEBAPP\DiagnosticEL-v3.1\DiagnosticEL-main"

npx wrangler pages deploy public --project-name diagpv-audit
```

---

## 🧪 Tests Post-Déploiement

### Test 1 : Page d'Accueil
```
https://diagpv-audit.pages.dev/
```
**Attendu** : Liste des audits (JP, LES FORGES, test, etc.)

### Test 2 : Ouvrir un Audit
```
https://diagpv-audit.pages.dev/audit.html?token=76e6eb36-8b49-4255-99d3-55fc1adfc1c9
```
**Attendu** : Calepinage avec 220 modules (LES FORGES)

### Test 3 : Générer Rapport
1. Ouvre un audit
2. Appuie sur **F12** (console)
3. Exécute :
```javascript
window.app.generateReport()
```
**Attendu** : Nouvel onglet avec rapport HTML professionnel

### Test 4 : Nettoyer Audits Corrompus
```
https://diagpv-audit.pages.dev/cleanup.html
```
**Actions** : Cliquer "Nettoyer Audits Corrompus"

---

## 🔧 Résolution Problèmes

### Problème : "window.app is undefined"

**Solution** : Attendre que le DOM soit chargé, puis :
```javascript
window.diagpvAudit.generateReport()
```

### Problème : Audit corrompu (auditData null)

**Solution** : Utiliser l'outil de nettoyage
```
https://diagpv-audit.pages.dev/cleanup.html
```

### Problème : JALIBAT ne s'affiche pas

**Cause** : JALIBAT est sur l'ancien domaine `5643d3fa.diagpv-audit.pages.dev`

**Solution** : 2 options

**Option A** : Continuer à utiliser l'ancien domaine pour JALIBAT
```
https://5643d3fa.diagpv-audit.pages.dev/audit.html?token=a4e19950-c73c-412c-be4d-699c9de1dde1
```

**Option B** : Export/Import manuel

1. Ouvrir ancien domaine
2. Console (F12) :
```javascript
const jalibat = localStorage.getItem('diagpv_audit_a4e19950-c73c-412c-be4d-699c9de1dde1');
console.log(jalibat); // Copier le JSON
```

3. Ouvrir nouveau domaine
4. Console (F12) :
```javascript
const jalibaData = `[COLLER JSON ICI]`;
localStorage.setItem('diagpv_audit_a4e19950-c73c-412c-be4d-699c9de1dde1', jalibaData);
location.reload();
```

---

## 📊 Architecture Finale

```
DiagPV Audit EL v3.1
├── index.html (ou index-simple.html)
│   └── Liste audits + Bouton création
├── audit.html
│   └── Calepinage + Génération rapport
├── dashboard.html
│   └── Vue d'ensemble audits
├── cleanup.html
│   └── Outil nettoyage
└── static/
    ├── diagpv-audit.js (44KB) ✅ Fixé
    ├── diagpv-sync.js (13KB)
    └── ...
```

---

## 🎯 Fonctionnalités Confirmées

- ✅ Calepinage interactif modules
- ✅ Marquage défauts (PID, microfissures, etc.)
- ✅ Sélection multiple (bulk update)
- ✅ **Génération rapports HTML** (CORRIGÉ)
- ✅ Synchronisation Hub DiagPV
- ✅ Sauvegarde localStorage automatique
- ✅ Navigation inter-pages

---

## 📝 Notes

**localStorage Keys** :
- `diagpv_audit_{token}` - Données audit complètes
- `diagpv_audit_{token}_synced` - Statut synchronisation
- `diagpv_technician_id` - ID technicien

**Domaines** :
- **Production** : `diagpv-audit.pages.dev`
- **Ancien (archives)** : `5643d3fa.diagpv-audit.pages.dev`

**Token JALIBAT** : `a4e19950-c73c-412c-be4d-699c9de1dde1`
**Token LES FORGES** : `76e6eb36-8b49-4255-99d3-55fc1adfc1c9`

---

**Déploiement validé : Janvier 2025**
