// connexion.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Empêche le rechargement

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // On utilise supabaseClient qui est notre variable globale
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error; // Envoie l'erreur au bloc catch
            }

            alert('Connexion réussie !');
            // Redirige l'utilisateur vers son tableau de bord
            // Tu devras créer cette page "dashboard.html" plus tard
            window.location.href = "/dashboard.html"; 

        } catch (error) {
            console.error("Erreur de connexion :", error);
            alert("Erreur : " + error.message);
        }
    });
});