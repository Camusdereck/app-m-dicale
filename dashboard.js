// dashboard.js - VERSION FINALE (Paiement + Génération Code OTP)

let consultationsDataMap = {};
let rdvDataMap = {};

document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    fetchAppointments();
    fetchOrdonnances();
    fetchFacturesPreview();
    fetchMedicalRecord();
    checkUnreadMessages();
    setupUI();
    initSidebarNavigation();
});

// ==========================================
// 1. INFOS UTILISATEUR
// ==========================================
async function loadUserInfo() {
    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
        
        if (authError || !user) {
            window.location.href = "./connexion.html";
            return;
        }

        const { data: patient, error: dbError } = await window.supabaseClient
            .from('patients')
            .select('first_name, last_name, engagement_signe')
            .eq('id', user.id)
            .maybeSingle(); 

        if (!dbError && patient) {
            if (patient.engagement_signe !== true) {
                window.location.href = "./engagement.html";
                return; 
            }

            const firstName = patient.first_name || 'Patient';
            const lastName = patient.last_name || '';
            
            if (document.getElementById('user-name')) document.getElementById('user-name').textContent = `${firstName} ${lastName}`;
            if (document.getElementById('welcome-message')) {
                document.getElementById('welcome-message').textContent = `Bonjour ${firstName}, content de vous revoir !`;
            }
        }
    } catch (error) {
        console.error("Erreur loadUserInfo:", error);
    }
}

// ==========================================
// 2. RENDEZ-VOUS & AFFICHAGE DU CODE OTP
// ==========================================
async function fetchAppointments() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        // On ajoute "code_consultation" dans la requête
        const { data: appointments, error } = await window.supabaseClient
            .from('rendez_vous')
            .select(`id, statut, motif, date_heure, type_consultation, commune, adresse_exacte, montant_total, statut_paiement, code_consultation, medecins ( first_name, last_name, specialite )`)
            .eq('patient_id', user.id)
            .order('date_heure', { ascending: false });

        if (error) return;

        const upcomingContainer = document.getElementById('upcoming-appointments');
        const historyContainer = document.getElementById('appointment-history');
        const summaryUpcoming = document.getElementById('summary-patient-upcoming'); 
        const heroUpcomingContainer = document.getElementById('hero-patient-upcoming'); 
        
        if(!upcomingContainer || !historyContainer) return;

        upcomingContainer.innerHTML = '';
        historyContainer.innerHTML = '';
        if(heroUpcomingContainer) heroUpcomingContainer.innerHTML = '';

        let upcomingCount = 0;
        let historyCount = 0;
        let heroCount = 0; 

        appointments.forEach(rdv => {
            rdvDataMap[rdv.id] = rdv;

            const nomComplet = rdv.medecins ? `Dr. ${rdv.medecins.first_name || ''} ${rdv.medecins.last_name || ''}` : 'Médecin non spécifié';
            const dateObj = new Date(rdv.date_heure);
            const dateFormatee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});

            let badgeClass = 'bg-info';
            if (rdv.statut === 'en_attente') badgeClass = 'bg-warning text-dark';
            if (rdv.statut === 'confirme') badgeClass = 'bg-success';
            if (rdv.statut === 'termine') badgeClass = 'bg-secondary';
            
            let actionsHTML = `<button class="btn btn-sm btn-outline-primary me-2 details-btn" onclick="showRdvDetails('${rdv.id}')"><i class="fas fa-eye"></i> Détails</button>`;
            let otpHTML = ''; // Pour stocker l'affichage du code secret

            const prixReel = rdv.montant_total || 5000;

            if (rdv.statut_paiement === 'en_attente' && rdv.statut !== 'annule') {
                actionsHTML = `
                    <button class="btn btn-success btn-sm fw-bold me-2 shadow-sm" onclick="simulerPaiement('${rdv.id}', ${prixReel})">
                        <i class="fas fa-credit-card me-1"></i> Payer ${prixReel.toLocaleString('fr-FR')} F
                    </button>
                    <button class="btn btn-outline-danger btn-sm cancel-btn" data-id="${rdv.id}"><i class="fas fa-times"></i></button>
                `;
                badgeClass = 'bg-danger';
                rdv.statut_affichage = 'Paiement requis'; 
            } else if (rdv.statut !== 'termine' && rdv.statut !== 'annule') {
                actionsHTML += `<button class="btn btn-outline-danger btn-sm cancel-btn" data-id="${rdv.id}"><i class="fas fa-times"></i> Annuler</button>`;
                rdv.statut_affichage = rdv.statut;
                
                // Si payé et pas terminé, on affiche le code secret
                if (rdv.code_consultation) {
                    otpHTML = `
                        <div class="mt-3 p-3 bg-success bg-opacity-10 border border-success rounded text-center">
                            <span class="d-block text-success small fw-bold mb-1"><i class="fas fa-lock me-1"></i>Votre code secret pour le médecin :</span>
                            <span class="fs-3 fw-bold text-success" style="letter-spacing: 5px;">${rdv.code_consultation}</span>
                        </div>
                    `;
                }
            } else {
                rdv.statut_affichage = rdv.statut;
            }

            const isDomicile = rdv.type_consultation === 'domicile';
            const typeIcon = isDomicile ? '<i class="fas fa-ambulance text-danger" title="À domicile"></i>' : '<i class="fas fa-video text-primary" title="Vidéo"></i>';

            const rdvCardHTML = `
                <div class="appointment-card mb-3 p-3 border rounded shadow-sm bg-white" id="rdv-${rdv.id}">
                    <div class="appointment-header d-flex justify-content-between border-bottom pb-2 mb-2">
                        <div class="appointment-datetime fw-bold text-primary">
                            <i class="bi bi-calendar-event me-2"></i>${dateFormatee} <span class="ms-2">${typeIcon}</span>
                        </div>
                        <div class="badge ${badgeClass}">${rdv.statut_affichage}</div>
                    </div>
                    <div class="appointment-details d-flex justify-content-between align-items-center mt-3">
                        <div class="doctor-info d-flex align-items-center">
                            <div class="doctor-avatar bg-primary text-white rounded-circle p-2 me-3" style="width: 40px; height: 40px; display:flex; align-items:center; justify-content:center;">
                                ${nomComplet.substring(4, 6).toUpperCase()}
                            </div>
                            <div class="doctor-details">
                                <h5 class="mb-0">${nomComplet}</h5>
                                <small class="text-muted">Motif : ${rdv.motif || 'Non précisé'}</small>
                            </div>
                        </div>
                        <div class="appointment-actions">
                            ${actionsHTML}
                        </div>
                    </div>
                    ${otpHTML} </div>
            `;

            if (rdv.statut === 'termine' || rdv.statut === 'annule') {
                historyContainer.innerHTML += rdvCardHTML;
                historyCount++;
            } else {
                upcomingContainer.innerHTML += rdvCardHTML;
                upcomingCount++;

                if (heroUpcomingContainer && heroCount < 1) {
                    heroUpcomingContainer.innerHTML = `
                        <div class="list-group-item d-flex justify-content-between align-items-center p-4">
                            <div class="d-flex align-items-center">
                                <div class="doctor-avatar bg-primary text-white rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                                    ${nomComplet.substring(4, 6).toUpperCase()}
                                </div>
                                <div>
                                    <h5 class="mb-1 fw-bold">${nomComplet} ${typeIcon}</h5>
                                    <p class="text-muted mb-0"><i class="bi bi-calendar-event me-2"></i>${dateFormatee}</p>
                                </div>
                            </div>
                            <span class="badge ${badgeClass} fs-6 px-3 py-2 rounded-pill">${rdv.statut_affichage}</span>
                        </div>
                    `;
                    heroCount++;
                }
            }
        });

        if (upcomingCount === 0) upcomingContainer.innerHTML = '<p class="text-center text-muted">Vous n\'avez aucun rendez-vous à venir.</p>';
        if (historyCount === 0) historyContainer.innerHTML = '<p class="text-center text-muted">Votre historique est vide.</p>';
        
        if (summaryUpcoming) summaryUpcoming.textContent = upcomingCount;
        if (heroUpcomingContainer && heroCount === 0) {
            heroUpcomingContainer.innerHTML = '<div class="p-4 text-center text-muted"><i class="fas fa-calendar-times fs-3 mb-2 d-block"></i>Aucun rendez-vous prévu pour le moment.</div>';
        }

        document.querySelectorAll('.cancel-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const rdvId = button.getAttribute('data-id');
                if (confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ?")) {
                    const { error } = await window.supabaseClient.from('rendez_vous').update({ statut: 'annule' }).eq('id', rdvId);
                    if (!error) window.location.reload(); 
                }
            });
        });
    } catch (error) {
        console.error("Erreur fetchAppointments:", error);
    }
}

// ==========================================
// 3. GÉNÉRATION DU CODE OTP (LORS DU PAIEMENT)
// ==========================================
window.simulerPaiement = async function(rdvId, montant) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user || !user.email) {
        alert("Erreur : Impossible de récupérer votre email pour le paiement.");
        return;
    }

    let handler = PaystackPop.setup({
        key: 'pk_live_54950319772acc4e08a83f4e5946f6b1760ed17e', 
        email: user.email,
        amount: montant * 100, 
        currency: 'XOF', 
        ref: 'MDC_' + Math.floor((Math.random() * 1000000000) + 1), 
        callback: function(response) {
            (async () => {
                // On génère un code secret à 4 chiffres (entre 1000 et 9999)
                const codeGenere = Math.floor(1000 + Math.random() * 9000).toString();

                // On met à jour le RDV avec le paiement ET le code secret
                const { error } = await window.supabaseClient
                    .from('rendez_vous')
                    .update({ 
                        statut_paiement: 'paye_plateforme',
                        code_consultation: codeGenere
                    })
                    .eq('id', rdvId);

                if (!error) {
                    alert('Paiement réussi ! Votre code secret a été généré.');
                    window.location.reload(); 
                } else {
                    alert("Paiement réussi, mais erreur de mise à jour du rendez-vous.");
                    console.error(error);
                }
            })();
        },
        onClose: function() {
            alert('Vous avez annulé le paiement. Votre rendez-vous n\'est pas encore confirmé.');
        }
    });

    handler.openIframe();
}

// ==========================================
// 4. DÉTAILS MODAL
// ==========================================
window.showRdvDetails = function(rdvId) {
    try {
        const rdv = rdvDataMap[rdvId];
        if (!rdv) return;

        const nomComplet = `Dr. ${rdv.medecins?.first_name || ''} ${rdv.medecins?.last_name || ''}`;
        if(document.getElementById('modal-doc-name')) document.getElementById('modal-doc-name').textContent = nomComplet;
        if(document.getElementById('modal-doc-spec')) document.getElementById('modal-doc-spec').textContent = rdv.medecins?.specialite || 'Spécialité non précisée';

        const dateObj = new Date(rdv.date_heure);
        const dateFormatee = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const heureFormatee = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        if(document.getElementById('modal-date')) document.getElementById('modal-date').textContent = `${dateFormatee.charAt(0).toUpperCase() + dateFormatee.slice(1)} à ${heureFormatee}`;

        let badgeHTML = '';
        if (rdv.statut === 'en_attente') {
            badgeHTML = '<span class="badge bg-warning text-dark fs-6 px-3 py-2 rounded-pill"><i class="fas fa-hourglass-half me-2"></i>En attente</span>';
        } else if (rdv.statut === 'confirme') {
            badgeHTML = '<span class="badge bg-success fs-6 px-3 py-2 rounded-pill"><i class="fas fa-check me-2"></i>Confirmé</span>';
        } else {
            badgeHTML = `<span class="badge bg-secondary fs-6 px-3 py-2 rounded-pill">${rdv.statut}</span>`;
        }
        if(document.getElementById('modal-status-badge')) document.getElementById('modal-status-badge').innerHTML = badgeHTML;

        let detailsHtml = `
            <div class="p-3 bg-light rounded border mb-3">
                <h6 class="fw-bold text-primary-dark mb-2">Motif de la consultation :</h6>
                <p class="mb-0 text-dark">${rdv.motif || 'Aucun motif renseigné.'}</p>
            </div>
        `;

        if (rdv.type_consultation === 'domicile') {
            detailsHtml += `
            <div class="p-3 bg-danger bg-opacity-10 border border-danger rounded mb-3">
                <h6 class="fw-bold text-danger mb-2"><i class="fas fa-ambulance me-2"></i>Consultation à domicile</h6>
                <p class="mb-1 text-dark"><strong>Commune :</strong> ${rdv.commune || 'Non précisée'}</p>
                <p class="mb-0 text-dark"><strong>Adresse :</strong> ${rdv.adresse_exacte || 'Non précisée'}</p>
            </div>`;
        } else {
            detailsHtml += `
            <div class="p-3 bg-primary bg-opacity-10 border border-primary rounded mb-3">
                <h6 class="fw-bold text-primary mb-0"><i class="fas fa-video me-2"></i>Téléconsultation Vidéo</h6>
            </div>`;
        }

        if (rdv.code_consultation && rdv.statut !== 'termine' && rdv.statut !== 'annule') {
            detailsHtml += `
            <div class="p-3 bg-success text-white rounded text-center shadow-sm">
                <p class="mb-1 small fw-bold"><i class="fas fa-lock me-1"></i> Code secret de la consultation :</p>
                <h3 class="mb-0 fw-bold" style="letter-spacing: 5px;">${rdv.code_consultation}</h3>
            </div>`;
        }

        if(document.getElementById('modal-motif')) document.getElementById('modal-motif').innerHTML = detailsHtml;

        const modalEl = document.getElementById('rdvDetailsModal');
        if (modalEl) { new bootstrap.Modal(modalEl).show(); }
    } catch (e) { console.error(e); }
};

// ==========================================
// 5. ORDONNANCES ET PDF
// ==========================================
async function fetchOrdonnances() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data: consultations, error } = await window.supabaseClient
            .from('consultations')
            .select(`id, created_at, diagnostic, ordonnance, poids, taille, tension, medecins (first_name, last_name, specialite)`)
            .eq('patient_id', user.id)
            .not('ordonnance', 'is', null) 
            .order('created_at', { ascending: false });

        const container = document.getElementById('notifications-list-container');
        if (!container) return;
        container.innerHTML = '';

        if (!consultations || consultations.length === 0) {
            container.innerHTML = '<p class="text-muted small">Aucune ordonnance récente.</p>';
            return;
        }

        consultations.forEach(cons => {
            consultationsDataMap[cons.id] = cons;
            const nomDoc = `Dr. ${cons.medecins?.first_name || ''} ${cons.medecins?.last_name || ''}`;
            const dateStr = new Date(cons.created_at).toLocaleDateString('fr-FR');

            const html = `
                <div class="card mb-3 border-0 shadow-sm border-start border-4 border-primary">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="fw-bold mb-0"><i class="fas fa-prescription me-2 text-primary"></i>${nomDoc}</h6>
                            <small class="text-muted">${dateStr}</small>
                        </div>
                        <div class="bg-light p-3 rounded mt-2 border">
                            <span style="white-space: pre-line; color: #333;">${cons.ordonnance}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-danger mt-3 w-100 fw-bold" onclick="downloadOrdonnancePDF('${cons.id}')">
                            <i class="fas fa-file-pdf me-2"></i>Télécharger (PDF)
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    } catch (e) { console.error(e); }
}

window.downloadOrdonnancePDF = function(consultationId) {
    try {
        const cons = consultationsDataMap[consultationId];
        if (!cons) return;

        if(document.getElementById('pdf-doc-name')) document.getElementById('pdf-doc-name').textContent = `Dr. ${cons.medecins?.first_name || ''} ${cons.medecins?.last_name || ''}`;
        if(document.getElementById('pdf-doc-spec')) document.getElementById('pdf-doc-spec').textContent = cons.medecins?.specialite || 'Médecin Généraliste';
        if(document.getElementById('pdf-date')) document.getElementById('pdf-date').textContent = new Date(cons.created_at).toLocaleDateString('fr-FR');
        
        const userNameEl = document.getElementById('user-name');
        const patientName = userNameEl ? userNameEl.textContent : 'Patient';
        if(document.getElementById('pdf-patient-name')) document.getElementById('pdf-patient-name').textContent = patientName;
        
        if(document.getElementById('pdf-poids')) document.getElementById('pdf-poids').textContent = cons.poids ? `${cons.poids} kg` : 'N/A';
        if(document.getElementById('pdf-taille')) document.getElementById('pdf-taille').textContent = cons.taille ? `${cons.taille} cm` : 'N/A';
        if(document.getElementById('pdf-tension')) document.getElementById('pdf-tension').textContent = cons.tension ? `${cons.tension} mmHg` : 'N/A';
        if(document.getElementById('pdf-prescription')) document.getElementById('pdf-prescription').textContent = cons.ordonnance;

        const element = document.getElementById('pdf-template');
        if (!element) return;
        
        const opt = {
            margin:       0,
            filename:     `Ordonnance_${patientName.replace(' ', '_')}_${new Date(cons.created_at).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    } catch (e) { console.error(e); }
};

// ==========================================
// 6. DOSSIER MÉDICAL & FACTURES
// ==========================================
async function fetchMedicalRecord() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data: consultations, error: consError } = await window.supabaseClient
            .from('consultations')
            .select(`id, created_at, diagnostic, ordonnance, poids, taille, tension, medecins(first_name, last_name)`)
            .eq('patient_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);

        if (consultations && consultations.length > 0) {
            const latestCons = consultations[0];
            if(document.getElementById('patient-weight')) document.getElementById('patient-weight').textContent = latestCons.poids ? `${latestCons.poids} kg` : '-- kg';
            if(document.getElementById('patient-height')) document.getElementById('patient-height').textContent = latestCons.taille ? `${latestCons.taille} cm` : '-- cm';
            if(document.getElementById('patient-blood-pressure')) document.getElementById('patient-blood-pressure').textContent = latestCons.tension ? `${latestCons.tension} mmHg` : '--/-- mmHg';
        }

        const consultationsList = document.getElementById('recent-consultations-list');
        const prescriptionsList = document.getElementById('recent-prescriptions-list');
        
        if (!consultationsList || !prescriptionsList) return;

        consultationsList.innerHTML = '';
        prescriptionsList.innerHTML = '';

        if (consError || !consultations || consultations.length === 0) {
            consultationsList.innerHTML = '<p class="text-muted small">Aucune consultation récente.</p>';
            prescriptionsList.innerHTML = '<p class="text-muted small">Aucune ordonnance récente.</p>';
            return;
        }

        consultations.forEach(cons => {
            const nomDoc = `Dr. ${cons.medecins?.first_name || ''} ${cons.medecins?.last_name || ''}`;
            const dateStr = new Date(cons.created_at).toLocaleDateString('fr-FR');

            consultationsList.innerHTML += `
                <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                    <div>
                        <strong class="d-block text-dark small">${nomDoc}</strong>
                        <span class="text-muted" style="font-size: 0.75rem;">${cons.diagnostic || 'Aucun diagnostic saisi'}</span>
                    </div>
                    <span class="badge bg-light text-dark border">${dateStr}</span>
                </div>
            `;

            if (cons.ordonnance) {
                prescriptionsList.innerHTML += `
                    <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                        <div>
                            <strong class="d-block text-primary small"><i class="fas fa-pills me-1"></i>Prescription</strong>
                            <span class="text-muted text-truncate d-inline-block" style="max-width: 150px; font-size: 0.75rem;">${cons.ordonnance}</span>
                        </div>
                        <span class="text-muted" style="font-size: 0.7rem;">${dateStr}</span>
                    </div>
                `;
            }
        });

        if (prescriptionsList.innerHTML === '') {
            prescriptionsList.innerHTML = '<p class="text-muted small">Aucune ordonnance récente.</p>';
        }
    } catch (e) { console.error(e); }
}

async function fetchFacturesPreview() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { count, data: factures, error } = await window.supabaseClient
            .from('factures')
            .select(`id, montant, description, created_at, medecins (first_name, last_name)`, { count: 'exact' })
            .eq('patient_id', user.id)
            .eq('statut', 'en_attente')
            .order('created_at', { ascending: false })
            .limit(3); 

        const summaryFactures = document.getElementById('summary-patient-factures'); 
        if (summaryFactures) summaryFactures.textContent = count || 0;

        const container = document.getElementById('pending-payments-container');
        if (!container) return; 
        container.innerHTML = '';

        if (error || !factures || factures.length === 0) {
            container.innerHTML = '<p class="text-muted small">Vous n\'avez aucune facture en attente.</p>';
            return;
        }

        factures.forEach(fac => {
            const nomDoc = `Dr. ${fac.medecins?.first_name || ''} ${fac.medecins?.last_name || ''}`;
            const montantFormat = fac.montant.toLocaleString('fr-FR') + ' FCFA';
            container.innerHTML += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded bg-white shadow-sm">
                    <div>
                        <strong class="d-block text-dark small">${nomDoc}</strong>
                        <span class="text-muted" style="font-size: 0.75rem;">${fac.description || 'Consultation'}</span>
                    </div>
                    <span class="text-danger fw-bold small">${montantFormat}</span>
                </div>
            `;
        });
    } catch (e) { console.error(e); }
}

async function checkUnreadMessages() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { count, error } = await window.supabaseClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('destinataire_id', user.id)
            .eq('lu', false);

        const badge = document.getElementById('msg-badge');
        const summaryMessages = document.getElementById('summary-patient-messages'); 

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

                if(badge) {
                    badge.textContent = newCount;
                    badge.classList.remove('d-none');
                }
                if(summaryMessages) {
                    summaryMessages.textContent = newCount;
                }
            }).subscribe();
    } catch (e) { console.error(e); }
}

// ==========================================
// 7. UI ET NAVIGATION
// ==========================================
function setupUI() {
    const userWidget = document.querySelector('.user-widget');
    const dropdownMenu = document.querySelector('.dropdown-navbar-menu');

    if (userWidget && dropdownMenu) {
        userWidget.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    }

    window.addEventListener('click', (event) => {
        if (dropdownMenu && dropdownMenu.classList.contains('show')) {
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

    const toggleBtn = document.querySelector('.toggle');
    const sidebar = document.querySelector('.sidebar');
    const iconOuvrir = document.querySelector('.ouvrir');
    const iconFermer = document.querySelector('.fermer');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active'); 

            if (sidebar.classList.contains('active')) {
                if (iconOuvrir) iconOuvrir.style.display = 'none';
                if (iconFermer) iconFermer.style.display = 'block';
            } else {
                if (iconOuvrir) iconOuvrir.style.display = 'block';
                if (iconFermer) iconFermer.style.display = 'none';
            }
        });

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

window.switchTab = function(event, tabName) {
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => panel.classList.remove('active'));

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    const selectedTab = document.getElementById(tabName);
    if (selectedTab) selectedTab.classList.add('active');

    event.currentTarget.classList.add('active');
}

function initSidebarNavigation() {
    const menuItems = document.querySelectorAll(".sidebar li[data-section]");
    const sections = document.querySelectorAll(".dashboard-section");

    if (!menuItems.length || !sections.length) return;

    const hero = document.getElementById('hero');
    if (hero) {
        sections.forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        hero.classList.add('active');
        hero.style.display = 'block';
        
        menuItems.forEach(i => i.classList.remove('active'));
        const homeItem = document.querySelector('.sidebar li[data-section="hero"]');
        if (homeItem) homeItem.classList.add('active');
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
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

            if(e.preventDefault) e.preventDefault();
        });
    });
}