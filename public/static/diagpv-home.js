// DiagPV Home - Page d'accueil gestion audits cloud
// Objectif : Liste et gestion de tous les audits accessibles depuis n'importe quel appareil

class DiagPVHome {
    constructor() {
        this.hubApiUrl = 'https://diagnostic-hub.pages.dev'
        this.technicianId = this.getTechnicianId()
        this.technicianName = this.getTechnicianName()
        this.audits = []
        this.filteredAudits = []
        
        this.init()
    }

    async init() {
        console.log('🏠 DiagPV Home - Technicien:', this.technicianName, this.technicianId)
        
        // Afficher nom technicien
        document.getElementById('technicianName').textContent = this.technicianName
        
        // Charger audits
        await this.loadAudits()
        
        // Setup event listeners pour calcul automatique
        this.setupFormListeners()
    }
    
    setupFormListeners() {
        const stringCount = document.getElementById('inputStringCount')
        const modulesPerString = document.getElementById('inputModulesPerString')
        
        if (stringCount) {
            stringCount.addEventListener('input', () => this.updateTotalModules())
        }
        if (modulesPerString) {
            modulesPerString.addEventListener('input', () => this.updateTotalModules())
        }
    }

    // =============================================================================
    // GESTION IDENTITÉ TECHNICIEN
    // =============================================================================

    getTechnicianId() {
        let id = localStorage.getItem('diagpv_technician_id')
        if (!id) {
            id = 'tech-' + Math.random().toString(36).substring(2, 15)
            localStorage.setItem('diagpv_technician_id', id)
        }
        return id
    }

    getTechnicianName() {
        let name = localStorage.getItem('diagpv_technician_name')
        if (!name) {
            name = prompt('👤 Quel est votre nom/prénom ?', 'Technicien') || 'Technicien'
            localStorage.setItem('diagpv_technician_name', name)
        }
        return name
    }

    showSettings() {
        const newName = prompt('👤 Modifier votre nom :', this.technicianName)
        if (newName && newName.trim()) {
            this.technicianName = newName.trim()
            localStorage.setItem('diagpv_technician_name', this.technicianName)
            document.getElementById('technicianName').textContent = this.technicianName
            this.showAlert('Nom mis à jour : ' + this.technicianName, 'success')
        }
    }

    // =============================================================================
    // CHARGEMENT AUDITS CLOUD
    // =============================================================================

    async loadAudits() {
        try {
            console.log('📡 Chargement audits depuis cloud...')
            
            const response = await axios.get(
                `${this.hubApiUrl}/api/audits/list/${this.technicianId}`
            )

            if (response.data.success) {
                this.audits = response.data.audits || []
                this.filteredAudits = [...this.audits]
                
                console.log(`✅ ${this.audits.length} audits chargés`)
                
                this.renderAudits()
                this.updateStats()
            } else {
                throw new Error(response.data.error || 'Erreur chargement audits')
            }
        } catch (error) {
            console.error('❌ Erreur chargement audits:', error)
            
            // Fallback : charger depuis localStorage
            this.loadAuditsFromLocalStorage()
            
            this.showAlert('Mode offline : audits locaux uniquement', 'warning')
        }
    }

    loadAuditsFromLocalStorage() {
        const localAudits = localStorage.getItem('diagpv_audits')
        if (localAudits) {
            try {
                const parsed = JSON.parse(localAudits)
                this.audits = Object.keys(parsed).map(token => {
                    const audit = parsed[token]
                    return {
                        audit_token: token,
                        client_name: audit.clientName || 'Client inconnu',
                        installation_address: audit.installationAddress || '',
                        total_modules: audit.modules?.size || 0,
                        modules_ok: Array.from(audit.modules?.values() || []).filter(m => m.status === 'OK').length,
                        modules_ko: Array.from(audit.modules?.values() || []).filter(m => m.status === 'KO').length,
                        modules_a_revoir: Array.from(audit.modules?.values() || []).filter(m => m.status === 'À REVOIR').length,
                        status: 'en_cours',
                        last_updated: audit.lastUpdated || new Date().toISOString(),
                        owner_technician_name: this.technicianName
                    }
                })
                this.filteredAudits = [...this.audits]
                console.log(`📦 ${this.audits.length} audits locaux chargés`)
            } catch (e) {
                console.error('Erreur parsing localStorage:', e)
                this.audits = []
                this.filteredAudits = []
            }
        } else {
            this.audits = []
            this.filteredAudits = []
        }
        
        this.renderAudits()
        this.updateStats()
    }

    // =============================================================================
    // AFFICHAGE AUDITS
    // =============================================================================

    renderAudits() {
        const container = document.getElementById('auditsList')
        
        if (this.filteredAudits.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-folder-open text-6xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400 text-lg mb-2">Aucun audit trouvé</p>
                    <p class="text-gray-500 text-sm">Créez votre premier audit pour commencer</p>
                </div>
            `
            return
        }

        container.innerHTML = this.filteredAudits.map(audit => {
            const statusConfig = {
                'en_cours': { color: 'yellow', icon: 'hourglass-half', label: 'En Cours' },
                'terminé': { color: 'green', icon: 'check-circle', label: 'Terminé' },
                'archivé': { color: 'gray', icon: 'archive', label: 'Archivé' }
            }
            
            const status = statusConfig[audit.status] || statusConfig['en_cours']
            const progressPercent = audit.total_modules > 0 
                ? Math.round(((audit.modules_ok + audit.modules_ko + audit.modules_a_revoir) / audit.total_modules) * 100) 
                : 0

            return `
                <div class="card-audit bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
                    <div class="p-6">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex-1">
                                <h3 class="text-lg font-bold text-white mb-1">${this.escapeHtml(audit.client_name)}</h3>
                                <p class="text-sm text-gray-400 mb-2">
                                    <i class="fas fa-map-marker-alt mr-1"></i>
                                    ${audit.installation_address || 'Adresse non renseignée'}
                                </p>
                                <p class="text-xs text-gray-500">
                                    <i class="fas fa-calendar mr-1"></i>
                                    ${this.formatDate(audit.last_updated)}
                                </p>
                            </div>
                            <span class="status-badge px-3 py-1 rounded-full text-xs font-semibold bg-${status.color}-900/50 text-${status.color}-400 border border-${status.color}-700">
                                <i class="fas fa-${status.icon} mr-1"></i>${status.label}
                            </span>
                        </div>

                        <!-- Stats modules -->
                        <div class="grid grid-cols-3 gap-2 mb-4">
                            <div class="text-center">
                                <p class="text-2xl font-bold text-green-400">${audit.modules_ok || 0}</p>
                                <p class="text-xs text-gray-400">OK</p>
                            </div>
                            <div class="text-center">
                                <p class="text-2xl font-bold text-red-400">${audit.modules_ko || 0}</p>
                                <p class="text-xs text-gray-400">KO</p>
                            </div>
                            <div class="text-center">
                                <p class="text-2xl font-bold text-orange-400">${audit.modules_a_revoir || 0}</p>
                                <p class="text-xs text-gray-400">À Revoir</p>
                            </div>
                        </div>

                        <!-- Progress bar -->
                        <div class="mb-4">
                            <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
                                <span>Progression</span>
                                <span>${progressPercent}%</span>
                            </div>
                            <div class="w-full bg-gray-700 rounded-full h-2">
                                <div class="bg-blue-500 h-2 rounded-full transition-all" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center space-x-2">
                            <button onclick="app.openAudit('${audit.audit_token}')" 
                                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm">
                                <i class="fas fa-folder-open mr-2"></i>Ouvrir
                            </button>
                            <button onclick="app.shareAudit('${audit.audit_token}')" 
                                    class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg transition-all">
                                <i class="fas fa-share-alt"></i>
                            </button>
                            <button onclick="app.deleteAudit('${audit.audit_token}')" 
                                    class="bg-gray-700 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg transition-all">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Footer info -->
                    <div class="bg-gray-900/50 px-6 py-3 border-t border-gray-700">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-gray-400">
                                <i class="fas fa-solar-panel mr-1"></i>
                                ${audit.total_modules || 0} modules
                            </span>
                            <span class="text-gray-400">
                                <i class="fas fa-user mr-1"></i>
                                ${this.escapeHtml(audit.owner_technician_name || 'Technicien')}
                            </span>
                        </div>
                    </div>
                </div>
            `
        }).join('')
    }

    updateStats() {
        const total = this.audits.length
        const enCours = this.audits.filter(a => a.status === 'en_cours').length
        const termines = this.audits.filter(a => a.status === 'terminé').length
        const modulesOk = this.audits.reduce((sum, a) => sum + (a.modules_ok || 0), 0)

        document.getElementById('statTotal').textContent = total
        document.getElementById('statEnCours').textContent = enCours
        document.getElementById('statTermines').textContent = termines
        document.getElementById('statModulesOk').textContent = modulesOk
    }

    // =============================================================================
    // FILTRAGE / RECHERCHE
    // =============================================================================

    filterAudits(query) {
        query = query.toLowerCase().trim()
        
        if (!query) {
            this.filteredAudits = [...this.audits]
        } else {
            this.filteredAudits = this.audits.filter(audit => 
                audit.client_name?.toLowerCase().includes(query) ||
                audit.audit_token?.toLowerCase().includes(query) ||
                audit.installation_address?.toLowerCase().includes(query)
            )
        }
        
        this.renderAudits()
    }

    // =============================================================================
    // GESTION FORMULAIRE AVANCÉ - STRINGS
    // =============================================================================

    updateTotalModules() {
        if (this.isAdvancedMode) {
            this.updateAdvancedTotal()
        } else {
            const stringCount = parseInt(document.getElementById('inputStringCount').value) || 0
            const modulesPerString = parseInt(document.getElementById('inputModulesPerString').value) || 0
            const total = stringCount * modulesPerString
            
            const calcElement = document.getElementById('totalModulesCalc')
            if (calcElement) {
                calcElement.textContent = `${total} modules`
            }

            // Validation limites
            if (total > 20000) {
                this.showAlert('Attention: Maximum 20 000 modules supportés', 'warning')
            }
        }
    }

    toggleAdvancedConfig() {
        const simpleConfig = document.getElementById('simpleConfig')
        const advancedConfig = document.getElementById('advancedConfig')
        const btnAdvanced = document.getElementById('btnAdvancedConfig')

        this.isAdvancedMode = !this.isAdvancedMode

        if (this.isAdvancedMode) {
            // Passer en mode avancé
            simpleConfig.classList.add('hidden')
            advancedConfig.classList.remove('hidden')
            
            // Initialiser avec la configuration actuelle si elle existe
            this.initializeAdvancedFromSimple()
        } else {
            // Retour mode simple
            simpleConfig.classList.remove('hidden')
            advancedConfig.classList.add('hidden')
        }

        this.updateTotalModules()
    }

    initializeAdvancedFromSimple() {
        const stringCount = parseInt(document.getElementById('inputStringCount').value) || 0
        const modulesPerString = parseInt(document.getElementById('inputModulesPerString').value) || 0

        // Vider la configuration avancée actuelle
        this.advancedStrings = []
        
        // Si des valeurs existent en mode simple, les convertir
        if (stringCount > 0 && modulesPerString > 0) {
            for (let i = 1; i <= stringCount; i++) {
                this.advancedStrings.push({
                    id: i,
                    mpptNumber: i,
                    stringNumber: 1,
                    moduleCount: modulesPerString
                })
            }
        } else {
            // Sinon, ajouter une string par défaut
            this.addStringConfig()
        }

        this.renderAdvancedStrings()
    }

    addStringConfig() {
        const newId = this.advancedStrings.length + 1
        this.advancedStrings.push({
            id: newId,
            mpptNumber: newId,
            stringNumber: 1,
            moduleCount: 24 // Valeur par défaut
        })

        this.renderAdvancedStrings()
        this.updateAdvancedTotal()
    }

    removeStringConfig(stringId) {
        this.advancedStrings = this.advancedStrings.filter(s => s.id !== stringId)
        this.renderAdvancedStrings()
        this.updateAdvancedTotal()
    }

    renderAdvancedStrings() {
        const container = document.getElementById('advancedStringsList')
        
        if (!container) return
        
        container.innerHTML = this.advancedStrings.map(string => `
            <div class="flex items-center space-x-2 bg-gray-900 p-2 rounded border border-gray-600">
                <div class="flex-1 grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-xs font-bold mb-1 text-gray-400">MPPT:</label>
                        <input type="number" value="${string.mpptNumber}" min="1" max="100"
                               class="w-full bg-gray-700 text-white border border-gray-500 rounded px-2 py-1 text-sm focus:border-yellow-400 focus:outline-none"
                               onchange="app.updateStringConfig(${string.id}, 'mpptNumber', this.value)">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-gray-400">Chaîne:</label>
                        <input type="number" value="${string.stringNumber}" min="1" max="10"
                               class="w-full bg-gray-700 text-white border border-gray-500 rounded px-2 py-1 text-sm focus:border-yellow-400 focus:outline-none"
                               onchange="app.updateStringConfig(${string.id}, 'stringNumber', this.value)">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-gray-400">Modules:</label>
                        <input type="number" value="${string.moduleCount}" min="1" max="50"
                               class="w-full bg-gray-700 text-white border border-gray-500 rounded px-2 py-1 text-sm focus:border-yellow-400 focus:outline-none"
                               onchange="app.updateStringConfig(${string.id}, 'moduleCount', this.value)">
                    </div>
                </div>
                <button type="button" 
                        class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs font-bold h-8"
                        onclick="app.removeStringConfig(${string.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('')
    }

    updateStringConfig(stringId, field, value) {
        const string = this.advancedStrings.find(s => s.id === stringId)
        if (string) {
            string[field] = parseInt(value) || 0
            this.updateAdvancedTotal()
        }
    }

    updateAdvancedTotal() {
        const total = this.advancedStrings.reduce((sum, string) => sum + string.moduleCount, 0)
        const advancedTotalElement = document.getElementById('advancedTotalModules')
        
        if (advancedTotalElement) {
            advancedTotalElement.textContent = `${total} modules (${this.advancedStrings.length} strings)`
        }

        // Validation limites
        if (total > 20000) {
            this.showAlert('Attention: Maximum 20 000 modules supportés', 'warning')
        }
    }

    loadExampleConfig() {
        // Configuration exemple JALIBAT : MPPT 1: 26 modules, MPPT 2-10: 24 modules chacun
        this.advancedStrings = [
            { id: 1, mpptNumber: 1, stringNumber: 1, moduleCount: 26 },
            { id: 2, mpptNumber: 2, stringNumber: 1, moduleCount: 24 },
            { id: 3, mpptNumber: 3, stringNumber: 1, moduleCount: 24 },
            { id: 4, mpptNumber: 4, stringNumber: 1, moduleCount: 24 },
            { id: 5, mpptNumber: 5, stringNumber: 1, moduleCount: 24 },
            { id: 6, mpptNumber: 6, stringNumber: 1, moduleCount: 24 },
            { id: 7, mpptNumber: 7, stringNumber: 1, moduleCount: 24 },
            { id: 8, mpptNumber: 8, stringNumber: 1, moduleCount: 24 },
            { id: 9, mpptNumber: 9, stringNumber: 1, moduleCount: 24 },
            { id: 10, mpptNumber: 10, stringNumber: 1, moduleCount: 24 }
        ]

        // Passer en mode avancé si ce n'est pas déjà fait
        if (!this.isAdvancedMode) {
            this.toggleAdvancedConfig()
        }

        this.renderAdvancedStrings()
        this.updateAdvancedTotal()

        const total = this.advancedStrings.reduce((sum, s) => sum + s.moduleCount, 0)
        this.showAlert(`Configuration exemple JALIBAT chargée : ${total} modules (MPPT1: 26, MPPT2-10: 24)`, 'success')
    }

    // =============================================================================
    // CRÉATION NOUVEL AUDIT
    // =============================================================================

    createNewAudit() {
        // Réinitialiser le mode lors de l'ouverture
        this.isAdvancedMode = false
        this.advancedStrings = []
        document.getElementById('modalNewAudit').classList.remove('hidden')
        
        // Réinitialiser l'affichage
        const simpleConfig = document.getElementById('simpleConfig')
        const advancedConfig = document.getElementById('advancedConfig')
        if (simpleConfig) simpleConfig.classList.remove('hidden')
        if (advancedConfig) advancedConfig.classList.add('hidden')
    }

    closeModal() {
        document.getElementById('modalNewAudit').classList.add('hidden')
        document.getElementById('formNewAudit').reset()
        this.isAdvancedMode = false
        this.advancedStrings = []
    }

    async submitNewAudit(event) {
        event.preventDefault()
        
        const clientName = document.getElementById('inputClientName').value.trim()
        const address = document.getElementById('inputAddress').value.trim()
        const powerKwc = parseFloat(document.getElementById('inputPowerKwc').value) || null
        
        // Nouvelles données techniques
        const inverterCount = parseInt(document.getElementById('inputInverterCount').value) || null
        const inverterModel = document.getElementById('inputInverterModel').value.trim() || null
        const junctionBoxCount = parseInt(document.getElementById('inputJunctionBoxCount').value) || null
        
        // Calculer total modules selon mode
        let totalModules = 0
        let stringConfig = null
        
        if (this.isAdvancedMode) {
            // Mode avancé : calculer depuis configuration strings
            totalModules = this.advancedStrings.reduce((sum, s) => sum + s.moduleCount, 0)
            stringConfig = JSON.stringify(this.advancedStrings)
        } else {
            // Mode simple : calculer depuis inputs
            const stringCount = parseInt(document.getElementById('inputStringCount').value) || 0
            const modulesPerString = parseInt(document.getElementById('inputModulesPerString').value) || 0
            totalModules = stringCount * modulesPerString
            
            // Créer config simple
            if (stringCount > 0 && modulesPerString > 0) {
                const simpleConfig = []
                for (let i = 1; i <= stringCount; i++) {
                    simpleConfig.push({
                        id: i,
                        mpptNumber: i,
                        stringNumber: 1,
                        moduleCount: modulesPerString
                    })
                }
                stringConfig = JSON.stringify(simpleConfig)
            }
        }

        if (!clientName || totalModules <= 0) {
            this.showAlert('Client et configuration strings requis', 'error')
            return
        }

        // Générer token unique
        const auditToken = this.generateToken()

        try {
            // Créer audit en cloud avec toutes les données
            const response = await axios.post(`${this.hubApiUrl}/api/audits/create`, {
                auditToken,
                clientName,
                installationAddress: address,
                installationPowerKwc: powerKwc,
                inverterCount,
                inverterModel,
                junctionBoxCount,
                stringConfig,
                auditType: 'electroluminescence',
                totalModules,
                ownerTechnicianId: this.technicianId,
                ownerTechnicianName: this.technicianName
            })

            if (response.data.success) {
                this.showAlert('✅ Audit créé avec succès !', 'success')
                this.closeModal()
                
                // Ouvrir audit
                setTimeout(() => {
                    window.location.href = `/audit.html?token=${auditToken}`
                }, 1000)
            } else {
                throw new Error(response.data.error || 'Erreur création')
            }
        } catch (error) {
            console.error('❌ Erreur création audit:', error)
            
            // Fallback : créer en local uniquement
            this.createAuditLocalOnly(auditToken, clientName, address, totalModules, stringConfig)
        }
    }

    createAuditLocalOnly(token, clientName, address, totalModules, stringConfig = null) {
        const audit = {
            token,
            clientName,
            installationAddress: address,
            totalModules,
            stringConfig: stringConfig ? JSON.parse(stringConfig) : null,
            modules: new Map(),
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        }

        // Initialiser modules
        for (let i = 1; i <= totalModules; i++) {
            const moduleId = 'M' + String(i).padStart(3, '0')
            audit.modules.set(moduleId, {
                id: moduleId,
                status: 'Non testé',
                comment: null,
                string: null
            })
        }

        // Sauvegarder localStorage
        const audits = JSON.parse(localStorage.getItem('diagpv_audits') || '{}')
        audits[token] = audit
        localStorage.setItem('diagpv_audits', JSON.stringify(audits))

        this.showAlert('✅ Audit créé (mode offline)', 'success')
        this.closeModal()

        setTimeout(() => {
            window.location.href = `/audit.html?token=${token}`
        }, 1000)
    }

    generateToken() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
        })
    }

    // =============================================================================
    // ACTIONS AUDIT
    // =============================================================================

    openAudit(token) {
        window.location.href = `/audit.html?token=${token}`
    }

    async shareAudit(token) {
        const shareUrl = `${window.location.origin}/audit.html?token=${token}`
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'DiagPV - Partage Audit',
                    text: `Accéder à l'audit DiagPV`,
                    url: shareUrl
                })
            } catch (e) {
                this.copyToClipboard(shareUrl)
            }
        } else {
            this.copyToClipboard(shareUrl)
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showAlert('✅ Lien copié dans le presse-papier', 'success')
        }).catch(() => {
            prompt('Copier ce lien :', text)
        })
    }

    async deleteAudit(token) {
        if (!confirm('⚠️ Archiver cet audit ?')) return

        try {
            await axios.delete(`${this.hubApiUrl}/api/audits/${token}`)
            this.showAlert('✅ Audit archivé', 'success')
            await this.loadAudits()
        } catch (error) {
            console.error('Erreur archivage:', error)
            this.showAlert('❌ Erreur archivage', 'error')
        }
    }

    // =============================================================================
    // UTILITAIRES
    // =============================================================================

    formatDate(dateStr) {
        if (!dateStr) return 'Date inconnue'
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'À l\'instant'
        if (diffMins < 60) return `Il y a ${diffMins} min`
        if (diffHours < 24) return `Il y a ${diffHours}h`
        if (diffDays < 7) return `Il y a ${diffDays}j`
        
        return date.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        })
    }

    escapeHtml(text) {
        if (!text) return ''
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    showAlert(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-orange-500',
            info: 'bg-blue-500'
        }

        const alert = document.createElement('div')
        alert.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse`
        alert.textContent = message

        document.body.appendChild(alert)

        setTimeout(() => {
            alert.remove()
        }, 3000)
    }
}

// Initialisation
const app = new DiagPVHome()
