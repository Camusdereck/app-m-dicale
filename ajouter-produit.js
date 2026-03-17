document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Upload en cours...';
        btn.disabled = true;

        try {
            // 1. Récupération des valeurs
            const nom = document.getElementById('nom-produit').value;
            const description = document.getElementById('desc-produit').value;
            const prix = parseFloat(document.getElementById('prix-produit').value);
            const stock = parseInt(document.getElementById('stock-produit').value);
            const imageFile = document.getElementById('image-produit').files[0];

            let imageUrl = null;

            // 2. Upload de l'image dans Supabase Storage
            if (imageFile) {
                // Créer un nom de fichier unique pour éviter d'écraser d'autres photos
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                    .from('produits_images')
                    .upload(fileName, imageFile);

                if (uploadError) throw new Error("Erreur d'upload de l'image : " + uploadError.message);

                // Récupérer le lien public de l'image fraîchement uploadée
                const { data: urlData } = window.supabaseClient.storage
                    .from('produits_images')
                    .getPublicUrl(fileName);
                
                imageUrl = urlData.publicUrl;
            }

            // 3. Insertion dans la base de données (table produits)
            const { error: dbError } = await window.supabaseClient
                .from('produits')
                .insert([{
                    nom: nom,
                    description: description,
                    prix: prix,
                    stock: stock,
                    image_url: imageUrl
                }]);

            if (dbError) throw new Error("Erreur base de données : " + dbError.message);

            // Succès !
            alert("✅ Produit ajouté avec succès à la boutique !");
            form.reset(); 

        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            // Rétablir le bouton
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
});