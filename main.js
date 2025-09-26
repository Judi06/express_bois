document.addEventListener('DOMContentLoaded', function() {
    // --- VARIABLES ET CONSTANTES ---
    const orderModalContainer = document.getElementById('order-modal');
    const orderNowBtn = document.getElementById('order-now');
    const productDetailSection = document.querySelector('.product-detail');
    let isModalLoaded = false;

    if (!orderModalContainer || !orderNowBtn || !productDetailSection) {
        console.error("Éléments de base manquants (conteneur modal, bouton commander, section produit).");
        return;
    }

    // --- GESTION DE LA GALERIE D'IMAGES ---
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.addEventListener('click', function() {
            document.querySelector('.main-image').style.backgroundImage = this.style.backgroundImage;
            if (document.querySelector('.thumbnail.active')) {
                document.querySelector('.thumbnail.active').classList.remove('active');
            }
            this.classList.add('active');
        });
    });

    // --- GESTION DE LA QUANTITÉ SUR LA PAGE ---
    const quantityInputPage = document.getElementById('quantity');
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            let currentQuantity = parseInt(quantityInputPage.value);
            const change = this.textContent.trim() === '+' ? 1 : -1;
            currentQuantity = Math.max(1, currentQuantity + change);
            quantityInputPage.value = currentQuantity;
        });
    });

    // --- GESTION DU MODAL DE COMMANDE ---

    const productName = productDetailSection.dataset.productName;
    const productPrice = parseFloat(productDetailSection.dataset.productPrice);
    const productUnit = productDetailSection.dataset.productUnit;
    const productOptions = JSON.parse(productDetailSection.dataset.productOptions || '{}');

    async function loadModal() {
        if (isModalLoaded) return;
        try {
            const response = await fetch('modal-commande.html');
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
            const html = await response.text();
            orderModalContainer.innerHTML = html;
            isModalLoaded = true;
            setupModalEventListeners();
        } catch (error) {
            console.error("Impossible de charger le modal de commande:", error);
            orderModalContainer.innerHTML = "<p style='color:red; background:white; padding:20px;'>Erreur: Le formulaire de commande n'a pas pu être chargé.</p>";
        }
    }

    function populateAndShowModal() {
        document.getElementById('modal-product-title').textContent = `Commande de ${productName}`;
        document.getElementById('form-product-name').value = productName;
        document.getElementById('form-product-price').value = productPrice;
        document.getElementById('summary-product-name').textContent = `${productName} (${productPrice.toFixed(2)}€ / ${productUnit})`;
        document.getElementById('quantity-order').value = document.getElementById('quantity').value;

        const optionsContainer = document.getElementById('dynamic-options-container');
        optionsContainer.innerHTML = '';
        for (const key in productOptions) {
            const options = productOptions[key];
            if (options.length > 0) {
                optionsContainer.innerHTML += `
                    <div class="form-group">
                        <label for="option-${key}">${key}</label>
                        <select id="option-${key}" name="${key}" required>
                            <option value="">Sélectionnez</option>
                            ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                        </select>
                    </div>`;
            }
        }

        updateOrderSummary();
        orderModalContainer.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function updateOrderSummary() {
        const quantity = parseInt(document.getElementById('quantity-order').value) || 0;
        const deliverySelect = document.getElementById('delivery-type');
        const selectedDeliveryOption = deliverySelect.options[deliverySelect.selectedIndex];
        const deliveryCost = parseFloat(selectedDeliveryOption.dataset.cost) || 0;
        const subTotal = quantity * productPrice;
        const total = subTotal + deliveryCost;

        document.getElementById('summary-quantity-price').textContent = `${quantity} x ${productPrice.toFixed(2)}€ = ${subTotal.toFixed(2)}€`;
        document.getElementById('summary-delivery-cost').textContent = deliveryCost === 0 ? 'Gratuite' : `${deliveryCost.toFixed(2)}€`;
        document.getElementById('summary-total-price').textContent = `${total.toFixed(2)}€`;
    }

    // NOUVEAU : Fonction pour générer le numéro de commande
    function generateOrderNumber() {
        const now = new Date();
        const pad = (num) => num.toString().padStart(2, '0');

        const prefix = 'EB';
        const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        const random = Math.floor(Math.random() * 900) + 100; // Nombre aléatoire entre 100 et 999

        return `${prefix}-${date}-${time}-${ms}-${random}`;
    }

    function setupModalEventListeners() {
        const orderForm = document.getElementById('order-form');

        document.getElementById('close-order').addEventListener('click', () => {
            orderModalContainer.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        orderModalContainer.addEventListener('change', (e) => {
            if (e.target.id === 'quantity-order' || e.target.id === 'delivery-type') {
                updateOrderSummary();
            }
        });

        // NOUVEAU : Écouteur sur la soumission du formulaire
        if (orderForm) {
            orderForm.addEventListener('submit', function() {
                // Générer et assigner le numéro de commande juste avant l'envoi
                const orderNumber = generateOrderNumber();
                document.getElementById('form-order-number').value = orderNumber;

                // Bonus : Sauvegarder le numéro pour l'afficher sur la page de confirmation
                sessionStorage.setItem('lastOrderNumber', orderNumber);
            });
        }
    }

    orderNowBtn.addEventListener('click', async () => {
        await loadModal();
        if (isModalLoaded) {
            populateAndShowModal();
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === orderModalContainer) {
            orderModalContainer.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});
