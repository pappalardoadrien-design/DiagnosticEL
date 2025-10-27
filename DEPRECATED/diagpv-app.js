// DiagPV Audit EL - JavaScript principal interface création
// Optimisé pour usage terrain nocturne + tablette tactile

class DiagPVApp {
    constructor() {
        this.init()
        this.setupEventListeners()
        this.loadRecentAudits()
    }

    init() {
        // Auto-remplissage date du jour
        const today = new Date().toISOString().split('T')[0]
        document.getElementById('auditDate').value = today

        // Calcul automatique total modules
        this.updateTotalModules()
        
        console.log('DiagPV App initialisée')
    }

    setupEventListeners() {
        const form = document.getElementById('createAuditForm')
        const stringCount = document.getElementById('stringCount')
        const modulesPerString = document.getElementById('modulesPerString')
        const planFile = document.getElementById('planFile')

        // Calcul temps réel total modules
        stringCount.addEventListener('input', () => this.updateTotalModules())
        modulesPerString.addEventListener('input', () => this.updateTotalModules())

        // Gestion upload plan
        planFile.addEventListener('change', (e) => this.handlePlanUpload(e))

        // Soumission formulaire création audit
        form.addEventListener('submit', (e) => this.createAudit(e))

        // Configuration avancée
        const toggleAdvancedBtn = document.getElementById('toggleAdvancedConfig')
        const addStringBtn = document.getElementById('addStringBtn')
        const loadExampleBtn = document.getElementById('loadExampleConfig')

        toggleAdvancedBtn.addEventListener('click', () => this.toggleAdvancedConfig())
        addStringBtn.addEventListener('click', () => this.addStringConfig())
        loadExampleBtn.addEventListener('click', () => this.loadExampleMPPTConfig())

        // Initialisation avec une string par défaut en mode avancé
        this.advancedStrings = []
        this.isAdvancedMode = false

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => this.handleKeyboard(e))
    }

    updateTotalModules() {
        if (this.isAdvancedMode) {
            // En mode avancé, calcul basé sur la configuration des strings
            this.updateAdvancedTotal()
        } else {
            // Mode simple
            const stringCount = parseInt(document.getElementById('stringCount').value) || 0
            const modulesPerString = parseInt(document.getElementById('modulesPerString').value) || 0
            const total = stringCount * modulesPerString
            
            document.getElementById('totalModules').textContent = total

            // Validation limites
            if (total > 20000) {
                this.showAlert('Attention: Maximum 20 000 modules supportés', 'warning')
            }
        }
    }

    toggleAdvancedConfig() {
        const simpleConfig = document.getElementById('simpleConfig')
        const advancedConfig = document.getElementById('advancedConfig')
        const toggleBtn = document.getElementById('toggleAdvancedConfig')

        this.isAdvancedMode = !this.isAdvancedMode

        if (this.isAdvancedMode) {
            // Passer en mode avancé
            simpleConfig.classList.add('hidden')
            advancedConfig.classList.remove('hidden')
            toggleBtn.innerHTML = '<i class="fas fa-arrow-left mr-2"></i>RETOUR CONFIGURATION SIMPLE'
            toggleBtn.className = 'bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-bold text-sm'
            
            // Initialiser avec la configuration actuelle si elle existe
            this.initializeAdvancedFromSimple()
        } else {
            // Retour mode simple
            simpleConfig.classList.remove('hidden')
            advancedConfig.classList.add('hidden')
            toggleBtn.innerHTML = '<i class="fas fa-cog mr-2"></i>CONFIGURATION AVANCÉE (Strings différents)'
            toggleBtn.className = 'bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-bold text-sm'
        }

        this.updateTotalModules()
    }

    initializeAdvancedFromSimple() {
        const stringCount = parseInt(document.getElementById('stringCount').value) || 0
        const modulesPerString = parseInt(document.getElementById('modulesPerString').value) || 0

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
            moduleCount: 24 // Valeur par défaut basée sur votre exemple
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
        const container = document.getElementById('stringsList')
        
        container.innerHTML = this.advancedStrings.map(string => `
            <div class="flex items-center space-x-3 bg-gray-800 p-3 rounded border border-gray-600">
                <div class="flex-1 grid grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-bold mb-1 text-gray-300">MPPT N°:</label>
                        <input type="number" value="${string.mpptNumber}" min="1" max="100"
                               class="w-full bg-black border border-gray-500 rounded px-2 py-1 text-sm focus:border-yellow-400 focus:outline-none"
                               onchange="diagpvApp.updateStringConfig(${string.id}, 'mpptNumber', this.value)">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-gray-300">Chaîne N°:</label>
                        <input type="number" value="${string.stringNumber}" min="1" max="10"
                               class="w-full bg-black border border-gray-500 rounded px-2 py-1 text-sm focus:border-yellow-400 focus:outline-none"
                               onchange="diagpvApp.updateStringConfig(${string.id}, 'stringNumber', this.value)">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1 text-gray-300">Modules:</label>
                        <input type="number" value="${string.moduleCount}" min="1" max="50"
                               class="w-full bg-black border border-gray-500 rounded px-2 py-1 text-sm focus:border-yellow-400 focus:outline-none"
                               onchange="diagpvApp.updateStringConfig(${string.id}, 'moduleCount', this.value)">
                    </div>
                </div>
                <button type="button" 
                        class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs font-bold"
                        onclick="diagpvApp.removeStringConfig(${string.id})">
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
        const advancedTotalElement = document.getElementById('advancedTotal')
        
        if (advancedTotalElement) {
            advancedTotalElement.textContent = `${total} modules (${this.advancedStrings.length} strings)`
        }

        // Validation limites
        if (total > 20000) {
            this.showAlert('Attention: Maximum 20 000 modules supportés', 'warning')
        }
    }

    loadExampleMPPTConfig() {
        // Configuration exemple basée sur les données fournies
        // MPPT 1: 26 modules, MPPT 2-10: 24 modules chacun
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
        this.showAlert(`Configuration exemple chargée : ${total} modules (MPPT1: 26, MPPT2-10: 24 chacun)`, 'success')
    }

    handlePlanUpload(event) {
        const file = event.target.files[0]
        if (!file) return

        // Validation fichier
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
        if (!validTypes.includes(file.type)) {
            this.showAlert('Format non supporté. Utilisez PDF, PNG ou JPG', 'error')
            event.target.value = ''
            return
        }

        // Validation taille (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showAlert('Fichier trop volumineux. Maximum 10MB', 'error')
            event.target.value = ''
            return
        }

        // Affichage nom fichier
        document.getElementById('planFileName').textContent = `✅ ${file.name}`
        
        console.log('Plan uploadé:', file.name, 'Taille:', (file.size / 1024 / 1024).toFixed(1) + 'MB')
    }

    async createAudit(event) {
        event.preventDefault()

        console.log('🚀 createAudit démarré')

        // Déclaration variables en dehors du try pour accès dans finally
        let submitBtn = null
        let originalText = null

        try {
            // Validation formulaire
            const projectName = document.getElementById('projectName').value.trim()
            const clientName = document.getElementById('clientName').value.trim()
            const location = document.getElementById('location').value.trim()
            const auditDate = document.getElementById('auditDate').value

            console.log('📝 Données formulaire:', { projectName, clientName, location, auditDate })

            if (!projectName || !clientName || !location || !auditDate) {
                this.showAlert('Tous les champs sont obligatoires', 'error')
                return
            }

            // Configuration ou plan
            const planFile = document.getElementById('planFile').files[0]
            let configurationData = null
            let totalModules = 0

            if (this.isAdvancedMode) {
                // Mode configuration avancée
                if (this.advancedStrings.length === 0) {
                    this.showAlert('Aucune string configurée en mode avancé', 'error')
                    return
                }

                configurationData = {
                    mode: 'advanced',
                    strings: this.advancedStrings,
                    totalModules: this.advancedStrings.reduce((sum, s) => sum + s.moduleCount, 0),
                    stringCount: this.advancedStrings.length
                }
                totalModules = configurationData.totalModules

                console.log('⚙️ Configuration avancée:', configurationData)
            } else {
                // Mode simple
                const stringCount = parseInt(document.getElementById('stringCount').value)
                const modulesPerString = parseInt(document.getElementById('modulesPerString').value)

                if (!planFile && (!stringCount || !modulesPerString)) {
                    this.showAlert('Configuration manuelle OU upload plan requis', 'error')
                    return
                }

                configurationData = {
                    mode: 'simple',
                    stringCount: stringCount || 0,
                    modulesPerString: modulesPerString || 0,
                    totalModules: (stringCount || 0) * (modulesPerString || 0)
                }
                totalModules = configurationData.totalModules

                console.log('⚙️ Configuration simple:', configurationData)
            }

            if (!planFile && totalModules === 0) {
                this.showAlert('Configuration requise (modules > 0)', 'error')
                return
            }

            // Affichage loading
            submitBtn = event.target.querySelector('button[type="submit"]')
            originalText = submitBtn.innerHTML
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>CRÉATION EN COURS...'
            submitBtn.disabled = true

            console.log('🔄 Bouton loading activé')

            // Création audit via API
            const auditData = {
                projectName,
                clientName, 
                location,
                auditDate,
                configuration: configurationData
            }

            console.log('📡 Envoi requête API:', auditData)

            const response = await fetch('/api/audit/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(auditData)
            })

            console.log('📥 Réponse reçue, status:', response.status)

            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()
            console.log('✅ Résultat parsé:', result)

            if (!result.success) {
                throw new Error(result.message || 'Erreur création audit')
            }

            // Upload plan si fourni
            if (planFile) {
                console.log('📎 Upload plan démarré')
                await this.uploadPlan(result.auditToken, planFile)
                console.log('📎 Upload plan terminé')
            }

            // Sauvegarde local pour audits récents
            console.log('💾 Sauvegarde audit récent')
            this.saveRecentAudit({
                token: result.auditToken,
                projectName,
                clientName,
                location,
                totalModules: result.totalModules,
                createdAt: new Date().toISOString()
            })

            // Redirection vers interface audit
            console.log('🎯 Redirection vers:', result.auditUrl)
            this.showAlert('Audit créé avec succès ! Redirection...', 'success')
            setTimeout(() => {
                window.location.href = result.auditUrl
            }, 1500)

        } catch (error) {
            console.error('❌ Erreur création audit:', error)
            this.showAlert('Erreur: ' + error.message, 'error')
        } finally {
            // Reset bouton
            console.log('🔄 Reset bouton')
            if (!submitBtn) {
                submitBtn = event.target.querySelector('button[type="submit"]')
            }
            if (submitBtn) {
                submitBtn.innerHTML = originalText || '<i class="fas fa-rocket mr-2"></i>CRÉER L\'AUDIT'
                submitBtn.disabled = false
            }
        }
    }

    async uploadPlan(auditToken, planFile) {
        const formData = new FormData()
        formData.append('plan', planFile)

        const response = await fetch(`/api/audit/${auditToken}/upload-plan`, {
            method: 'POST',
            body: formData
        })

        const result = await response.json()
        if (!result.success) {
            throw new Error('Erreur upload plan: ' + result.error)
        }

        console.log('Plan uploadé avec succès:', result.planUrl)
    }

    saveRecentAudit(auditData) {
        let recent = JSON.parse(localStorage.getItem('diagpv_recent_audits') || '[]')
        
        // Ajout en début de liste
        recent.unshift(auditData)
        
        // Limite 10 audits récents
        recent = recent.slice(0, 10)
        
        localStorage.setItem('diagpv_recent_audits', JSON.stringify(recent))
        this.loadRecentAudits()
    }

    async loadRecentAudits() {
        const container = document.getElementById('recentAudits')
        
        try {
            // Récupération depuis l'API
            const response = await fetch('/api/dashboard/audits')
            const data = await response.json()
            
            if (data.success && data.audits && data.audits.length > 0) {
                container.innerHTML = data.audits.map(audit => `
                    <div class="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-yellow-400 cursor-pointer transition-colors"
                         onclick="window.location.href='/audit/${audit.token}'">
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-bold text-lg">${audit.project_name}</h4>
                                <p class="text-gray-300">${audit.client_name} - ${audit.location}</p>
                                <p class="text-sm text-blue-400">
                                    <i class="fas fa-solar-panel mr-1"></i>
                                    ${audit.total_modules} modules (${audit.string_count} strings)
                                </p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-gray-400">${new Date(audit.created_at).toLocaleDateString('fr-FR')}</p>
                                <span class="inline-block px-2 py-1 rounded text-xs ${audit.status === 'created' ? 'bg-green-600' : 'bg-orange-600'}">${audit.status}</span>
                            </div>
                        </div>
                    </div>
                `).join('')
            } else {
                // Fallback vers localStorage si API échoue
                this.loadRecentAuditsFromStorage()
            }
        } catch (error) {
            console.error('Erreur chargement audits:', error)
            // Fallback vers localStorage en cas d'erreur
            this.loadRecentAuditsFromStorage()
        }
    }
    
    loadRecentAuditsFromStorage() {
        const recent = JSON.parse(localStorage.getItem('diagpv_recent_audits') || '[]')
        const container = document.getElementById('recentAudits')

        if (recent.length === 0) {
            container.innerHTML = '<p class="text-gray-400">Aucun audit récent trouvé</p>'
            return
        }

        container.innerHTML = recent.map(audit => `
            <div class="bg-gray-800 rounded-lg p-4 border border-gray-600 hover:border-yellow-400 cursor-pointer transition-colors"
                 onclick="window.location.href='/audit/${audit.token}'">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-lg">${audit.projectName}</h4>
                        <p class="text-gray-300">${audit.clientName} - ${audit.location}</p>
                        <p class="text-sm text-blue-400">${audit.totalModules} modules</p>
                    </div>
                    <div class="text-right text-sm">
                        <p class="text-gray-400">${new Date(audit.createdAt).toLocaleDateString('fr-FR')}</p>
                        <span class="bg-green-600 px-2 py-1 rounded text-xs">
                            <i class="fas fa-play mr-1"></i>Continuer
                        </span>
                    </div>
                </div>
            </div>
        `).join('')
    }

    handleKeyboard(event) {
        // Raccourci Ctrl+N pour nouvel audit
        if (event.ctrlKey && event.key === 'n') {
            event.preventDefault()
            document.getElementById('projectName').focus()
        }

        // Raccourci Échap pour effacer formulaire
        if (event.key === 'Escape') {
            if (confirm('Effacer le formulaire ?')) {
                document.getElementById('createAuditForm').reset()
                this.updateTotalModules()
            }
        }
    }

    showAlert(message, type = 'info') {
        // Suppression ancienne alerte
        const existingAlert = document.querySelector('.diagpv-alert')
        if (existingAlert) {
            existingAlert.remove()
        }

        // Couleurs selon type
        const colors = {
            success: 'bg-green-600 border-green-500',
            error: 'bg-red-600 border-red-500',
            warning: 'bg-yellow-600 border-yellow-500',
            info: 'bg-blue-600 border-blue-500'
        }

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle', 
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        }

        // Création alerte
        const alert = document.createElement('div')
        alert.className = `diagpv-alert fixed top-4 right-4 ${colors[type]} border-2 rounded-lg px-6 py-4 text-white font-bold z-50 max-w-md shadow-lg`
        alert.innerHTML = `
            <div class="flex items-center">
                <i class="${icons[type]} mr-3 text-xl"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-xl hover:text-gray-300">×</button>
            </div>
        `

        document.body.appendChild(alert)

        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove()
            }
        }, 5000)
    }

    // Utilitaire génération token unique
    generateToken() {
        return 'audit_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
    }

    // Validation format email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return re.test(email)
    }

    // Formatage nombres avec séparateurs
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    }
}

// Initialisation app au chargement DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌙 DiagPV Audit EL - Interface Nocturne Initialisée')
    window.diagpvApp = new DiagPVApp()
})

// Gestion offline/online
window.addEventListener('online', () => {
    console.log('✅ Connexion réseau restaurée')
    diagpvApp.showAlert('Connexion réseau restaurée', 'success')
})

window.addEventListener('offline', () => {
    console.log('⚠️ Mode offline activé') 
    diagpvApp.showAlert('Mode offline - Les données seront synchronisées à la reconnexion', 'warning')
})

// Service Worker pour PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.log('SW registration failed:', error))
}

// Export pour usage externe
window.DiagPVApp = DiagPVApp