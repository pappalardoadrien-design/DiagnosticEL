# DiagPV Audit Électroluminescence - Interface Complète

## 📋 Description

Module professionnel d'audit photovoltaïque par électroluminescence avec :
- ✅ Interface terrain optimisée (fond noir pour usage nocturne)
- ✅ Configuration flexible (strings, onduleurs, boîtes de jonction)
- ✅ Calepinage interactif des modules
- ✅ Synchronisation automatique avec Hub DiagPV
- ✅ Génération de rapports professionnels

## 🌐 URL Production

**Module EL** : https://diagpv-audit.pages.dev

## 🚀 Fonctionnalités

### Configuration Audit
- Formulaire projet (nom, client, localisation, date)
- Configuration simple : nombre strings + modules par string
- Configuration avancée : strings différents / MPPT
- Upload plan de centrale (JSON)

### Interface Calepinage
- Grille interactive des modules photovoltaïques
- Marquage défauts par clic/touch
- Types de défauts : PID, microfissures, points chauds, etc.
- Sélection multiple pour marquage groupé

### Synchronisation Hub
- Bouton "Sync Hub" dans le header
- Synchronisation automatique après complétion audit
- Communication bidirectionnelle avec Hub (postMessage)
- Stockage localStorage avec marqueurs de sync

## 🔧 Déploiement

```bash
# Déploiement production
npx wrangler pages deploy public --project-name diagpv-audit
```

## 📊 Architecture

```
public/
├── index.html              # Interface complète EL
├── js/
│   └── diagpv-sync.js      # Script de synchronisation Hub
└── static/
    ├── diagpv-app.js       # Logique application (existant)
    └── diagpv-json-importer.js  # Import plans JSON (existant)
```

## 🔗 Intégration Hub

**Hub Principal** : https://diagnostic-hub.pages.dev
**API Sync** : `POST /api/projects/sync`

## 📝 Version

**v2.0.0** - Interface complète avec synchronisation Hub

## 👤 Auteur

**DiagPV** - Diagnostic Photovoltaïque Professionnel
- Site : www.diagnosticphotovoltaique.fr
