// DiagPV - Importeur JSON pour cartographies de sites
// Permet d'importer des configurations complexes depuis fichiers JSON

class DiagPVJsonImporter {
    constructor() {
        this.setupInterface()
    }

    setupInterface() {
        // Ajouter bouton d'import JSON à l'interface de création
        this.addJsonImportButton()
    }

    addJsonImportButton() {
        // Recherche de la section upload plan
        const uploadSection = document.querySelector('.bg-gray-800 .border-t')
        if (!uploadSection) return

        // Ajout option import JSON
        const jsonImportDiv = document.createElement('div')
        jsonImportDiv.className = 'border-t border-gray-600 pt-6 mt-6'
        jsonImportDiv.innerHTML = `
            <h4 class="text-lg font-bold mb-3">Option C - Import cartographie JSON :</h4>
            <div class="flex items-center space-x-4 mb-4">
                <input type="file" id="jsonConfigFile" accept=".json" class="hidden">
                <button type="button" onclick="document.getElementById('jsonConfigFile').click()" 
                        class="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold text-lg">
                    <i class="fas fa-file-code mr-2"></i>CHARGER CONFIG JSON
                </button>
                <span id="jsonFileName" class="text-gray-400"></span>
            </div>
            <div class="text-sm text-gray-400">
                <p><strong>Format JSON :</strong> Configuration complète site avec strings, modules, positions physiques</p>
                <p><strong>Avantage :</strong> Import instantané installations complexes (100+ modules)</p>
            </div>
        `

        uploadSection.parentNode.insertBefore(jsonImportDiv, uploadSection.nextSibling)

        // Event listener pour import JSON
        document.getElementById('jsonConfigFile').addEventListener('change', (e) => this.handleJsonImport(e))
    }

    async handleJsonImport(event) {
        const file = event.target.files[0]
        if (!file) return

        try {
            // Validation fichier JSON
            if (!file.name.endsWith('.json')) {
                this.showAlert('Format fichier incorrect. Utilisez .json', 'error')
                return
            }

            if (file.size > 2 * 1024 * 1024) { // 2MB max
                this.showAlert('Fichier trop volumineux. Maximum 2MB', 'error')
                return
            }

            // Lecture contenu JSON
            const content = await this.readFileContent(file)
            const config = JSON.parse(content)

            // Validation structure JSON
            if (!this.validateJsonConfig(config)) {
                return
            }

            // Application configuration au formulaire
            this.applyJsonConfig(config)

            document.getElementById('jsonFileName').textContent = `✅ ${file.name}`
            this.showAlert('Configuration JSON importée avec succès !', 'success')

            console.log('📋 Configuration JSON importée:', config)

        } catch (error) {
            console.error('Erreur import JSON:', error)
            this.showAlert('Erreur lecture JSON: ' + error.message, 'error')
        }
    }

    validateJsonConfig(config) {
        // Validation structure minimale
        if (!config.diagpv_import_format) {
            this.showAlert('JSON invalide: section "diagpv_import_format" manquante', 'error')
            return false
        }

        const importFormat = config.diagpv_import_format
        
        if (!importFormat.project_name || !importFormat.client_name || !importFormat.location) {
            this.showAlert('JSON invalide: informations projet manquantes', 'error')
            return false
        }

        if (!importFormat.string_count || !importFormat.modules_per_string) {
            this.showAlert('JSON invalide: configuration technique manquante', 'error')  
            return false
        }

        // Validation nombres
        if (importFormat.string_count < 1 || importFormat.modules_per_string < 1) {
            this.showAlert('JSON invalide: nombres strings/modules doivent être > 0', 'error')
            return false
        }

        if (importFormat.total_modules > 20000) {
            this.showAlert('JSON invalide: maximum 20 000 modules supportés', 'error')
            return false
        }

        return true
    }

    applyJsonConfig(config) {
        const importFormat = config.diagpv_import_format

        // Remplissage formulaire principal
        document.getElementById('projectName').value = importFormat.project_name
        document.getElementById('clientName').value = importFormat.client_name  
        document.getElementById('location').value = importFormat.location

        // Configuration technique
        document.getElementById('stringCount').value = importFormat.string_count
        document.getElementById('modulesPerString').value = importFormat.modules_per_string

        // Mise à jour calcul total
        if (window.diagpvApp) {
            window.diagpvApp.updateTotalModules()
        }

        // Stockage configuration détaillée pour usage ultérieur
        localStorage.setItem('diagpv_imported_config', JSON.stringify(config))

        // Affichage informations supplémentaires
        this.displayConfigSummary(config)
    }

    displayConfigSummary(config) {
        // Suppression ancien résumé
        const existingSummary = document.getElementById('json-config-summary')
        if (existingSummary) {
            existingSummary.remove()
        }

        // Création résumé configuration
        const summaryDiv = document.createElement('div')
        summaryDiv.id = 'json-config-summary'
        summaryDiv.className = 'mt-4 bg-blue-900 border border-blue-600 rounded-lg p-4'

        let summaryHTML = `
            <h4 class="font-bold text-blue-400 mb-3">
                <i class="fas fa-info-circle mr-2"></i>
                CONFIGURATION JSON IMPORTÉE
            </h4>
            <div class="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p><strong>Projet :</strong> ${config.project_info?.project_name || config.diagpv_import_format.project_name}</p>
                    <p><strong>Client :</strong> ${config.project_info?.client_name || config.diagpv_import_format.client_name}</p>
                    <p><strong>Référence :</strong> ${config.project_info?.reference || 'N/A'}</p>
                </div>
                <div>
                    <p><strong>Total modules :</strong> ${config.diagpv_import_format.total_modules}</p>
                    <p><strong>Configuration :</strong> ${config.diagpv_import_format.string_count} strings × ${config.diagpv_import_format.modules_per_string} modules</p>
                    <p><strong>Type :</strong> ${config.installation_config?.installation_type || 'Installation PV'}</p>
                </div>
            </div>
        `

        // Informations strings détaillées si disponibles
        if (config.strings_configuration && config.strings_configuration.length > 0) {
            summaryHTML += `
                <div class="mt-3 pt-3 border-t border-blue-600">
                    <p class="text-blue-300 font-bold mb-2">Strings configurés :</p>
                    <div class="grid grid-cols-4 gap-2 text-xs">
                        ${config.strings_configuration.slice(0, 12).map(str => 
                            `<span class="bg-blue-800 px-2 py-1 rounded">${str.string_id} (${str.modules.length}M)</span>`
                        ).join('')}
                        ${config.strings_configuration.length > 12 ? '<span class="text-blue-300">...</span>' : ''}
                    </div>
                </div>
            `
        }

        // Recommandations audit si disponibles
        if (config.audit_preparation) {
            summaryHTML += `
                <div class="mt-3 pt-3 border-t border-blue-600">
                    <p class="text-blue-300 font-bold mb-1">Préparation audit :</p>
                    <p class="text-xs">${config.audit_preparation.expected_duration || 'Durée à estimer'}</p>
                </div>
            `
        }

        summaryDiv.innerHTML = summaryHTML

        // Insertion après le formulaire
        const form = document.getElementById('createAuditForm')
        form.parentNode.insertBefore(summaryDiv, form.nextSibling)
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = e => resolve(e.target.result)
            reader.onerror = () => reject(new Error('Erreur lecture fichier'))
            reader.readAsText(file)
        })
    }

    showAlert(message, type = 'info') {
        // Utilise la fonction showAlert de l'app principale si disponible
        if (window.diagpvApp && window.diagpvApp.showAlert) {
            window.diagpvApp.showAlert(message, type)
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`)
            alert(message)
        }
    }

    // Génération fichier exemple pour démonstration
    generateExampleJson() {
        const example = {
            "project_info": {
                "project_name": "EXEMPLE-INSTALLATION-PV",
                "client_name": "Client Exemple",
                "location": "Site Exemple",
                "reference": "REF-001",
                "notes": "Configuration exemple pour DiagPV"
            },
            "diagpv_import_format": {
                "project_name": "EXEMPLE-INSTALLATION-PV", 
                "client_name": "Client Exemple",
                "location": "Site Exemple",
                "string_count": 4,
                "modules_per_string": 20,
                "total_modules": 80,
                "configuration_type": "manual"
            }
        }

        const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'diagpv-config-exemple.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que l'app principale soit chargée
    setTimeout(() => {
        window.diagpvJsonImporter = new DiagPVJsonImporter()
        console.log('📋 DiagPV JSON Importer initialisé')
    }, 1000)
})

// Export pour usage externe
window.DiagPVJsonImporter = DiagPVJsonImporter