/**
 * ==========================================================================
 *                          SYSTÈME DE PANIER - Express Bois
 * ==========================================================================
 * Ce script gère l'ensemble de la logique du panier d'achat :
 * 1. Ajout de produits depuis n'importe quelle page.
 * 2. Stockage du panier dans le localStorage.
 * 3. Mise à jour de l'icône du panier.
 * 4. Affichage dynamique des articles sur la page panier.html.
 * 5. Gestion des quantités et de la suppression.
 * 6. Calcul des totaux.
 * 7. Génération d'un numéro de commande unique.
 * 8. Préparation des données pour l'envoi via FormSubmit.
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- ÉLÉMENTS DU DOM ---
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartEmptyMessage = document.getElementById('cart-empty');
    const cartFullContainer = document.getElementById('cart-full');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotal = document.getElementById('summary-total');
    const orderForm = document.getElementById('order-form');
    const hiddenCartSummaryInput = document.getElementById('hidden-cart-summary');
    const cartQuantityBadge = document.getElementById('cart-quantity-badge');
    // NOUVEAU : On récupère le champ caché pour le numéro de commande
    const orderNumberInput = document.getElementById('order-number');

    // --- FONCTIONS DE BASE DU PANIER (Inchangées) ---
    const getCart = () => {
        const cart = localStorage.getItem('expressBoisCart');
        return cart ? JSON.parse(cart) : {};
    };

    const saveCart = (cart) => {
        localStorage.setItem('expressBoisCart', JSON.stringify(cart));
        updateCartIcon();
    };

    const updateCartIcon = () => {
        const cart = getCart();
        const totalItems = Object.keys(cart).length;
        if (cartQuantityBadge) {
            cartQuantityBadge.textContent = totalItems;
            cartQuantityBadge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    };

    const showNotification = (message) => {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    };

    // --- LOGIQUE D'AJOUT AU PANIER (Inchangée) ---
    const allAddToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    allAddToCartButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const cart = getCart();
            const productContainer = event.target.closest('[data-product-id]');
            if (!productContainer) return;

            const productId = productContainer.dataset.productId;
            const productName = productContainer.dataset.productName;
            const productPrice = parseFloat(productContainer.dataset.productPrice);
            const productImage = productContainer.dataset.productImage;
            const productUnit = productContainer.dataset.productUnit || '';
            const quantityInput = productContainer.querySelector('.quantity-input');
            const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
            
            let selectedOption = null;
            const optionSelect = productContainer.querySelector('.option-select');
            if (optionSelect) {
                const optionLabel = optionSelect.previousElementSibling.textContent.replace(':', '').trim();
                const optionValue = optionSelect.value;
                selectedOption = { label: optionLabel, value: optionValue };
            }

            const cartItemId = selectedOption ? `${productId}_${optionSelect.value.replace(/\s/g, '-')}` : productId;

            if (cart[cartItemId]) {
                cart[cartItemId].quantity += quantity;
            } else {
                cart[cartItemId] = { id: productId, name: productName, price: productPrice, quantity: quantity, image: productImage, unit: productUnit, option: selectedOption };
            }

            saveCart(cart);
            showNotification(`"${productName}" a été ajouté à votre panier !`);
        });
    });

    // --- LOGIQUE DE LA PAGE PANIER (Inchangée) ---
    const displayCart = () => {
        const cart = getCart();
        const cartItemIds = Object.keys(cart);

        if (cartItemIds.length === 0) {
            if (cartEmptyMessage) cartEmptyMessage.style.display = 'block';
            if (cartFullContainer) cartFullContainer.style.display = 'none';
            return;
        }
        
        if (cartEmptyMessage) cartEmptyMessage.style.display = 'none';
        if (cartFullContainer) cartFullContainer.style.display = 'block';

        cartItemsContainer.innerHTML = '';
        let subtotal = 0;

        cartItemIds.forEach(itemId => {
            const item = cart[itemId];
            const itemSubtotal = item.price * item.quantity;
            subtotal += itemSubtotal;
            const cartItemHTML = `<div class="cart-item" data-item-id="${itemId}"><div class="cart-item-details"><div class="cart-item-image" style="background-image: url('${item.image}')"></div><div class="cart-item-info"><div class="item-name">${item.name}</div>${item.option ? `<div class="item-option">${item.option.label}: ${item.option.value}</div>` : ''}<button class="remove-item-btn">Supprimer</button></div></div><div class="cart-item-quantity"><input type="number" class="quantity-input" value="${item.quantity}" min="1"></div><div class="cart-item-subtotal">${itemSubtotal.toFixed(2).replace('.', ',')}€</div></div>`;
            cartItemsContainer.innerHTML += cartItemHTML;
        });

        summarySubtotal.textContent = `${subtotal.toFixed(2).replace('.', ',')}€`;
        summaryTotal.textContent = `${subtotal.toFixed(2).replace('.', ',')}€`;
    };

    if (cartItemsContainer) {
        displayCart();
        cartItemsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-item-btn')) {
                const itemId = event.target.closest('.cart-item').dataset.itemId;
                let cart = getCart();
                delete cart[itemId];
                saveCart(cart);
                displayCart();
            }
        });
        cartItemsContainer.addEventListener('change', (event) => {
            if (event.target.classList.contains('quantity-input')) {
                const itemId = event.target.closest('.cart-item').dataset.itemId;
                const newQuantity = parseInt(event.target.value);
                let cart = getCart();
                if (newQuantity > 0) {
                    cart[itemId].quantity = newQuantity;
                } else {
                    delete cart[itemId];
                }
                saveCart(cart);
                displayCart();
            }
        });
    }

    // ==========================================================================
    // MODIFICATION : Logique du formulaire de commande
    // ==========================================================================

    /**
     * Génère un numéro de commande unique basé sur la date, l'heure et un nombre aléatoire.
     * @returns {string} Un numéro de commande au format EB-YYYYMMDD-HHMMSS-XXX
     */
    const generateOrderNumber = () => {
        const now = new Date();
        const pad = (num) => num.toString().padStart(2, '0');
        
        const prefix = 'EB';
        const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const random = Math.floor(Math.random() * 900) + 100; // Aléatoire entre 100 et 999
        
        return `${prefix}-${date}-${time}-${random}`;
    };

    if (orderForm) {
        orderForm.addEventListener('submit', (event) => {
            // 1. Préparer le récapitulatif du panier pour l'email
            const cart = getCart();
            let summaryText = "Récapitulatif de la commande :\n\n";
            let total = 0;

            Object.values(cart).forEach(item => {
                const optionText = item.option ? ` (${item.option.value})` : '';
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                summaryText += `- ${item.name}${optionText} | Quantité: ${item.quantity} | Sous-total: ${itemTotal.toFixed(2)}€\n`;
            });

            summaryText += `\nTOTAL DE LA COMMANDE : ${total.toFixed(2)}€`;
            hiddenCartSummaryInput.value = summaryText;

            // 2. Générer le numéro de commande
            const newOrderNumber = generateOrderNumber();
            
            // 3. Injecter le numéro dans le champ caché du formulaire
            if (orderNumberInput) {
                orderNumberInput.value = newOrderNumber;
            }
            
            // 4. Sauvegarder le numéro dans sessionStorage pour la page de confirmation
            sessionStorage.setItem('lastOrderNumber', newOrderNumber);

            // 5. Vider le panier dans le localStorage
            localStorage.removeItem('expressBoisCart');
            
            // Le formulaire s'enverra normalement après l'exécution de ce script.
        });
    }

    // --- INITIALISATION ---
    updateCartIcon();
});
