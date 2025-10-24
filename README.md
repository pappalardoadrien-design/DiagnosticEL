# DiagPV Audit Électroluminescence - Interface Complète v3.0

## 📋 Description

Module professionnel d'audit photovoltaïque par électroluminescence avec :
- ✅ Interface terrain optimisée (fond noir pour usage nocturne)
- ✅ Configuration flexible (strings, onduleurs, boîtes de jonction)
- ✅ Calepinage interactif des modules
- ✅ Dashboard de gestion des audits
- ✅ Synchronisation automatique avec Hub DiagPV
- ✅ Génération de rapports professionnels

## 🌐 URLs Production

**Module EL** : https://diagpv-audit.pages.dev
- **Page d'accueil** : https://diagpv-audit.pages.dev/ (création audit)
- **Dashboard** : https://diagpv-audit.pages.dev/dashboard.html (liste audits)
- **Audit** : https://diagpv-audit.pages.dev/audit.html?token=xxx (calepinage)

**Hub DiagPV** : https://diagnostic-hub.pages.dev

## 🚀 Fonctionnalités

### 1. Page d'Accueil (index.html)
- Formulaire création audit complet
- Configuration simple : nombre strings + modules par string
- Configuration avancée : strings différents / MPPT
- Upload plan de centrale (JSON)
- Boutons : "Mes Audits" + "Hub DiagPV"

### 2. Dashboard (dashboard.html)
- Liste de tous les audits en cours
- Affichage : nom projet, client, localisation, nombre modules
- Accès rapide à chaque audit
- Bouton "Sync Hub" pour chaque audit
- Boutons : "Nouvel Audit" + "Hub DiagPV"

### 3. Interface Audit (audit.html)
- Calepinage interactif des modules photovoltaïques
- Marquage défauts par clic/touch (PID, microfissures, points chauds, etc.)
- Sélection multiple pour marquage groupé
- Mesures et commentaires par module
- Boutons : "Sync Hub" + "Mes Audits" + "Hub DiagPV"

### 4. Synchronisation Hub
- Bouton "Sync Hub" sur toutes les pages
- Synchronisation automatique des audits vers Hub DiagPV
- Création automatique : client + projet + intervention EL
- Stockage localStorage avec marqueurs de sync

## 🔧 Déploiement

### Depuis Windows

```cmd
cd "C:\Users\AdrienPappalardo\WEBAPP\DiagnosticEL-main (2)\DiagnosticEL-main"

npx wrangler pages deploy public --project-name diagpv-audit
```

### Depuis Linux/Mac

```bash
cd /path/to/DiagnosticEL-main
npx wrangler pages deploy public --project-name diagpv-audit
```

## 📊 Architecture

```
public/
├── index.html              # Page création audit
├── dashboard.html          # Dashboard liste audits
├── audit.html              # Interface calepinage
├── js/
│   └── diagpv-sync.js      # Script synchronisation Hub (13KB)
└── static/
    ├── diagpv-app.js           # Logique création audit (24KB)
    ├── diagpv-audit.js         # Logique calepinage interactif (44KB)
    ├── diagpv-measures.js      # Gestion mesures modules (18KB)
    ├── diagpv-json-importer.js # Import plans JSON (11KB)
    └── diagpv-styles.css       # Styles personnalisés (9KB)
```

## 🗄️ Stockage Données

**localStorage Keys :**
- `diagpv_audit_{token}` - Données complètes de l'audit
- `diagpv_audit_{token}_synced` - Statut synchronisation Hub
- `diagpv_recent_audits` - Liste des 10 derniers audits
- `diagpv_technician_id` - ID technicien

**Structure Audit :**
```javascript
{
  auditToken: "uuid",
  auditData: {
    project_name: "JALIBAT",
    client_name: "Watt&Co",
    location: "Castelomoron Sur Lot",
    created_at: "2025-01-24T10:00:00Z"
  },
  modules: [
    { id: 1, status: "OK", defects: [], comment: "" },
    // ... 242 modules
  ],
  lastSync: 1761305572932
}
```

## 🔗 Intégration Hub

**Hub Principal** : https://diagnostic-hub.pages.dev
**API Sync** : `POST https://diagnostic-hub.pages.dev/api/projects/sync`

**Payload Synchronisation :**
```json
{
  "auditData": {
    "projectName": "JALIBAT",
    "clientName": "Watt&Co",
    "totalModules": 242,
    "installedPower": 96.8,
    "defectsFound": 5,
    "conformityRate": 97.9
  }
}
```

## 📝 Versions

**v3.0.0** (2025-01-24)
- ✅ Interface complète avec 3 pages (accueil, dashboard, audit)
- ✅ Dashboard gestion audits
- ✅ Synchronisation Hub intégrée
- ✅ Tous les scripts JavaScript restaurés

**v2.0.0** (2025-01-24)
- Interface de base avec synchronisation

**v1.0.0** (2025-01-17)
- Version initiale

## 👤 Auteur

**DiagPV** - Diagnostic Photovoltaïque Professionnel
- Site : www.diagnosticphotovoltaique.fr
- Contact : Adrien Pappalardo
