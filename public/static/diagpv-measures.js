// DiagPV - Interface mesures PVserv
// Upload et visualisation mesures électriques

class DiagPVMeasures {
    constructor(auditToken) {
        this.auditToken = auditToken
        this.measurements = []
        this.setupInterface()
    }

    setupInterface() {
        this.createMeasuresModal()
        this.setupEventListeners()
    }

    createMeasuresModal() {
        // Création modal mesures si n'existe pas
        if (document.getElementById('measuresModal')) return

        const modal = document.createElement('div')
        modal.id = 'measuresModal'
        modal.className = 'hidden fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4'
        
        modal.innerHTML = `
            <div class="bg-gray-900 border-2 border-yellow-400 rounded-lg p-6 max-w-4xl w-full max-h-90vh overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-black text-yellow-400">
                        <i class="fas fa-chart-line mr-2"></i>
                        MESURES ÉLECTRIQUES PVSERV
                    </h2>
                    <button id="closeMeasuresModal" class="text-2xl text-gray-400 hover:text-white">×</button>
                </div>
                
                <!-- Upload section -->
                <div id="uploadSection" class="mb-6">
                    <div class="bg-gray-800 rounded-lg p-6 border border-gray-600">
                        <h3 class="text-lg font-bold mb-4">IMPORT FICHIER PVSERV</h3>
                        
                        <div class="flex items-center space-x-4 mb-4">
                            <input type="file" id="pvservFile" accept=".txt,.log" class="hidden">
                            <button onclick="document.getElementById('pvservFile').click()" 
                                    class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold">
                                <i class="fas fa-upload mr-2"></i>CHARGER FICHIER .TXT
                            </button>
                            <span id="pvservFileName" class="text-gray-400"></span>
                        </div>
                        
                        <div class="text-sm text-gray-400">
                            <p><strong>Format attendu:</strong> LAB/HP 31500/Mod 6298 S.Nr.: 23.44.1286 Nr. 1 FF 0,957 Rds 17,20 Uf 772 bright U I 212 0,00 339 0,00</p>
                            <p><strong>Données extraites:</strong> FF (Fill Factor), Rds (Résistance série), Uf (Tension), Courbes I-V</p>
                        </div>
                    </div>
                </div>
                
                <!-- Results section -->
                <div id="resultsSection" class="hidden">
                    <div id="parsingSummary" class="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-600">
                        <!-- Summary will be inserted here -->
                    </div>
                    
                    <div id="measurementsTable">
                        <!-- Table will be inserted here -->
                    </div>
                    
                    <div class="flex space-x-3 mt-6">
                        <button id="saveMeasuresBtn" class="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold">
                            <i class="fas fa-save mr-2"></i>SAUVEGARDER MESURES
                        </button>
                        <button id="exportMeasuresBtn" class="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold">
                            <i class="fas fa-download mr-2"></i>EXPORT EXCEL
                        </button>
                        <button id="clearMeasuresBtn" class="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold">
                            <i class="fas fa-trash mr-2"></i>EFFACER
                        </button>
                    </div>
                </div>
                
                <!-- Error section -->
                <div id="errorSection" class="hidden bg-red-900 border border-red-600 rounded-lg p-4">
                    <h4 class="font-bold text-red-400 mb-2">ERREURS PARSING</h4>
                    <div id="errorsList"></div>
                </div>
            </div>
        `
        
        document.body.appendChild(modal)
    }

    setupEventListeners() {
        // Ouverture modal
        const measureBtn = document.getElementById('measureBtn')
        if (measureBtn) {
            measureBtn.addEventListener('click', () => this.showModal())
        }

        // Fermeture modal
        document.getElementById('closeMeasuresModal').addEventListener('click', () => this.hideModal())
        document.getElementById('measuresModal').addEventListener('click', (e) => {
            if (e.target.id === 'measuresModal') {
                this.hideModal()
            }
        })

        // Upload fichier
        document.getElementById('pvservFile').addEventListener('change', (e) => this.handleFileUpload(e))
        
        // Actions boutons
        document.getElementById('saveMeasuresBtn').addEventListener('click', () => this.saveMeasures())
        document.getElementById('exportMeasuresBtn').addEventListener('click', () => this.exportMeasures())
        document.getElementById('clearMeasuresBtn').addEventListener('click', () => this.clearMeasures())
    }

    showModal() {
        document.getElementById('measuresModal').classList.remove('hidden')
        this.loadExistingMeasures()
    }

    hideModal() {
        document.getElementById('measuresModal').classList.add('hidden')
    }

    async loadExistingMeasures() {
        try {
            const response = await fetch(`/api/audit/${this.auditToken}/measurements`)
            if (response.ok) {
                const data = await response.json()
                if (data.measurements && data.measurements.length > 0) {
                    this.displayExistingMeasures(data.measurements)
                }
            }
        } catch (error) {
            console.log('Aucune mesure existante trouvée')
        }
    }

    displayExistingMeasures(measurements) {
        const summary = this.calculateMeasurementsSummary(measurements)
        
        document.getElementById('parsingSummary').innerHTML = `
            <h4 class="font-bold text-green-400 mb-2">MESURES CHARGÉES</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-400">${summary.total}</div>
                    <div class="text-sm">Total</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-400">${summary.bright}</div>
                    <div class="text-sm">Bright</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-400">${summary.dark}</div>
                    <div class="text-sm">Dark</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-yellow-400">${summary.avgFF}</div>
                    <div class="text-sm">FF Moyen</div>
                </div>
            </div>
        `
        
        this.displayMeasurementsTable(measurements)
        document.getElementById('resultsSection').classList.remove('hidden')
    }

    async handleFileUpload(event) {
        const file = event.target.files[0]
        if (!file) return

        // Validation fichier
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.log')) {
            this.showAlert('Format fichier non supporté. Utilisez .txt ou .log', 'error')
            return
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB max
            this.showAlert('Fichier trop volumineux. Maximum 5MB', 'error')
            return
        }

        document.getElementById('pvservFileName').textContent = `📄 ${file.name}`

        try {
            // Lecture contenu fichier
            const content = await this.readFileContent(file)
            
            // Parsing PVserv
            const results = await this.parsePVservContent(content)
            
            // Affichage résultats
            this.displayResults(results)
            
        } catch (error) {
            console.error('Erreur traitement fichier:', error)
            this.showAlert('Erreur traitement fichier: ' + error.message, 'error')
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = e => resolve(e.target.result)
            reader.onerror = () => reject(new Error('Erreur lecture fichier'))
            reader.readAsText(file)
        })
    }

    async parsePVservContent(content) {
        // Appel API parsing côté serveur pour plus de robustesse
        const response = await fetch(`/api/audit/${this.auditToken}/parse-pvserv`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        })

        if (!response.ok) {
            throw new Error('Erreur parsing serveur')
        }

        return await response.json()
    }

    displayResults(results) {
        // Masquer section upload, afficher résultats
        document.getElementById('uploadSection').style.display = 'none'
        document.getElementById('resultsSection').classList.remove('hidden')

        // Summary
        const summary = results.summary
        document.getElementById('parsingSummary').innerHTML = `
            <h4 class="font-bold text-green-400 mb-2">PARSING TERMINÉ</h4>
            <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-400">${summary.totalMeasurements}</div>
                    <div class="text-sm">Total</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-400">${summary.brightMeasurements}</div>
                    <div class="text-sm">Bright</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-400">${summary.darkMeasurements}</div>
                    <div class="text-sm">Dark</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-yellow-400">${summary.averageFF}</div>
                    <div class="text-sm">FF Moyen</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-orange-400">${summary.cellBreaks}</div>
                    <div class="text-sm">Cell Breaks</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold ${summary.validMeasurements === summary.totalMeasurements ? 'text-green-400' : 'text-red-400'}">${summary.validMeasurements}</div>
                    <div class="text-sm">Valides</div>
                </div>
            </div>
        `

        // Table mesures
        this.displayMeasurementsTable(results.measurements)
        
        // Erreurs si présentes
        if (results.errors && results.errors.length > 0) {
            this.displayErrors(results.errors)
        }

        // Sauvegarde temporaire pour actions
        this.measurements = results.measurements
    }

    displayMeasurementsTable(measurements) {
        const validMeasurements = measurements.filter(m => m.type === 'measurement')
        
        if (validMeasurements.length === 0) {
            document.getElementById('measurementsTable').innerHTML = '<p class="text-gray-400">Aucune mesure valide trouvée</p>'
            return
        }

        let html = `
            <div class="bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-700">
                            <tr>
                                <th class="px-4 py-3 text-left font-bold">Module</th>
                                <th class="px-4 py-3 text-left font-bold">Type</th>
                                <th class="px-4 py-3 text-left font-bold">FF</th>
                                <th class="px-4 py-3 text-left font-bold">Rds (Ω)</th>
                                <th class="px-4 py-3 text-left font-bold">Uf (V)</th>
                                <th class="px-4 py-3 text-left font-bold">Points IV</th>
                                <th class="px-4 py-3 text-left font-bold">Statut</th>
                            </tr>
                        </thead>
                        <tbody>
        `

        validMeasurements.forEach((m, index) => {
            const rowClass = index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
            const statusClass = m.valid ? 'text-green-400' : 'text-red-400'
            const statusIcon = m.valid ? '✓' : '✗'
            
            html += `
                <tr class="${rowClass}">
                    <td class="px-4 py-3">M${m.moduleNumber?.toString().padStart(3, '0') || '???'}</td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-1 rounded text-xs ${m.measurementType === 'bright' ? 'bg-blue-600' : 'bg-purple-600'}">
                            ${m.measurementType?.toUpperCase() || 'N/A'}
                        </span>
                    </td>
                    <td class="px-4 py-3">${m.ff?.toFixed(3) || 'N/A'}</td>
                    <td class="px-4 py-3">${m.rds?.toFixed(2) || 'N/A'}</td>
                    <td class="px-4 py-3">${m.uf || 'N/A'}</td>
                    <td class="px-4 py-3">${m.ivCurve?.count || 0}</td>
                    <td class="px-4 py-3 ${statusClass}">${statusIcon}</td>
                </tr>
            `
        })

        // Cell breaks
        const cellBreaks = measurements.filter(m => m.type === 'cell_break')
        cellBreaks.forEach(cb => {
            html += `
                <tr class="bg-red-900">
                    <td colspan="7" class="px-4 py-3">
                        <span class="text-red-400 font-bold">⚠️ CELL BREAK DÉTECTÉ</span>
                        - Ligne ${cb.lineNumber}
                    </td>
                </tr>
            `
        })

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `

        document.getElementById('measurementsTable').innerHTML = html
    }

    displayErrors(errors) {
        document.getElementById('errorSection').classList.remove('hidden')
        
        const errorsList = document.getElementById('errorsList')
        errorsList.innerHTML = errors.map(error => `
            <div class="mb-2">
                <strong>Ligne ${error.line}:</strong> ${error.error}
                <div class="text-xs text-gray-400 mt-1">${error.content}</div>
            </div>
        `).join('')
    }

    async saveMeasures() {
        if (!this.measurements || this.measurements.length === 0) {
            this.showAlert('Aucune mesure à sauvegarder', 'warning')
            return
        }

        try {
            const response = await fetch(`/api/audit/${this.auditToken}/save-measurements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ measurements: this.measurements })
            })

            if (!response.ok) {
                throw new Error('Erreur sauvegarde')
            }

            this.showAlert('Mesures sauvegardées avec succès', 'success')
            
        } catch (error) {
            console.error('Erreur sauvegarde mesures:', error)
            this.showAlert('Erreur sauvegarde: ' + error.message, 'error')
        }
    }

    exportMeasures() {
        if (!this.measurements || this.measurements.length === 0) {
            this.showAlert('Aucune mesure à exporter', 'warning')
            return
        }

        // Génération CSV pour Excel
        const csv = this.generateCSV(this.measurements)
        
        // Téléchargement
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pvserv_measures_${this.auditToken}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        this.showAlert('Export CSV généré', 'success')
    }

    generateCSV(measurements) {
        const validMeasurements = measurements.filter(m => m.type === 'measurement')
        
        let csv = 'Module,Type,FF,Rds,Uf,Points_IV,Valide,Ligne_Source\n'
        
        validMeasurements.forEach(m => {
            csv += `M${m.moduleNumber?.toString().padStart(3, '0') || ''},${m.measurementType || ''},${m.ff || ''},${m.rds || ''},${m.uf || ''},${m.ivCurve?.count || 0},${m.valid ? 'OUI' : 'NON'},${m.lineNumber || ''}\n`
        })

        return csv
    }

    clearMeasures() {
        if (confirm('Effacer toutes les mesures chargées ?')) {
            this.measurements = []
            document.getElementById('uploadSection').style.display = 'block'
            document.getElementById('resultsSection').classList.add('hidden')
            document.getElementById('errorSection').classList.add('hidden')
            document.getElementById('pvservFile').value = ''
            document.getElementById('pvservFileName').textContent = ''
        }
    }

    calculateMeasurementsSummary(measurements) {
        const validMeasurements = measurements.filter(m => m.ff && m.rds && m.uf)
        
        return {
            total: measurements.length,
            bright: measurements.filter(m => m.measurement_type === 'bright').length,
            dark: measurements.filter(m => m.measurement_type === 'dark').length,
            avgFF: validMeasurements.length > 0 
                ? (validMeasurements.reduce((sum, m) => sum + parseFloat(m.ff), 0) / validMeasurements.length).toFixed(3)
                : '0.000'
        }
    }

    showAlert(message, type = 'info') {
        // Utilise la fonction showAlert globale si disponible
        if (window.diagpvAudit && window.diagpvAudit.showAlert) {
            window.diagpvAudit.showAlert(message, type)
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`)
            alert(message)
        }
    }
}

// Initialisation automatique si audit présent
document.addEventListener('DOMContentLoaded', () => {
    const auditToken = document.body.dataset.auditToken
    if (auditToken) {
        window.diagpvMeasures = new DiagPVMeasures(auditToken)
        console.log('📊 DiagPV Measures Interface Initialized')
    }
})

// Export
window.DiagPVMeasures = DiagPVMeasures