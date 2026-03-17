// dashboard-medecin.js - VERSION FINALE (Aperçu des détails inclus)

// On crée une carte pour mémoriser les RDV
let rdvDocDataMap = {};

document.addEventListener('DOMContentLoaded', () => {
    loadDoctorInfo();
    fetchDoctorAppointments();
    calculateMonthlyRevenue();
    checkUnreadMessages();
    setupDoctorUI();
    initDocSidebarNavigation();
});

async function loadDoctorInfo() {
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = "./connexion.html";
        return;
    }

    const { data: doctor } = await window.supabaseClient
        .from('medecins')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();

    if (doctor) {
        const nomComplet = `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`;
        document.getElementById('user-name').textContent = nomComplet;
        const welcomeEl = document.getElementById('welcome-message');
        if(welcomeEl) welcomeEl.textContent = `Bonjour ${nomComplet}, bienvenue !`;
    }
}

async function fetchDoctorAppointments() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    const { data: doctorInfo } = await window.supabaseClient.from('medecins').select('last_name').eq('id', user.id).maybeSingle();
    const nomDoc = doctorInfo && doctorInfo.last_name ? `Dr. ${doctorInfo.last_name}` : 'votre médecin';

    const { data: appointments, error } = await window.supabaseClient
        .from('rendez_vous')
        .select(`id, statut, motif, date_heure, type_consultation, commune, adresse_exacte, patients ( id, first_name, last_name )`)
        .eq('medecin_id', user.id)
        .order('date_heure', { ascending: false }); 

    const upcomingContainer = document.getElementById('doc-upcoming');
    const historyContainer = document.getElementById('doc-history');
    const heroUpcomingContainer = document.getElementById('hero-upcoming-appointments'); 
    
    if(!upcomingContainer || !historyContainer) return;
    upcomingContainer.innerHTML = '';
    historyContainer.innerHTML = '';
    if(heroUpcomingContainer) heroUpcomingContainer.innerHTML = ''; 

    let upcomingCount = 0;
    let historyCount = 0;
    let heroCount = 0; 

    if (appointments && appointments.length > 0) {
        appointments.forEach(rdv => {
            // On sauvegarde le rdv dans la mémoire globale
            rdvDocDataMap[rdv.id] = rdv;

            const patient = rdv.patients;
            const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}` : 'Patient inconnu';
            const patientId = patient ? patient.id : '#';

            const dateObj = new Date(rdv.date_heure);
            const dateFormatee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});

            let badgeClass = 'bg-info';
            let badgeText = rdv.statut;
            let actionsHTML = '';

            const isDomicile = rdv.type_consultation === 'domicile';
            const typeBadge = isDomicile 
                ? `<span class="badge bg-danger ms-2"><i class="fas fa-ambulance me-1"></i>Domicile</span>`
                : `<span class="badge bg-primary ms-2"><i class="fas fa-video me-1"></i>Vidéo</span>`;
            
            if (rdv.statut === 'en_attente') {
                badgeClass = 'bg-warning text-dark';
                badgeText = 'En attente';
                // MISE À JOUR : Le bouton principal est "Détails"
                actionsHTML = `
                    <button class="btn btn-outline-primary btn-sm flex-fill" onclick="showDocRdvDetails('${rdv.id}')"><i class="fas fa-eye me-1"></i> Voir les détails</button>
                `;
            } else if (rdv.statut === 'confirme') {
                badgeClass = 'bg-success';
                badgeText = 'Confirmé';
                
                let messageWhatsApp = '';
                if (isDomicile) {
                    messageWhatsApp = encodeURIComponent(`Bonjour ${patientName}, je suis le ${nomDoc}. J'ai bien reçu votre demande de visite à domicile à ${rdv.commune}. Je vous contacte pour organiser l'heure exacte de mon passage.`);
                } else {
                    messageWhatsApp = encodeURIComponent(`Bonjour ${patientName}, je suis le ${nomDoc} suite à votre demande de téléconsultation sur MediConnect.`);
                }

                actionsHTML = `
                    <div class="d-flex gap-2 w-100 flex-wrap">
                        <a href="./dossier-patient-medecin.html?id=${patientId}" class="btn btn-secondary btn-sm flex-fill" title="Dossier Médical"><i class="fas fa-folder-open me-1"></i> Dossier</a>
                        <a href="https://wa.me/?text=${messageWhatsApp}" target="_blank" class="btn btn-success btn-sm flex-fill" style="background-color: #25D366; border-color: #25D366;" title="Contacter sur WhatsApp"><i class="fab fa-whatsapp me-1"></i> Contacter</a>
                        <a href="./creer-ordonnance.html?consultation_id=${rdv.id}" class="btn btn-primary btn-sm flex-fill" title="Clôturer et Prescrire"><i class="fas fa-pills me-1"></i> Prescrire</a>
                    </div>
                `;
            } else if (rdv.statut === 'termine') {
                badgeClass = 'bg-secondary';
                badgeText = 'Terminé';
                actionsHTML = `
                    <a href="./dossier-patient-medecin.html?id=${patientId}" class="btn btn-outline-secondary btn-sm w-100"><i class="fas fa-history me-1"></i> Voir le dossier du patient</a>
                `;
            } else {
                badgeClass = 'bg-danger';
                badgeText = 'Annulé';
                actionsHTML = `<span class="text-danger small">Rendez-vous annulé</span>`;
            }

            const cardHTML = `
                <div class="appointment-card mb-4 p-3 border rounded shadow-sm">
                    <div class="appointment-details">
                        <div class="d-flex justify-content-between mb-3 border-bottom pb-2">
                            <div>
                                <span class="fw-bold text-primary"><i class="bi bi-calendar-event me-2"></i>${dateFormatee}</span>
                                ${typeBadge}
                            </div>
                            <span class="badge ${badgeClass}">${badgeText}</span>
                        </div>
                        <div class="doctor-info d-flex align-items-start mb-3">
                            <div class="doctor-avatar bg-secondary text-white rounded-circle p-2 me-3 mt-1" style="width:45px; height:45px; display:flex; align-items:center; justify-content:center;">
                                ${patientName.substring(0, 2).toUpperCase()}
                            </div>
                            <div class="doctor-details flex-grow-1">
                                <h5 class="mb-1 fw-bold">Patient : ${patientName}</h5>
                                <p class="mb-1 text-muted small"><strong>Motif :</strong> ${rdv.motif || 'Aucun motif renseigné'}</p>
                            </div>
                        </div>
                        <div class="appointment-actions w-100 mt-2">
                            ${actionsHTML}
                        </div>
                    </div>
                </div>
            `;

            if (rdv.statut === 'termine' || rdv.statut === 'annule') {
                historyContainer.innerHTML += cardHTML;
                historyCount++;
            } else {
                upcomingContainer.innerHTML += cardHTML;
                upcomingCount++;
                
                if (heroUpcomingContainer && heroCount < 3) {
                    heroUpcomingContainer.innerHTML += `
                        <div class="list-group-item d-flex justify-content-between align-items-center p-3">
                            <div class="d-flex align-items-center">
                                <div class="bg-light rounded-circle p-2 me-3 text-primary"><i class="fas fa-user"></i></div>
                                <div>
                                    <h6 class="mb-0 fw-bold">${patientName} ${typeBadge}</h6>
                                    <small class="text-muted">${dateFormatee}</small>
                                </div>
                            </div>
                            <span class="badge ${badgeClass} rounded-pill">${badgeText}</span>
                        </div>
                    `;
                    heroCount++;
                }
            }
        });
    }
    
    if(upcomingCount === 0) upcomingContainer.innerHTML = '<p class="text-center text-muted py-4">Aucun rendez-vous à venir.</p>';
    if(historyCount === 0) historyContainer.innerHTML = '<p class="text-center text-muted py-4">Votre historique est vide.</p>';

    if (heroUpcomingContainer && heroCount === 0) {
        heroUpcomingContainer.innerHTML = '<div class="p-4 text-center text-muted"><i class="fas fa-coffee fs-3 mb-2 d-block"></i>Aucun rendez-vous prévu. Reposez-vous bien !</div>';
    }

    const summaryUpcomingCount = document.getElementById('summary-upcoming-count');
    if (summaryUpcomingCount) summaryUpcomingCount.textContent = upcomingCount;
}

// NOUVELLE FONCTION : Afficher l'aperçu dans le Modal
window.showDocRdvDetails = function(rdvId) {
    const rdv = rdvDocDataMap[rdvId];
    if (!rdv) return;

    const patientName = rdv.patients ? `${rdv.patients.first_name || ''} ${rdv.patients.last_name || ''}` : 'Patient Inconnu';
    document.getElementById('doc-modal-patient-name').textContent = patientName;
    document.getElementById('doc-modal-patient-initials').textContent = patientName.substring(0, 2).toUpperCase();

    const dateObj = new Date(rdv.date_heure);
    const dateFormatee = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const heureFormatee = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('doc-modal-date').textContent = `${dateFormatee.charAt(0).toUpperCase() + dateFormatee.slice(1)} à ${heureFormatee}`;

    // On prépare le contenu visuel
    const isDomicile = rdv.type_consultation === 'domicile';
    document.getElementById('doc-modal-type-badge').innerHTML = isDomicile 
        ? '<span class="badge bg-danger fs-6 px-3 py-2 rounded-pill"><i class="fas fa-ambulance me-2"></i>Visite à Domicile demandée</span>'
        : '<span class="badge bg-primary fs-6 px-3 py-2 rounded-pill"><i class="fas fa-video me-2"></i>Téléconsultation demandée</span>';

    let contentHtml = `
        <div class="mb-3">
            <h6 class="fw-bold text-muted mb-1">Motif :</h6>
            <p class="mb-0 text-dark bg-light p-3 rounded border">${rdv.motif || 'Aucun motif renseigné'}</p>
        </div>
    `;

    if (isDomicile) {
        contentHtml += `
            <div>
                <h6 class="fw-bold text-muted mb-1">Localisation :</h6>
                <div class="bg-danger bg-opacity-10 p-3 rounded border border-danger">
                    <p class="mb-1 text-dark"><strong>Commune :</strong> ${rdv.commune || 'Non précisée'}</p>
                    <p class="mb-0 text-dark"><strong>Adresse :</strong> ${rdv.adresse_exacte || 'Non précisée'}</p>
                </div>
            </div>
        `;
    }

    document.getElementById('doc-modal-content').innerHTML = contentHtml;

    // On prépare les boutons d'action avec les événements onclick
    document.getElementById('doc-modal-footer-actions').innerHTML = `
        <button type="button" class="btn btn-outline-danger" onclick="updateRdvStatus('${rdv.id}', 'annule')">Refuser</button>
        <button type="button" class="btn btn-success fw-bold px-4" onclick="updateRdvStatus('${rdv.id}', 'confirme')">Accepter la demande</button>
    `;

    const modal = new bootstrap.Modal(document.getElementById('docRdvDetailsModal'));
    modal.show();
};

// NOUVELLE FONCTION : Mettre à jour le statut depuis le Modal
window.updateRdvStatus = async function(rdvId, action) {
    if (confirm(`Voulez-vous vraiment ${action === 'confirme' ? 'accepter' : 'refuser'} ce rendez-vous ?`)) {
        const { error } = await window.supabaseClient.from('rendez_vous').update({ statut: action }).eq('id', rdvId);
        if (!error) {
            window.location.reload(); // On rafraîchit la page pour voir les nouveaux boutons (Dossier, WhatsApp)
        } else {
            alert("Une erreur est survenue.");
        }
    }
};

window.switchDocTab = function(event, tabId) {
    document.querySelectorAll('.doc-tab-panel').forEach(panel => panel.style.display = 'none');
    document.querySelectorAll('.tab-btn-med').forEach(btn => {
        btn.classList.remove('btn-primary', 'active');
        btn.classList.add('btn-outline-primary');
    });
    
    document.getElementById(tabId).style.display = 'block';
    event.currentTarget.classList.remove('btn-outline-primary');
    event.currentTarget.classList.add('btn-primary', 'active');
}

function setupDoctorUI() {
    const userWidget = document.querySelector('.user-widget');
    const dropdownMenu = document.querySelector('.dropdown-navbar-menu');

    if (userWidget && dropdownMenu) {
        // Ouvre/Ferme le menu au CLIC sur le widget
        userWidget.addEventListener('click', (event) => {
            event.stopPropagation(); // Empêche le clic de se propager au document
            dropdownMenu.classList.toggle('show');
        });
    }

    // Ferme le menu si on clique en dehors
    window.addEventListener('click', (event) => {
        if (dropdownMenu && dropdownMenu.classList.contains('show')) {
            // Vérifie que le clic n'a pas eu lieu dans le menu lui-même
            if (!dropdownMenu.contains(event.target) && !userWidget.contains(event.target)) {
                dropdownMenu.classList.remove('show');
            }
        }
    });

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault();
            await window.supabaseClient.auth.signOut();
            window.location.href = "./connexion.html";
        });
    }

    // === GESTION DU MENU BURGER MOBILE (SIDEBAR) ===
    const toggleBtn = document.querySelector('.toggle');
    const sidebar = document.querySelector('.sidebar');
    const iconOuvrir = document.querySelector('.ouvrir');
    const iconFermer = document.querySelector('.fermer');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active'); // Fait glisser la sidebar

            // Alterne l'affichage entre les 3 barres et la croix
            if (sidebar.classList.contains('active')) {
                if (iconOuvrir) iconOuvrir.style.display = 'none';
                if (iconFermer) iconFermer.style.display = 'block';
            } else {
                if (iconOuvrir) iconOuvrir.style.display = 'block';
                if (iconFermer) iconFermer.style.display = 'none';
            }
        });

        // Optionnel : Fermer le menu si on clique sur un lien sur mobile
        const sidebarLinks = sidebar.querySelectorAll('a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 991) {
                    sidebar.classList.remove('active');
                    if (iconOuvrir) iconOuvrir.style.display = 'block';
                    if (iconFermer) iconFermer.style.display = 'none';
                }
            });
        });
    }
}

async function calculateMonthlyRevenue() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    const date = new Date();
    const premierJourDuMois = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();

    const { data: factures, error } = await window.supabaseClient
        .from('factures')
        .select('montant')
        .eq('medecin_id', user.id)
        .eq('statut', 'payee')
        .gte('created_at', premierJourDuMois); 

    const revenueContainer = document.getElementById('monthly-revenue-container'); 
    const summaryRevenueContainer = document.getElementById('summary-revenue'); 

    if (error) {
        if(revenueContainer) revenueContainer.innerHTML = '<h4 class="text-danger">Erreur</h4>';
        if(summaryRevenueContainer) summaryRevenueContainer.textContent = 'Erreur';
        return;
    }

    let totalMensuel = 0;
    if (factures && factures.length > 0) {
        factures.forEach(fac => {
            totalMensuel += Number(fac.montant); 
        });
    }

    const formattedTotal = `${totalMensuel.toLocaleString('fr-FR')} FCFA`;

    if(revenueContainer) revenueContainer.innerHTML = `<h2 class="text-success fw-bold">${formattedTotal}</h2>`;
    if(summaryRevenueContainer) summaryRevenueContainer.textContent = formattedTotal;
}

async function checkUnreadMessages() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    const { count, error } = await window.supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('destinataire_id', user.id)
        .eq('lu', false);

    const badge = document.getElementById('msg-badge');
    const summaryMessages = document.getElementById('summary-messages');

    if (count !== null) {
        if (badge && count > 0) {
            badge.textContent = count;
            badge.classList.remove('d-none'); 
        }
        if (summaryMessages) {
            summaryMessages.textContent = count; 
        }
    }

    window.supabaseClient
        .channel('menu-notifications')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `destinataire_id=eq.${user.id}` 
        }, payload => {
            let currentCount = parseInt(badge ? badge.textContent : 0) || 0;
            let newCount = currentCount + 1;
            
            if (badge) {
                badge.textContent = newCount;
                badge.classList.remove('d-none');
            }
            if (summaryMessages) {
                summaryMessages.textContent = newCount;
            }
        })
        .subscribe();
}

function initDocSidebarNavigation() {
    const menuItems = document.querySelectorAll(".sidebar li[data-section]");
    const sections = document.querySelectorAll(".dashboard-section");
    if (!menuItems.length || !sections.length) return;

    sections.forEach(s => {
        if (!s.classList.contains('active')) {
            s.style.display = 'none'; 
        } else {
            s.style.display = 'block';
        }
    });

    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault(); 
        
        const sectionId = item.getAttribute('data-section');
        const target = document.getElementById(sectionId);
        if (!target) return;

        sections.forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });

        target.classList.add('active');
        target.style.display = 'block';

        menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
}