// DiagPV Audit EL - Interface audit terrain nocturne
// Collaboration temps réel + diagnostic modules optimisé tablette tactile

class DiagPVAudit {
    constructor() {
        this.auditToken = document.body.dataset.auditToken
        this.auditData = null
        this.modules = new Map()
        this.currentStringFilter = 'all'
        this.technicianId = this.generateTechnicianId()
        this.eventSource = null
        this.selectedModule = null
        this.offlineQueue = []
        
        // Propriétés sélection multiple
        this.multiSelectMode = false
        this.selectedModules = new Set()
        this.bulkActionStatus = null
        
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
        const response = await fetch(`/api/audit/${this.auditToken}`)
        
        if (!response.ok) {
            throw new Error('Audit introuvable')
        }

        const data = await response.json()
        this.auditData = data.audit
        
        // Construction Map modules pour accès rapide
        data.modules.forEach(module => {
            this.modules.set(module.module_id, module)
        })

        console.log('✅ Audit chargé:', this.auditData.project_name, 'Modules:', this.modules.size)
    }

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

            const response = await fetch(`/api/audit/${this.auditToken}/module/${moduleId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            })

            if (!response.ok) {
                throw new Error('Erreur mise à jour module')
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

            // Sauvegarde offline
            this.saveOfflineData()

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
        // Server-Sent Events pour collaboration temps réel
        if (typeof EventSource !== 'undefined') {
            this.eventSource = new EventSource(`/api/audit/${this.auditToken}/stream`)
            
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type !== 'ping') {
                        this.handleRealtimeUpdate(data)
                    }
                } catch (error) {
                    console.error('Erreur parsing SSE:', error)
                }
            }

            this.eventSource.onerror = () => {
                console.log('⚠️ Connexion temps réel interrompue')
                // Reconnexion automatique après 5s
                setTimeout(() => this.setupRealtimeSync(), 5000)
            }
        }

        // Simulation indicateur techniciens connectés
        this.updateTechniciansIndicator()
    }

    handleRealtimeUpdate(data) {
        if (data.moduleId && data.status && data.technicianId !== this.technicianId) {
            // Mise à jour module par autre technicien
            const module = this.modules.get(data.moduleId)
            if (module) {
                module.status = data.status
                this.updateModuleButton(data.moduleId)
                
                this.showAlert(`${data.moduleId} mis à jour par autre technicien`, 'info')
            }
        }
    }

    updateTechniciansIndicator() {
        // Simulation 2-3 techniciens connectés
        const count = 2 + Math.floor(Math.random() * 2)
        document.getElementById('technicians').textContent = `${count}/4`
        document.getElementById('technicianIcons').textContent = '👤'.repeat(count)
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
        if (this.offlineQueue.length === 0) return

        console.log('🔄 Sync offline queue:', this.offlineQueue.length, 'items')
        
        for (const update of this.offlineQueue) {
            try {
                await fetch(`/api/audit/${this.auditToken}/module/${update.moduleId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(update)
                })
            } catch (error) {
                console.error('Erreur sync offline:', error)
                break
            }
        }

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
            
            // Ouverture rapport dans nouvel onglet
            const reportUrl = `/api/audit/${this.auditToken}/report`
            window.open(reportUrl, '_blank')
            
            console.log('📄 Rapport généré:', reportUrl)
            
        } catch (error) {
            console.error('Erreur génération rapport:', error)
            this.showAlert('Erreur génération rapport', 'error')
        }
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
            const response = await fetch(`/api/audit/${this.auditToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                throw new Error('Erreur sauvegarde audit')
            }

            const result = await response.json()
            
            // Mise à jour données locales
            this.auditData.project_name = formData.project_name
            this.auditData.client_name = formData.client_name
            this.auditData.location = formData.location
            
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

            // Appel API pour mise à jour en lot
            const response = await fetch(`/api/audit/${this.auditToken}/bulk-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modules: modulesToUpdate,
                    status: this.bulkActionStatus,
                    comment: comment,
                    technician_id: this.technicianId
                })
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour')
            }

            const result = await response.json()
            console.log('✅ Réponse API bulk-update:', result)

            // Vérification si des modules ont été effectivement mis à jour
            if (result.success && result.updated > 0) {
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

                // Re-rendu interface
                this.renderModulesGrid()
                this.updateProgress()

                // Sortie mode sélection après succès
                this.exitMultiSelectMode()
                this.closeBulkModal()

                this.showAlert(`✅ ${result.updated} modules mis à jour avec succès !`, 'success')
            } else if (result.success && result.updated === 0 && result.notFound > 0) {
                // Modules non trouvés - pas de création automatique, mise à jour locale seulement
                console.log('⚠️ Modules non trouvés, mise à jour locale uniquement')
                
                // Mise à jour locale des modules (création en mémoire)
                modulesToUpdate.forEach(moduleId => {
                    let module = this.modules.get(moduleId)
                    if (!module) {
                        // Créer le module en local s'il n'existe pas
                        module = {
                            module_id: moduleId,
                            status: 'pending',
                            comment: null,
                            technician_id: this.technicianId,
                            updated_at: new Date().toISOString()
                        }
                        this.modules.set(moduleId, module)
                    }
                    
                    // Mettre à jour le statut
                    module.status = this.bulkActionStatus
                    if (comment) {
                        module.comment = comment
                    }
                    module.updated_at = new Date().toISOString()
                    module.technician_id = this.technicianId
                })

                // Re-rendu interface
                this.renderModulesGrid()
                this.updateProgress()
                this.exitMultiSelectMode()
                this.closeBulkModal()

                this.showAlert(`⚠️ ${modulesToUpdate.length} modules mis à jour localement (audit non synchronisé avec serveur)`, 'warning')
            } else {
                throw new Error(result.message || 'Erreur de mise à jour inconnue')
            }

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
})

// Sauvegarde avant fermeture page
window.addEventListener('beforeunload', () => {
    if (window.diagpvAudit) {
        window.diagpvAudit.destroy()
    }
})

// Export pour usage externe
window.DiagPVAudit = DiagPVAudit