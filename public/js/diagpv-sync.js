/**
 * 🔄 DiagPV Synchronisation Module EL → Hub
 * 
 * Ce fichier gère la synchronisation automatique des données d'audit
 * électroluminescence vers le Hub DiagPV central.
 * 
 * @version 1.0.0
 * @author DiagPV Assistant
 * @date 2025-10-24
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DIAGPV_CONFIG = {
    hubApiUrl: 'https://diagnostic-hub.pages.dev/api/projects/sync',
    autoSyncOnComplete: true,  // Sync automatique si audit terminé
    autoSyncDelay: 2000,       // Délai avant sync auto (ms)
    showNotifications: true,    // Afficher notifications utilisateur
    debugMode: false            // Mode debug (logs console)
};

// ============================================================================
// FONCTION PRINCIPALE DE SYNCHRONISATION
// ============================================================================

/**
 * Synchronise les données d'audit vers le Hub DiagPV
 * 
 * @param {string} sessionId - UUID de la session (optionnel, auto-détecté depuis URL)
 * @returns {Promise<Object>} Résultat de la synchronisation
 */
async function syncAuditToHub(sessionId = null) {
    try {
        log('🔄 Début synchronisation vers Hub DiagPV...');
        
        // 1. Récupérer sessionId
        if (!sessionId) {
            sessionId = getSessionIdFromUrl();
        }
        
        if (!sessionId) {
            throw new Error('Session ID introuvable. Vérifiez l\'URL.');
        }
        
        log(`📋 Session ID: ${sessionId}`);
        
        // 2. Récupérer données audit depuis localStorage
        const auditData = loadAuditData(sessionId);
        
        if (!auditData) {
            throw new Error(`Aucune donnée trouvée pour la session ${sessionId}`);
        }
        
        log('📊 Données audit récupérées:', auditData);
        
        // 3. Préparer payload de synchronisation
        const syncPayload = prepareSyncPayload(sessionId, auditData);
        
        log('📤 Payload préparé:', syncPayload);
        
        // 4. Envoyer vers API Hub
        const response = await fetch(DIAGPV_CONFIG.hubApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(syncPayload)
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `Erreur HTTP ${response.status}`);
        }
        
        log('✅ Synchronisation réussie:', result.data);
        
        // 5. Marquer comme synchronisé
        markAsSynced(sessionId, result.data);
        
        // 6. Afficher notification succès
        if (DIAGPV_CONFIG.showNotifications) {
            showNotification('✅ Projet synchronisé avec le Hub DiagPV !', 'success');
        }
        
        return result.data;
        
    } catch (error) {
        console.error('❌ Erreur synchronisation Hub:', error);
        
        if (DIAGPV_CONFIG.showNotifications) {
            showNotification('❌ Erreur synchronisation: ' + error.message, 'error');
        }
        
        throw error;
    }
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Récupère le sessionId depuis l'URL
 * Supporte les formats: /audit/UUID ou ?sessionId=UUID
 */
function getSessionIdFromUrl() {
    // Format 1: /audit/76e6eb36-8b49-4255-99d3-55fc1adfc1c9
    const pathMatch = window.location.pathname.match(/\/audit\/([a-f0-9-]+)/i);
    if (pathMatch) {
        return pathMatch[1];
    }
    
    // Format 2: ?sessionId=76e6eb36-8b49-4255-99d3-55fc1adfc1c9
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    if (sessionId) {
        return sessionId;
    }
    
    // Format 3: Dernier segment de l'URL
    const segments = window.location.pathname.split('/').filter(s => s);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment.match(/^[a-f0-9-]+$/i)) {
        return lastSegment;
    }
    
    return null;
}

/**
 * Charge les données d'audit depuis localStorage
 */
function loadAuditData(sessionId) {
    const storageKey = `audit_${sessionId}`;
    const rawData = localStorage.getItem(storageKey);
    
    if (!rawData) {
        // Essayer autres formats de clés
        const allKeys = Object.keys(localStorage);
        const matchingKey = allKeys.find(k => 
            k.includes(sessionId) || 
            k.includes('audit') || 
            k.includes('session')
        );
        
        if (matchingKey) {
            log(`📦 Données trouvées avec clé alternative: ${matchingKey}`);
            return JSON.parse(localStorage.getItem(matchingKey));
        }
        
        return null;
    }
    
    return JSON.parse(rawData);
}

/**
 * Prépare le payload de synchronisation
 */
function prepareSyncPayload(sessionId, auditData) {
    // Calculer taux de conformité si non fourni
    const conformityRate = auditData.conformityRate || calculateConformityRate(auditData);
    
    // Calculer nombre de défauts si non fourni
    const defectsFound = auditData.defectsFound || 
                        (auditData.defects ? auditData.defects.length : 0) ||
                        (auditData.anomalies ? auditData.anomalies.length : 0) || 0;
    
    // Calculer puissance installée si non fournie
    const totalModules = auditData.totalModules || auditData.moduleCount || 0;
    const installedPower = auditData.installedPower || 
                          auditData.installedPowerKwc || 
                          (totalModules * 0.4); // Estimation 400Wc/module
    
    return {
        auditData: {
            // Identification
            sessionId: sessionId,
            projectName: auditData.projectName || auditData.siteName || `Audit ${sessionId.substring(0, 8)}`,
            clientName: auditData.clientName || auditData.customer || 'Client à définir',
            clientEmail: auditData.clientEmail || auditData.customerEmail || null,
            siteAddress: auditData.siteAddress || auditData.address || auditData.location || 'Adresse à définir',
            
            // Configuration technique
            totalModules: totalModules,
            installedPower: installedPower,
            stringCount: auditData.stringCount || auditData.strings || 0,
            
            // Résultats audit
            defectsFound: defectsFound,
            conformityRate: conformityRate,
            progress: auditData.progress || auditData.completion || 100,
            
            // Métadonnées
            auditDate: auditData.auditDate || auditData.date || new Date().toISOString(),
            technicians: auditData.technicians || auditData.operators || [],
            auditType: 'Électroluminescence',
            norms: ['IEC 62446-1', 'IEC 61215'],
            
            // Données brutes pour référence
            rawData: {
                temperature: auditData.temperature,
                weather: auditData.weather,
                irradiance: auditData.irradiance
            }
        }
    };
}

/**
 * Calcule le taux de conformité
 */
function calculateConformityRate(auditData) {
    const totalModules = auditData.totalModules || auditData.moduleCount || 0;
    const defectsFound = auditData.defectsFound || 
                        (auditData.defects ? auditData.defects.length : 0) || 0;
    
    if (totalModules === 0) return 100;
    
    const conformModules = totalModules - defectsFound;
    return Math.round((conformModules / totalModules) * 100 * 10) / 10; // 1 décimale
}

/**
 * Marque la session comme synchronisée
 */
function markAsSynced(sessionId, syncData) {
    const syncKey = `audit_${sessionId}_synced`;
    const syncInfo = {
        syncDate: new Date().toISOString(),
        projectId: syncData.projectId,
        interventionId: syncData.interventionId,
        projectName: syncData.projectName
    };
    
    localStorage.setItem(syncKey, JSON.stringify(syncInfo));
    log('💾 Session marquée comme synchronisée:', syncInfo);
}

/**
 * Vérifie si la session est déjà synchronisée
 */
function isSynced(sessionId) {
    const syncKey = `audit_${sessionId}_synced`;
    return localStorage.getItem(syncKey) !== null;
}

/**
 * Affiche une notification utilisateur
 */
function showNotification(message, type = 'info') {
    // Vérifier si une notification existe déjà
    const existingNotif = document.querySelector('.diagpv-notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `diagpv-notification diagpv-notification-${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">${type === 'success' ? '✅' : '❌'}</span>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 500;
        animation: diagpvSlideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    // Ajouter styles CSS si pas déjà présents
    if (!document.getElementById('diagpv-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'diagpv-notification-styles';
        style.textContent = `
            @keyframes diagpvSlideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes diagpvSlideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        notification.style.animation = 'diagpvSlideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Log en mode debug
 */
function log(...args) {
    if (DIAGPV_CONFIG.debugMode) {
        console.log('[DiagPV Sync]', ...args);
    }
}

// ============================================================================
// SYNCHRONISATION AUTOMATIQUE
// ============================================================================

/**
 * Initialise la synchronisation automatique
 */
function initAutoSync() {
    if (!DIAGPV_CONFIG.autoSyncOnComplete) {
        return;
    }
    
    const sessionId = getSessionIdFromUrl();
    if (!sessionId) {
        log('⚠️ Pas de sessionId, auto-sync désactivé');
        return;
    }
    
    // Vérifier si déjà synchronisé
    if (isSynced(sessionId)) {
        log('✅ Session déjà synchronisée, auto-sync ignoré');
        return;
    }
    
    // Charger données audit
    const auditData = loadAuditData(sessionId);
    if (!auditData) {
        log('⚠️ Pas de données audit, auto-sync ignoré');
        return;
    }
    
    // Vérifier si audit terminé
    const progress = auditData.progress || auditData.completion || 0;
    if (progress >= 100) {
        log('🎯 Audit terminé, lancement auto-sync dans', DIAGPV_CONFIG.autoSyncDelay, 'ms');
        
        setTimeout(() => {
            log('🚀 Lancement auto-sync...');
            syncAuditToHub(sessionId).catch(error => {
                console.error('❌ Erreur auto-sync:', error);
            });
        }, DIAGPV_CONFIG.autoSyncDelay);
    } else {
        log(`⏳ Audit en cours (${progress}%), auto-sync en attente`);
    }
}

// ============================================================================
// INITIALISATION
// ============================================================================

// Lancer auto-sync au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoSync);
} else {
    initAutoSync();
}

// Exposer fonction globale
window.syncAuditToHub = syncAuditToHub;
window.DiagPVSync = {
    sync: syncAuditToHub,
    config: DIAGPV_CONFIG,
    isSynced: isSynced,
    getSessionId: getSessionIdFromUrl
};

log('✅ DiagPV Sync Module chargé');
