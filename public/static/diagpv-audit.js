// DiagPV Audit EL - Interface audit terrain nocturne
// Collaboration temps réel + diagnostic modules optimisé tablette tactile

class DiagPVAudit {
    constructor() {
        this.auditToken = document.body.dataset.auditToken
        this.auditData = null
        this.modules = new Map()
        this.currentStringFilter = 'all'
        this.technicianId = this.generateTechnicianId()
        this.technicianName = this.getTechnicianName()
        this.eventSource = null
        this.selectedModule = null
        this.offlineQueue = []
        
        // Propriétés sélection multiple
        this.multiSelectMode = false
        this.selectedModules = new Set()
        this.bulkActionStatus = null
        
        // Propriétés collaboration temps réel v3.3
        this.realtimeEnabled = true
        this.hubApiUrl = 'https://diagnostic-hub.pages.dev'
        this.lastRemoteSync = Date.now()
        this.syncInterval = null
        this.heartbeatInterval = null
        this.activeTechnicians = []
        this.isUpdating = false
        this.isSyncing = false
        
        this.init()
    }

    async init() {
        console.log('🌙 DiagPV Audit Terrain - Token:', this.auditToken)
        
        try {
            await this.loadAuditData()
            this.setupInterface()
            this.setupEventListeners()
            this.setupRealtimeSync()
            this.setupOfflineSupport()
        } catch (error) {
            console.error('Erreur initialisation:', error)
            this.showAlert('Erreur chargement audit: ' + error.message, 'error')
        }
    }

    async loadAuditData() {
        // Charger depuis localStorage au lieu de l'API
        const localData = localStorage.getItem(`diagpv_audit_${this.auditToken}`)
        
        if (!localData) {
            throw new Error('Audit introuvable dans localStorage')
        }

        const data = JSON.parse(localData)
        this.auditData = data.auditData
        
        // Charger les modules depuis l'objet audit
        if (data.modules && Array.isArray(data.modules)) {
            data.modules.forEach((module, index) => {
                // Assurer que chaque module a un ID
                if (!module.id) {
                    module.id = index + 1
                }
                this.modules.set(module.id, module)
            })
        }

        console.log('✅ Audit chargé:', this.auditData.project_name, 'Modules:', this.modules.size)
    }

    // Sauvegarder l'audit dans localStorage
    saveAuditToLocalStorage() {
        try {
            const auditData = {
                auditToken: this.auditToken,
                auditData: this.auditData,
                modules: Array.from(this.modules.values()),
                lastSync: Date.now()
            }
            localStorage.setItem(`diagpv_audit_${this.auditToken}`, JSON.stringify(auditData))
            console.log('💾 Audit sauvegardé dans localStorage')
            
            // Sync cloud automatique toutes les 30s (v3.4)
            this.scheduleCloudSync()
        } catch (error) {
            console.error('❌ Erreur sauvegarde localStorage:', error)
        }
    }

    // ============================================================================
    // SYNCHRONISATION CLOUD AUTOMATIQUE v3.4
    // Objectif : Sauvegarder audit complet en cloud pour accès multi-appareils
    // ============================================================================

    scheduleCloudSync() {
        // Éviter multiples timers
        if (this.cloudSyncTimer) {
            clearTimeout(this.cloudSyncTimer)
        }
        
        // Sync dans 30s
        this.cloudSyncTimer = setTimeout(() => {
            this.syncAuditToCloud()
        }, 30000)
    }

    async syncAuditToCloud() {
        if (!navigator.onLine || this.isSyncing) {
            console.log('⏸️ Cloud sync skipped (offline ou déjà en cours)')
            return
        }

        try {
            this.isSyncing = true
            console.log('☁️ Synchronisation cloud...')

            // Préparer données audit
            const modulesOk = Array.from(this.modules.values()).filter(m => m.status === 'OK').length
            const modulesKo = Array.from(this.modules.values()).filter(m => m.status === 'KO').length
            const modulesARevoir = Array.from(this.modules.values()).filter(m => m.status === 'À REVOIR').length

            const auditPayload = {
                audit: {
                    totalModules: this.modules.size,
                    modulesOk,
                    modulesKo,
                    modulesARevoir
                },
                modules: Array.from(this.modules.values()).map(m => ({
                    id: m.id,
                    string: m.string_number,
                    position: m.position,
                    status: m.status,
                    comment: m.comment,
                    defects: m.defects || [],
                    // Photos stockées localement uniquement (localStorage/IndexedDB)
                    // Pas de sync cloud (trop lourd)
                    technicianId: this.technicianId,
                    technicianName: this.technicianName
                }))
            }

            const response = await fetch(`${this.hubApiUrl}/api/audits/${this.auditToken}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(auditPayload)
            })

            const result = await response.json()

            if (result.success) {
                console.log('✅ Audit synchronisé en cloud')
                this.showAlert('✅ Audit sauvegardé en cloud', 'success', 2000)
            } else {
                throw new Error(result.error || 'Erreur sync cloud')
            }
        } catch (error) {
            console.error('❌ Erreur sync cloud:', error)
            // Ne pas afficher d'alerte pour ne pas gêner l'utilisateur
        } finally {
            this.isSyncing = false
        }
    }

    // ============================================================================
    // FIN SYNCHRONISATION CLOUD
    // ============================================================================

    setupInterface() {
        // Mise à jour titre et informations
        document.getElementById('projectTitle').textContent = this.auditData.project_name
        this.updateProgress()
        this.renderStringNavigation()
        this.renderModulesGrid()
    }

    renderStringNavigation() {
        const nav = document.getElementById('stringNavigation')
        let navHTML = `
            <button class="string-nav-btn ${this.currentStringFilter === 'all' ? 'active' : ''}" 
                    data-string="all">
                TOUS
            </button>
        `

        for (let i = 1; i <= this.auditData.string_count; i++) {
            const stringModules = Array.from(this.modules.values())
                .filter(m => m.string_number === i)
            const completed = stringModules.filter(m => m.status !== 'pending').length
            
            navHTML += `
                <button class="string-nav-btn ${this.currentStringFilter === i ? 'active' : ''}" 
                        data-string="${i}">
                    S${i} (${completed}/${stringModules.length})
                </button>
            `
        }

        nav.innerHTML = navHTML
    }

    renderModulesGrid() {
        const container = document.getElementById('auditContent')
        let gridHTML = ''

        if (this.currentStringFilter === 'all') {
            // Affichage toutes strings
            for (let s = 1; s <= this.auditData.string_count; s++) {
                gridHTML += this.renderStringContainer(s)
            }
        } else {
            // Affichage string spécifique
            gridHTML = this.renderStringContainer(this.currentStringFilter)
        }

        container.innerHTML = gridHTML
    }

    renderStringContainer(stringNumber) {
        const stringModules = Array.from(this.modules.values())
            .filter(m => m.string_number === stringNumber)
            .sort((a, b) => a.position_in_string - b.position_in_string)

        const completed = stringModules.filter(m => m.status !== 'pending').length
        const total = stringModules.length

        let html = `
            <div class="string-container" data-string="${stringNumber}">
                <div class="string-header">
                    <h3>
                        <i class="fas fa-solar-panel mr-2"></i>
                        STRING ${stringNumber} (Modules ${stringModules[0]?.module_id} - ${stringModules[stringModules.length - 1]?.module_id})
                    </h3>
                    <div class="string-progress">
                        ${completed}/${total} complétés
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(completed/total)*100}%"></div>
                        </div>
                    </div>
                </div>
                <div class="modules-grid">
        `

        // Modules de la string
        stringModules.forEach(module => {
            const statusClass = `module-${module.status}`
            html += `
                <button class="module-btn ${statusClass} touch-optimized" 
                        data-module-id="${module.module_id}"
                        data-string="${module.string_number}"
                        title="${module.module_id} - ${this.getStatusLabel(module.status)}${module.comment ? ' - ' + module.comment : ''}">
                    ${module.module_id.includes('-') ? module.module_id.split('-')[1] : module.module_id.substring(1)}
                </button>
            `
        })

        html += `
                </div>
            </div>
        `

        return html
    }

    setupEventListeners() {
        // Navigation strings
        document.getElementById('stringNavigation').addEventListener('click', (e) => {
            if (e.target.classList.contains('string-nav-btn')) {
                const stringFilter = e.target.dataset.string
                this.currentStringFilter = stringFilter === 'all' ? 'all' : parseInt(stringFilter)
                this.renderStringNavigation()
                this.renderModulesGrid()
            }
        })

        // Clic modules
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('module-btn')) {
                const moduleId = e.target.getAttribute('data-module-id')
                console.log('🎯 Module cliqué:', moduleId, 'Mode:', this.multiSelectMode ? 'Sélection' : 'Normal')
                
                if (moduleId) {
                    if (this.multiSelectMode) {
                        this.toggleModuleSelection(moduleId, e.target)
                    } else {
                        this.openModuleModal(moduleId)
                    }
                } else {
                    console.error('❌ Pas de module-id trouvé sur:', e.target)
                }
            }
        })

        // Modal diagnostic
        this.setupModalEvents()

        // Boutons header
        document.getElementById('measureBtn').addEventListener('click', () => this.showMeasuresModal())
        document.getElementById('reportBtn').addEventListener('click', () => this.generateReport())
        document.getElementById('shareBtn').addEventListener('click', () => this.shareAudit())
        document.getElementById('editAuditBtn').addEventListener('click', () => this.showEditAuditModal())

        // Sélection multiple
        this.setupMultiSelectEvents()

        // Raccourcis clavier tactile
        document.addEventListener('keydown', (e) => this.handleKeyboard(e))

        // Gestion toucher/glisser pour navigation rapide
        this.setupTouchGestures()
    }

    openModuleModal(moduleId) {
        console.log('📝 Ouverture modal pour module:', moduleId)
        
        if (!moduleId) {
            console.error('❌ Module ID manquant')
            return
        }
        
        const module = this.modules.get(moduleId)
        if (!module) {
            console.error('❌ Module non trouvé:', moduleId, 'Modules disponibles:', Array.from(this.modules.keys()).slice(0, 5))
            return
        }

        this.selectedModule = module

        // Mise à jour titre modal
        document.getElementById('modalTitle').textContent = `MODULE ${moduleId}`
        
        // Pré-sélection statut actuel
        document.querySelectorAll('.module-status-btn').forEach(btn => {
            btn.classList.remove('selected')
            if (btn.dataset.status === module.status) {
                btn.classList.add('selected')
            }
        })

        // Commentaire existant
        document.getElementById('moduleComment').value = module.comment || ''

        // Affichage modal
        document.getElementById('moduleModal').classList.remove('hidden')
        
        // Focus sur premier bouton pour navigation clavier
        document.querySelector('.module-status-btn').focus()
    }

    setupModalEvents() {
        const modal = document.getElementById('moduleModal')
        
        // Sélection statut
        document.querySelectorAll('.module-status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.module-status-btn').forEach(b => b.classList.remove('selected'))
                btn.classList.add('selected')
                this.selectedStatus = btn.dataset.status
            })
        })

        // Validation
        document.getElementById('validateBtn').addEventListener('click', () => {
            this.validateModuleStatus()
        })

        // Annulation
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal()
        })

        // Fermeture ESC ou clic extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal()
            }
        })

        // Configuration modal édition audit
        this.setupEditModalEvents()
    }

    setupEditModalEvents() {
        const editModal = document.getElementById('editAuditModal')
        const editForm = document.getElementById('editAuditForm')
        
        // Soumission formulaire édition
        editForm.addEventListener('submit', (e) => {
            e.preventDefault()
            
            const formData = {
                project_name: document.getElementById('editProjectName').value.trim(),
                client_name: document.getElementById('editClientName').value.trim(),
                location: document.getElementById('editLocation').value.trim()
            }
            
            if (!formData.project_name || !formData.client_name || !formData.location) {
                this.showAlert('Tous les champs sont requis', 'error')
                return
            }
            
            this.saveAuditChanges(formData)
        })

        // Annulation édition
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.closeEditAuditModal()
        })

        // Fermeture ESC ou clic extérieur  
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                this.closeEditAuditModal()
            }
        })

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.closeModal()
            }
        })
    }

    async validateModuleStatus() {
        console.log('🔍 Validation module - selectedModule:', this.selectedModule)
        console.log('🔍 Validation module - selectedStatus:', this.selectedStatus)
        
        if (!this.selectedModule || !this.selectedStatus) {
            this.showAlert('Veuillez sélectionner un statut', 'warning')
            return
        }

        if (!this.selectedModule.module_id) {
            console.error('❌ Module ID manquant dans selectedModule:', this.selectedModule)
            this.showAlert('Erreur: Module ID manquant', 'error')
            return
        }

        try {
            const comment = document.getElementById('moduleComment').value.trim()
            
            // Sauvegarde des données du module avant l'appel API (évite les références async perdues)
            const moduleId = this.selectedModule.module_id
            const selectedModule = { ...this.selectedModule } // copie de sécurité
            const selectedStatus = this.selectedStatus
            
            console.log('📡 Mise à jour module:', moduleId, '→', selectedStatus)
            
            // API update
            const updateData = {
                status: selectedStatus,
                comment: comment || null,
                technicianId: this.technicianId
            }

            // Mise à jour locale immédiate
            selectedModule.status = selectedStatus
            selectedModule.comment = comment || null
            selectedModule.technician_id = this.technicianId
            selectedModule.updated_at = new Date().toISOString()

            // Mise à jour Map
            this.modules.set(moduleId, selectedModule)

            // Mise à jour interface
            this.updateModuleButton(moduleId)
            this.updateProgress()
            this.renderStringNavigation()

            // Sauvegarde dans localStorage
            this.saveAuditToLocalStorage()

            // Envoi serveur si online et temps réel activé (v3.3)
            if (navigator.onLine && this.realtimeEnabled) {
                this.isSyncing = true
                try {
                    await fetch(`${this.hubApiUrl}/api/audit/${this.auditToken}/module/${moduleId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: selectedStatus,
                            comment: comment || null,
                            technicianId: this.technicianId,
                            technicianName: this.technicianName
                        })
                    })
                    console.log('🌐 Module synced to server:', moduleId)
                } catch (error) {
                    console.warn('⚠️ Sync serveur échoué, continuera offline:', error.message)
                } finally {
                    this.isSyncing = false
                }
            }

            this.closeModal()
            this.showAlert(`Module ${moduleId} mis à jour`, 'success')

            console.log('✅ Module mis à jour:', moduleId, '→', selectedStatus)

        } catch (error) {
            console.error('Erreur validation module:', error)
            
            // Mode offline - queue pour sync ultérieure
            if (!navigator.onLine) {
                this.queueOfflineUpdate(updateData)
                this.showAlert('Mis à jour en mode offline - Sera synchronisé', 'warning')
            } else {
                this.showAlert('Erreur: ' + error.message, 'error')
            }
        }
    }

    updateModuleButton(moduleId) {
        console.log('🔄 Mise à jour bouton module:', moduleId)
        
        if (!moduleId) {
            console.error('❌ Module ID manquant pour mise à jour bouton')
            return
        }
        
        const btn = document.querySelector(`[data-module-id="${moduleId}"]`)
        if (!btn) {
            console.error('❌ Bouton module non trouvé:', moduleId)
            return
        }

        const module = this.modules.get(moduleId)
        if (!module) {
            console.error('❌ Module non trouvé dans Map:', moduleId)
            return
        }
        
        // Suppression anciennes classes statut
        btn.className = btn.className.replace(/module-\w+/g, '')
        
        // Ajout nouvelle classe
        btn.classList.add(`module-${module.status}`)
        
        // Mise à jour titre tooltip
        btn.title = `${moduleId} - ${this.getStatusLabel(module.status)}${module.comment ? ' - ' + module.comment : ''}`

        // Animation visuelle
        btn.style.transform = 'scale(1.1)'
        setTimeout(() => {
            btn.style.transform = 'scale(1)'
        }, 200)
    }

    updateProgress() {
        const totalModules = this.modules.size
        const completedModules = Array.from(this.modules.values())
            .filter(m => m.status !== 'pending').length

        document.getElementById('progress').textContent = `${completedModules}/${totalModules}`

        // Statistiques détaillées
        const stats = this.calculateStats()
        console.log('📊 Progression:', stats)
    }

    calculateStats() {
        const modules = Array.from(this.modules.values())
        
        return {
            total: modules.length,
            completed: modules.filter(m => m.status !== 'pending').length,
            ok: modules.filter(m => m.status === 'ok').length,
            inequality: modules.filter(m => m.status === 'inequality').length,
            microcracks: modules.filter(m => m.status === 'microcracks').length,
            dead: modules.filter(m => m.status === 'dead').length,
            string_open: modules.filter(m => m.status === 'string_open').length,
            not_connected: modules.filter(m => m.status === 'not_connected').length
        }
    }

    setupRealtimeSync() {
        if (!this.realtimeEnabled) {
            console.log('⚠️ Collaboration temps réel désactivée')
            return
        }
        
        console.log('🔄 Configuration collaboration temps réel...')
        
        // Polling mises à jour toutes les 3 secondes
        this.syncInterval = setInterval(() => {
            this.fetchRemoteUpdates()
        }, 3000)
        
        // Heartbeat toutes les 10 secondes
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat()
        }, 10000)
        
        // Envoyer heartbeat initial
        this.sendHeartbeat()
        
        // Charger liste techniciens actifs
        this.fetchActiveTechnicians()
        
        // Rafraîchir liste techniciens toutes les 15 secondes
        setInterval(() => {
            this.fetchActiveTechnicians()
        }, 15000)
        
        // Cleanup avant fermeture page
        window.addEventListener('beforeunload', () => {
            if (this.syncInterval) clearInterval(this.syncInterval)
            if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
        })
        
        console.log('✅ Collaboration temps réel activée')
    }
    
    async fetchRemoteUpdates() {
        if (!navigator.onLine || this.isUpdating || this.isSyncing) return
        
        try {
            const response = await fetch(
                `${this.hubApiUrl}/api/audit/${this.auditToken}/updates?since=${this.lastRemoteSync}`,
                { method: 'GET' }
            )
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }
            
            const result = await response.json()
            
            if (result.success && result.updates && result.updates.length > 0) {
                console.log(`🔄 ${result.updates.length} mise(s) à jour reçue(s)`)
                
                result.updates.forEach(update => {
                    if (update.technician_id !== this.technicianId) {
                        this.applyRemoteUpdate(update)
                    }
                })
            }
            
            this.lastRemoteSync = Date.now()
        } catch (error) {
            // Silent fail si offline ou erreur réseau
            if (navigator.onLine) {
                console.warn('⚠️ Erreur sync temps réel:', error.message)
            }
        }
    }
    
    applyRemoteUpdate(update) {
        const module = this.modules.get(update.module_id)
        if (!module) {
            console.warn('Module non trouvé:', update.module_id)
            return
        }
        
        // Vérifier si local plus récent (gestion conflits)
        if (module.updated_at) {
            const localTime = new Date(module.updated_at).getTime()
            const remoteTime = update.updated_at_ms || new Date(update.updated_at).getTime()
            
            if (localTime > remoteTime) {
                console.log('📌 Local plus récent, skip remote update:', update.module_id)
                return
            }
        }
        
        // Appliquer mise à jour remote
        const oldStatus = module.status
        module.status = update.status
        module.comment = update.comment || null
        module.updated_at = update.updated_at
        module.technician_id = update.technician_id
        
        // Mise à jour UI
        this.updateModuleButton(update.module_id)
        this.updateProgress()
        
        // Notification visuelle si changement de statut
        if (oldStatus !== update.status) {
            const techName = update.technician_name || 'Technicien'
            this.showAlert(
                `Module ${update.module_id} → ${this.getStatusLabel(update.status)} (${techName})`, 
                'info'
            )
        }
        
        // Sauvegarder en local
        this.saveAuditToLocalStorage()
    }
    
    async sendHeartbeat() {
        if (!navigator.onLine || !this.realtimeEnabled) return
        
        try {
            await fetch(`${this.hubApiUrl}/api/audit/${this.auditToken}/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technicianId: this.technicianId,
                    technicianName: this.technicianName
                })
            })
        } catch (error) {
            // Silent fail
        }
    }
    
    async fetchActiveTechnicians() {
        if (!navigator.onLine || !this.realtimeEnabled) return
        
        try {
            const response = await fetch(
                `${this.hubApiUrl}/api/audit/${this.auditToken}/technicians`
            )
            
            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    this.activeTechnicians = result.technicians || []
                    this.updateTechniciansIndicator()
                }
            }
        } catch (error) {
            // Silent fail
        }
    }

    updateTechniciansIndicator() {
        const techElement = document.getElementById('technicians')
        const iconElement = document.getElementById('technicianIcons')
        
        if (!techElement || !iconElement) return
        
        const count = this.activeTechnicians.length
        
        if (count === 0) {
            techElement.textContent = 'Vous seul'
            iconElement.textContent = '👤'
        } else {
            techElement.textContent = `${count} tech.`
            iconElement.textContent = '👤'.repeat(Math.min(count, 4))
            iconElement.title = this.activeTechnicians.map(t => t.technician_name).join(', ')
        }
    }

    setupOfflineSupport() {
        // Chargement données offline existantes
        this.loadOfflineData()

        // Sync automatique au retour online
        window.addEventListener('online', () => {
            this.syncOfflineQueue()
        })

        // Sauvegarde périodique
        setInterval(() => {
            this.saveOfflineData()
        }, 30000) // Toutes les 30 secondes
    }

    saveOfflineData() {
        const data = {
            auditToken: this.auditToken,
            auditData: this.auditData,
            modules: Array.from(this.modules.entries()),
            lastSync: Date.now()
        }
        
        localStorage.setItem(`diagpv_audit_${this.auditToken}`, JSON.stringify(data))
    }

    loadOfflineData() {
        const data = localStorage.getItem(`diagpv_audit_${this.auditToken}`)
        if (data) {
            const parsed = JSON.parse(data)
            console.log('📱 Données offline chargées:', parsed.lastSync)
        }
    }

    queueOfflineUpdate(updateData) {
        this.offlineQueue.push({
            ...updateData,
            moduleId: this.selectedModule.module_id,
            timestamp: Date.now()
        })
        console.log('📤 Queued offline:', this.offlineQueue.length, 'updates')
    }

    async syncOfflineQueue() {
        // Plus besoin de sync API - tout est dans localStorage
        if (this.offlineQueue.length === 0) return

        console.log('💾 Sauvegarde locale (plus besoin de sync API)')
        this.saveAuditToLocalStorage()

        this.offlineQueue = []
        this.showAlert('Données synchronisées avec succès', 'success')
    }

    setupTouchGestures() {
        let startX, startY
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX
            startY = e.touches[0].clientY
        })

        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return

            const endX = e.changedTouches[0].clientX
            const endY = e.changedTouches[0].clientY
            
            const deltaX = endX - startX
            const deltaY = endY - startY

            // Swipe horizontal pour navigation strings
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100) {
                if (deltaX > 0) {
                    this.navigateString('prev')
                } else {
                    this.navigateString('next')
                }
            }
        })
    }

    navigateString(direction) {
        if (this.currentStringFilter === 'all') return

        const current = this.currentStringFilter
        let next = current

        if (direction === 'next' && current < this.auditData.string_count) {
            next = current + 1
        } else if (direction === 'prev' && current > 1) {
            next = current - 1
        }

        if (next !== current) {
            this.currentStringFilter = next
            this.renderStringNavigation()
            this.renderModulesGrid()
        }
    }

    handleKeyboard(event) {
        // Navigation rapide clavier
        if (event.key === 'ArrowLeft') {
            this.navigateString('prev')
        } else if (event.key === 'ArrowRight') {
            this.navigateString('next')
        }

        // Raccourcis rapides statuts (dans modal)
        if (!document.getElementById('moduleModal').classList.contains('hidden')) {
            const statusKeys = {
                '1': 'ok',
                '2': 'inequality', 
                '3': 'microcracks',
                '4': 'dead',
                '5': 'string_open',
                '6': 'not_connected'
            }

            if (statusKeys[event.key]) {
                const btn = document.querySelector(`[data-status="${statusKeys[event.key]}"]`)
                if (btn) {
                    btn.click()
                }
            }

            // Validation rapide Entrée
            if (event.key === 'Enter') {
                document.getElementById('validateBtn').click()
            }
        }
    }

    async generateReport() {
        try {
            this.showAlert('Génération rapport en cours...', 'info')
            
            // Générer rapport HTML côté client
            const reportHTML = this.generateReportHTML()
            
            // Ouvrir dans nouvel onglet
            const reportWindow = window.open('', '_blank')
            reportWindow.document.write(reportHTML)
            reportWindow.document.close()
            
            console.log('📄 Rapport généré avec succès')
            this.showAlert('✅ Rapport généré !', 'success')
            
        } catch (error) {
            console.error('Erreur génération rapport:', error)
            this.showAlert('❌ Erreur génération rapport: ' + error.message, 'error')
        }
    }

    generateReportHTML() {
        // Convertir Map en Array pour faciliter les calculs
        const modulesArray = Array.from(this.modules.values())
        
        // Calculer statistiques
        const totalModules = modulesArray.length
        const okModules = modulesArray.filter(m => m.status === 'ok').length
        const defectModules = modulesArray.filter(m => m.status !== 'ok' && m.status !== 'pending').length
        const conformityRate = totalModules > 0 ? ((okModules / totalModules) * 100).toFixed(1) : 0
        
        // Grouper défauts par type
        const defectsByType = {}
        modulesArray.forEach(module => {
            if (module.status && module.status !== 'ok' && module.status !== 'pending') {
                const statusLabel = this.getStatusLabel(module.status)
                defectsByType[statusLabel] = (defectsByType[statusLabel] || 0) + 1
            }
        })

        // HTML du rapport
        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport Audit EL - ${this.auditData.project_name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; background: #fff; color: #000; }
        .header { text-align: center; border-bottom: 3px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #ea580c; font-size: 28px; margin-bottom: 10px; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .section h2 { color: #ea580c; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #fbbf24; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .info-item { padding: 10px; background: #f3f4f6; border-left: 4px solid #ea580c; }
        .info-item strong { display: block; color: #6b7280; font-size: 12px; margin-bottom: 5px; }
        .info-item span { font-size: 16px; font-weight: bold; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .stat-card { text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; }
        .stat-card .number { font-size: 36px; font-weight: bold; margin: 10px 0; }
        .stat-card .label { color: #6b7280; font-size: 14px; }
        .stat-card.ok .number { color: #16a34a; }
        .stat-card.defect .number { color: #dc2626; }
        .stat-card.conformity .number { color: #2563eb; }
        .defects-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .defects-table th { background: #ea580c; color: white; padding: 12px; text-align: left; }
        .defects-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .defects-table tr:nth-child(even) { background: #f9fafb; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>📄 RAPPORT D'AUDIT ÉLECTROLUMINESCENCE</h1>
        <p style="color: #6b7280; margin-top: 10px;">Diagnostic Photovoltaïque - www.diagnosticphotovoltaique.fr</p>
    </div>

    <!-- Boutons Actions -->
    <div class="no-print" style="text-align: center; margin-bottom: 30px;">
        <button onclick="window.print()" style="background: #ea580c; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 10px;">
            🖨️ Imprimer / PDF
        </button>
        <button onclick="window.close()" style="background: #6b7280; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            ✖️ Fermer
        </button>
    </div>

    <!-- Informations Projet -->
    <div class="section">
        <h2>📋 INFORMATIONS PROJET</h2>
        <div class="info-grid">
            <div class="info-item">
                <strong>NOM DU PROJET</strong>
                <span>${this.auditData.project_name || 'N/A'}</span>
            </div>
            <div class="info-item">
                <strong>CLIENT</strong>
                <span>${this.auditData.client_name || 'N/A'}</span>
            </div>
            <div class="info-item">
                <strong>LOCALISATION</strong>
                <span>${this.auditData.location || 'N/A'}</span>
            </div>
            <div class="info-item">
                <strong>DATE AUDIT</strong>
                <span>${new Date(this.auditData.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
        </div>
    </div>

    <!-- Statistiques -->
    <div class="section">
        <h2>📊 RÉSULTATS AUDIT</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="label">TOTAL MODULES</div>
                <div class="number">${totalModules}</div>
            </div>
            <div class="stat-card ok">
                <div class="label">MODULES OK</div>
                <div class="number">${okModules}</div>
            </div>
            <div class="stat-card defect">
                <div class="label">DÉFAUTS</div>
                <div class="number">${defectModules}</div>
            </div>
        </div>
        <div class="stats" style="grid-template-columns: 1fr;">
            <div class="stat-card conformity">
                <div class="label">TAUX DE CONFORMITÉ</div>
                <div class="number">${conformityRate}%</div>
            </div>
        </div>
    </div>

    <!-- Défauts par Type -->
    ${Object.keys(defectsByType).length > 0 ? `
    <div class="section">
        <h2>⚠️ DÉFAUTS DÉTECTÉS PAR TYPE</h2>
        <table class="defects-table">
            <thead>
                <tr>
                    <th>Type de Défaut</th>
                    <th>Nombre de Modules Affectés</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(defectsByType).map(([type, count]) => `
                    <tr>
                        <td>${this.getStatusLabel(type)}</td>
                        <td><strong>${count}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <!-- Liste Modules avec Défauts -->
    ${defectModules > 0 ? `
    <div class="section">
        <h2>🔍 MODULES AVEC DÉFAUTS (Détail)</h2>
        <table class="defects-table">
            <thead>
                <tr>
                    <th>Module #</th>
                    <th>Statut</th>
                    <th>Défauts</th>
                    <th>Commentaire</th>
                </tr>
            </thead>
            <tbody>
                ${modulesArray.filter(m => m.status !== 'ok' && m.status !== 'pending').map(module => `
                    <tr>
                        <td><strong>${module.module_id}</strong></td>
                        <td>${this.getStatusLabel(module.status)}</td>
                        <td>${module.comment || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <!-- Recommandations -->
    <div class="section">
        <h2>💡 RECOMMANDATIONS</h2>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 10px;">
            ${conformityRate >= 95 ? `
                <p><strong>✅ Installation en bon état</strong></p>
                <p>Le taux de conformité de ${conformityRate}% indique une installation en excellent état. Poursuivre la maintenance préventive.</p>
            ` : conformityRate >= 85 ? `
                <p><strong>⚠️ Surveillance recommandée</strong></p>
                <p>Le taux de conformité de ${conformityRate}% nécessite une surveillance accrue des modules détectés avec défauts.</p>
            ` : `
                <p><strong>🔴 Intervention recommandée</strong></p>
                <p>Le taux de conformité de ${conformityRate}% est inférieur aux standards. Une intervention rapide est recommandée pour les ${defectModules} modules affectés.</p>
            `}
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p><strong>DiagPV - Diagnostic Photovoltaïque Professionnel</strong></p>
        <p>Audit conforme IEC 62446-1 | www.diagnosticphotovoltaique.fr</p>
        <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p style="margin-top: 10px; font-size: 10px;">Token audit: ${this.auditToken}</p>
    </div>
</body>
</html>
        `
    }

    shareAudit() {
        const shareUrl = window.location.href
        
        if (navigator.share) {
            navigator.share({
                title: `Audit EL - ${this.auditData.project_name}`,
                text: `Audit électroluminescence en cours`,
                url: shareUrl
            })
        } else {
            // Fallback copie clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showAlert('URL copiée dans le presse-papiers', 'success')
            })
        }
    }

    showMeasuresModal() {
        // TODO: Interface upload/visualisation mesures PVserv
        this.showAlert('Interface mesures PVserv en développement', 'info')
    }

    closeModal() {
        document.getElementById('moduleModal').classList.add('hidden')
        this.selectedModule = null
        this.selectedStatus = null
    }

    getStatusLabel(status) {
        const labels = {
            'pending': '⏳ En attente',
            'ok': '🟢 OK',
            'inequality': '🟡 Inégalité',
            'microcracks': '🟠 Microfissures',
            'dead': '🔴 HS',
            'string_open': '🔵 String ouvert',
            'not_connected': '⚫ Non raccordé'
        }
        return labels[status] || status
    }

    generateTechnicianId() {
        let id = localStorage.getItem('diagpv_technician_id')
        if (!id) {
            id = 'tech_' + Math.random().toString(36).substr(2, 8)
            localStorage.setItem('diagpv_technician_id', id)
        }
        return id
    }
    
    getTechnicianName() {
        let name = localStorage.getItem('diagpv_technician_name')
        if (!name) {
            // Demander nom technicien si première utilisation
            name = prompt('👤 Quel est votre nom/prénom pour la collaboration ?', 'Technicien') || 'Technicien'
            localStorage.setItem('diagpv_technician_name', name)
        }
        return name
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
        alert.className = `diagpv-alert fixed top-20 right-4 ${colors[type]} border-2 rounded-lg px-6 py-4 text-white font-bold z-50 max-w-md shadow-lg`
        alert.innerHTML = `
            <div class="flex items-center">
                <i class="${icons[type]} mr-3 text-xl"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-xl hover:text-gray-300">×</button>
            </div>
        `

        document.body.appendChild(alert)

        // Auto-suppression après 4 secondes
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove()
            }
        }, 4000)
    }

    // Affichage modal édition audit
    showEditAuditModal() {
        // Pré-remplissage avec données actuelles
        document.getElementById('editProjectName').value = this.auditData.project_name || ''
        document.getElementById('editClientName').value = this.auditData.client_name || ''
        document.getElementById('editLocation').value = this.auditData.location || ''
        
        // Affichage modal
        document.getElementById('editAuditModal').classList.remove('hidden')
        
        // Focus sur premier champ
        document.getElementById('editProjectName').focus()
    }

    // Fermeture modal édition audit
    closeEditAuditModal() {
        document.getElementById('editAuditModal').classList.add('hidden')
    }

    // Sauvegarde modifications audit
    async saveAuditChanges(formData) {
        try {
            // Sauvegarde directe localStorage (pas d'API)
            
            // Mise à jour données locales
            this.auditData.project_name = formData.project_name
            this.auditData.client_name = formData.client_name
            this.auditData.location = formData.location
            
            // Sauvegarde dans localStorage
            this.saveAuditToLocalStorage()
            
            // Mise à jour affichage titre
            document.getElementById('projectTitle').textContent = formData.project_name
            
            this.closeEditAuditModal()
            this.showAlert('Audit modifié avec succès', 'success')
            
            console.log('✅ Audit modifié:', formData.project_name)
            
        } catch (error) {
            console.error('Erreur modification audit:', error)
            this.showAlert('Erreur lors de la modification', 'error')
        }
    }

    // Cleanup lors fermeture
    destroy() {
        if (this.eventSource) {
            this.eventSource.close()
        }
        this.saveOfflineData()
    }

    // ============================================================================
    // SÉLECTION MULTIPLE POUR AUDIT TERRAIN RAPIDE
    // ============================================================================

    setupMultiSelectEvents() {
        // Bouton activation/désactivation mode sélection
        document.getElementById('multiSelectToggleBtn').addEventListener('click', () => {
            this.toggleMultiSelectMode()
        })

        // Barre d'outils sélection
        document.getElementById('exitMultiSelectBtn').addEventListener('click', () => {
            this.exitMultiSelectMode()
        })

        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.selectAllVisibleModules()
        })

        document.getElementById('clearSelectionBtn').addEventListener('click', () => {
            this.clearSelection()
        })

        // Actions de lot
        document.querySelectorAll('.bulk-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.target.getAttribute('data-status')
                this.showBulkActionModal(status)
            })
        })

        // Modal confirmation lot
        document.getElementById('confirmBulkBtn').addEventListener('click', () => {
            this.executeBulkAction()
        })

        document.getElementById('cancelBulkBtn').addEventListener('click', () => {
            this.closeBulkModal()
        })

        // Fermeture modal si clic extérieur
        document.getElementById('bulkActionModal').addEventListener('click', (e) => {
            if (e.target.id === 'bulkActionModal') {
                this.closeBulkModal()
            }
        })
    }

    toggleMultiSelectMode() {
        this.multiSelectMode = !this.multiSelectMode
        console.log('🔄 Mode sélection multiple:', this.multiSelectMode ? 'ACTIVÉ' : 'DÉSACTIVÉ')

        const toggleBtn = document.getElementById('multiSelectToggleBtn')
        const toolbar = document.getElementById('multiSelectToolbar')

        if (this.multiSelectMode) {
            // Activer mode sélection
            toggleBtn.classList.add('active')
            toggleBtn.innerHTML = '<i class="fas fa-times mr-1"></i>QUITTER SÉLECTION'
            toolbar.classList.remove('hidden')
            
            // Ajouter classe aux modules
            document.querySelectorAll('.module-btn').forEach(btn => {
                btn.classList.add('multi-select-mode')
            })
            
            this.showAlert('Mode sélection multiple activé ! Cliquez sur les modules à modifier ensemble.', 'success')
        } else {
            this.exitMultiSelectMode()
        }
    }

    exitMultiSelectMode() {
        this.multiSelectMode = false
        this.clearSelection()

        const toggleBtn = document.getElementById('multiSelectToggleBtn')
        const toolbar = document.getElementById('multiSelectToolbar')

        toggleBtn.classList.remove('active')
        toggleBtn.innerHTML = '<i class="fas fa-check-square mr-1"></i>SÉLECTION MULTIPLE'
        toolbar.classList.add('hidden')

        // Retirer classes des modules
        document.querySelectorAll('.module-btn').forEach(btn => {
            btn.classList.remove('multi-select-mode', 'selected-for-bulk')
        })

        console.log('✅ Mode sélection multiple désactivé')
    }

    toggleModuleSelection(moduleId, element) {
        if (this.selectedModules.has(moduleId)) {
            // Désélectionner
            this.selectedModules.delete(moduleId)
            element.classList.remove('selected-for-bulk')
            console.log('➖ Module désélectionné:', moduleId)
        } else {
            // Sélectionner
            this.selectedModules.add(moduleId)
            element.classList.add('selected-for-bulk')
            console.log('➕ Module sélectionné:', moduleId)
        }

        this.updateSelectionCount()
    }

    selectAllVisibleModules() {
        const visibleModules = document.querySelectorAll('.module-btn:not(.hidden)')
        let addedCount = 0

        visibleModules.forEach(btn => {
            const moduleId = btn.getAttribute('data-module-id')
            if (moduleId && !this.selectedModules.has(moduleId)) {
                this.selectedModules.add(moduleId)
                btn.classList.add('selected-for-bulk')
                addedCount++
            }
        })

        this.updateSelectionCount()
        this.showAlert(`${addedCount} modules sélectionnés`, 'success')
        console.log('✅ Tous les modules visibles sélectionnés:', addedCount)
    }

    clearSelection() {
        this.selectedModules.clear()
        document.querySelectorAll('.module-btn.selected-for-bulk').forEach(btn => {
            btn.classList.remove('selected-for-bulk')
        })
        this.updateSelectionCount()
        console.log('🗑️ Sélection effacée')
    }

    updateSelectionCount() {
        const count = this.selectedModules.size
        document.getElementById('selectedCount').textContent = count
        
        // Activer/désactiver boutons d'action selon sélection
        const actionBtns = document.querySelectorAll('.bulk-action-btn')
        actionBtns.forEach(btn => {
            btn.disabled = count === 0
            btn.style.opacity = count === 0 ? '0.5' : '1'
        })
    }

    showBulkActionModal(status) {
        if (this.selectedModules.size === 0) {
            this.showAlert('Aucun module sélectionné', 'warning')
            return
        }

        this.bulkActionStatus = status
        const statusLabels = {
            'ok': '🟢 OK',
            'inequality': '🟡 Inégalité', 
            'microcracks': '🟠 Microfissures',
            'dead': '🔴 Hors Service',
            'string_open': '🔵 String ouvert',
            'not_connected': '⚫ Non raccordé'
        }

        // Mise à jour modal
        document.getElementById('bulkCount').textContent = this.selectedModules.size
        document.getElementById('bulkNewStatus').textContent = statusLabels[status] || status
        
        // Liste modules sélectionnés
        const modulesList = document.getElementById('bulkModulesList')
        const modulesArray = Array.from(this.selectedModules).sort()
        modulesList.innerHTML = modulesArray.map(moduleId => 
            `<span class="inline-block bg-gray-700 px-2 py-1 rounded mr-1 mb-1">${moduleId}</span>`
        ).join('')

        // Reset commentaire
        document.getElementById('bulkComment').value = ''

        // Afficher modal
        document.getElementById('bulkActionModal').classList.remove('hidden')
    }

    closeBulkModal() {
        document.getElementById('bulkActionModal').classList.add('hidden')
        this.bulkActionStatus = null
    }

    async executeBulkAction() {
        if (!this.bulkActionStatus || this.selectedModules.size === 0) {
            return
        }

        const comment = document.getElementById('bulkComment').value.trim()
        const modulesToUpdate = Array.from(this.selectedModules)

        try {
            console.log('🔄 Mise à jour en lot:', {
                modules: modulesToUpdate,
                status: this.bulkActionStatus,
                comment: comment
            })

            // Sauvegarde directe localStorage (pas d'API)
            console.log('💾 Mise à jour locale bulk-update:', modulesToUpdate.length, 'modules')

            // Mise à jour locale des modules
            modulesToUpdate.forEach(moduleId => {
                const module = this.modules.get(moduleId)
                if (module) {
                    module.status = this.bulkActionStatus
                    if (comment) {
                        module.comment = comment
                    }
                    module.updated_at = new Date().toISOString()
                    module.technician_id = this.technicianId
                }
            })
            
            // Sauvegarde dans localStorage
            this.saveAuditToLocalStorage()

            // Envoi batch serveur si online (v3.3)
            if (navigator.onLine && this.realtimeEnabled) {
                this.isSyncing = true
                const syncPromises = modulesToUpdate.map(moduleId => 
                    fetch(`${this.hubApiUrl}/api/audit/${this.auditToken}/module/${moduleId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: this.bulkActionStatus,
                            comment: comment || null,
                            technicianId: this.technicianId,
                            technicianName: this.technicianName
                        })
                    }).catch(err => console.warn('⚠️ Sync module échoué:', moduleId))
                )
                
                await Promise.all(syncPromises)
                console.log('🌐 Batch sync serveur terminé:', modulesToUpdate.length, 'modules')
                this.isSyncing = false
            }

            // Re-rendu interface
            this.renderModulesGrid()
            this.updateProgress()

            // Sortie mode sélection après succès
            this.exitMultiSelectMode()
            this.closeBulkModal()

            this.showAlert(`✅ ${modulesToUpdate.length} module(s) mis à jour avec succès !`, 'success')

        } catch (error) {
            console.error('❌ Erreur mise à jour en lot:', error)
            this.showAlert('Erreur lors de la mise à jour: ' + error.message, 'error')
        }
    }


}

// Initialisation audit au chargement DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌙 DiagPV Audit Terrain - Interface Nocturne Initialisée')
    window.diagpvAudit = new DiagPVAudit()
    window.app = window.diagpvAudit // Alias pour compatibilité
})

// Sauvegarde avant fermeture page
window.addEventListener('beforeunload', () => {
    if (window.diagpvAudit) {
        window.diagpvAudit.destroy()
    }
})

// Export pour usage externe
window.DiagPVAudit = DiagPVAudit