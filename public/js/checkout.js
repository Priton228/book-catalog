﻿﻿﻿﻿﻿﻿﻿﻿// Страница оформления заказа
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Checkout page loaded');
    initializeCheckoutEventListeners();
    await loadCheckoutData();
    prefillUserData();
});

// Инициализация обработчиков событий
function initializeCheckoutEventListeners() {
    // Форма оформления заказа
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
        console.log('Checkout form listener added');
    }
    
    // Кнопка "Назад к корзине"
    const backToCartBtn = document.getElementById('back-to-cart');
    if (backToCartBtn) {
        backToCartBtn.addEventListener('click', function() {
            window.location.href = '/catalog.html';
        });
        console.log('Back to cart button listener added');
    }
}

// Загрузка данных корзины на страницу оформления
async function loadCheckoutData() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total-amount');
    
    if (cart.length === 0) {
        checkoutItems.innerHTML = '<p class="empty-cart">Корзина пуста</p>';
        checkoutTotal.textContent = '0 р';
        return;
    }
    
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <img class="checkout-item-cover" src="${item.cover || 'https://i.pinimg.com/474x/e2/93/05/e29305e0ee7c3d1ef31ce6f234e194f8.jpg'}" alt="Обложка" onerror="this.onerror=null;this.src='https://i.pinimg.com/474x/e2/93/05/e29305e0ee7c3d1ef31ce6f234e194f8.jpg';"/>
            <div class="checkout-item-info">
                <div class="checkout-item-title">${escapeHtml(item.title)}</div>
                <div class="checkout-item-author">${escapeHtml(item.author)}</div>
            </div>
            <div class="checkout-item-details">
                <div class="checkout-item-quantity">${item.quantity} шт.</div>
                <div class="checkout-item-price">${item.price} р × ${item.quantity} = ${(item.price * item.quantity).toFixed(2)} р</div>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate applicable promotions
    const promotionInfo = await calculateApplicablePromotion(cart, total);
    
    if (promotionInfo && promotionInfo.discount > 0) {
        const discountedTotal = total - promotionInfo.discount;
        checkoutTotal.innerHTML = `
            <div>
                <div style="text-align: right;">
                    Итого: <span style="text-decoration: line-through;">${total.toFixed(2)} р</span> <span style="color: red;">${discountedTotal.toFixed(2)} р</span>
                </div>
                <div style="font-size: 0.9em; color: black; margin-top: 5px; text-align: left;">
                    Акция: ${promotionInfo.name} (${promotionInfo.discountType === 'percent' ? promotionInfo.value + '%' : promotionInfo.value + ' р'})
                </div>
                <div style="font-size: 0.9em; color: black; text-align: left;">
                    Скидка: ${promotionInfo.discount.toFixed(2)} р
                </div>
            </div>
        `;
    } else {
        checkoutTotal.textContent = total.toFixed(2) + ' р';
    }
    
    console.log('Checkout data loaded');
}

// Предзаполнение данных пользователя
function prefillUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (currentUser) {
        document.getElementById('full-name').value = currentUser.full_name || '';
        document.getElementById('email').value = currentUser.email || '';
        // Note: Phone number is not typically stored in user data, so we leave it empty
    }
    
    console.log('User data prefilled');
}

// Обработка отправки формы оформления заказа
async function handleCheckoutSubmit(e) {
    e.preventDefault();
    console.log('Processing checkout...');
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        showMessage('Корзина пуста', 'error');
        return;
    }
    
    // Сбор данных формы
    const formData = {
        full_name: document.getElementById('full-name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        shipping_address: document.getElementById('shipping-address').value,
        shipping_method: document.getElementById('shipping-method').value,
        payment_method: document.getElementById('payment-method').value,
        customer_notes: document.getElementById('customer-notes').value
    };
    
    // Валидация
    if (!formData.full_name || !formData.phone || !formData.email || !formData.shipping_address) {
        showMessage('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    try {
        const orderData = {
            items: cart.map(item => ({
                book_id: parseInt(item.bookId),
                quantity: parseInt(item.quantity)
            })),
            shipping_address: formData.shipping_address,
            shipping_method: getShippingMethodText(formData.shipping_method),
            customer_notes: formData.customer_notes || ''
        };

        console.log('Sending order:', orderData);

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Заказ успешно создан!', 'success');
            console.log('Order created:', data.order);
            
            // Сохраняем метаданные заказа (контакты и способ оплаты) для отображения в "Моих заказах"
            const meta = {
                full_name: formData.full_name,
                phone: formData.phone,
                email: formData.email,
                payment_method: getPaymentMethodText(formData.payment_method)
            };
            try {
                localStorage.setItem('order_meta_' + data.order.id, JSON.stringify(meta));
            } catch (e) {
                console.warn('Failed to store order meta:', e);
            }

            // Очищаем корзину
            localStorage.removeItem('cart');
            
            // Показываем подтверждение заказа
            setTimeout(() => {
                showOrderConfirmation(data.order, formData);
            }, 1000);
            
        } else {
            // Обработка истёкшего токена
            if (typeof handleAuthError === 'function' && handleAuthError(response, data)) {
                return;
            }
            console.error('Order creation failed:', data.error);
            showMessage(data.error, 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showMessage('Ошибка при создании заказа: ' + error.message, 'error');
    }
}

// Показать подтверждение заказа
function showOrderConfirmation(order, formData) {
    const confirmationHTML = `
        <div class="order-confirmation">
            <h3>🎉 Заказ успешно оформлен!</h3>
            <div class="confirmation-details">
                <p><strong>Номер заказа:</strong> #${order.id}</p>
                <p><strong>Сумма заказа:</strong> ${order.total_amount} р</p>
                <p><strong>Статус:</strong> ${getStatusText(order.status)}</p>
                <p><strong>Получатель:</strong> ${formData.full_name}</p>
                <p><strong>Телефон:</strong> ${formData.phone}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Адрес доставки:</strong> ${formData.shipping_address}</p>
                <p><strong>Способ доставки:</strong> ${getShippingMethodText(formData.shipping_method)}</p>
                <p><strong>Способ оплаты:</strong> ${getPaymentMethodText(formData.payment_method)}</p>
                ${formData.customer_notes ? `<div class="order-notes"><strong>Комментарий:</strong> ${escapeHtml(formData.customer_notes)}</div>` : ''}
            </div>
            <div class="confirmation-actions">
                <button onclick="window.location.href='/orders.html'" class="btn btn-primary">Мои заказы</button>
                <button onclick="window.location.href='/catalog.html'" class="btn btn-outline">Продолжить покупки</button>
            </div>
        </div>
    `;
    
    const checkoutContent = document.querySelector('.checkout-content');
    checkoutContent.innerHTML = confirmationHTML;
    checkoutContent.classList.add('centered');
}

// Вспомогательные функции
function getShippingMethodText(method) {
    const methods = {
        'courier': 'Курьерская доставка',
        'post': 'Белпочта',
        'pickup': 'Самовывоз'
    };
    return methods[method] || method;
}

function getPaymentMethodText(method) {
    const methods = {
        'card': 'Банковская карта',
        'cash': 'Наличные при получении',
        'online': 'Онлайн-оплата'
    };
    return methods[method] || method;
}

function getStatusText(status) {
    const statuses = {
        'pending': 'Ожидает подтверждения',
        'confirmed': 'Подтвержден',
        'shipped': 'Отправлен',
        'delivered': 'Доставлен',
        'cancelled': 'Отменен'
    };
    return statuses[status] || status;
}

// Calculate applicable promotion for the cart
async function calculateApplicablePromotion(cart, totalAmount) {
    try {
        // Get book IDs and quantities for checking conditions
        const bookIds = cart.map(item => parseInt(item.bookId));
        const quantities = cart.map(item => parseInt(item.quantity) || 0);
        const totalItems = quantities.reduce((sum, qty) => sum + qty, 0);
        
        // Fetch active promotions
        const response = await fetch('/api/books/promotions');
        if (!response.ok) return null;
        
        const promotions = await response.json();
        if (!Array.isArray(promotions) || promotions.length === 0) return null;
        
        // For simplicity, we'll just return the first applicable promotion with the highest discount
        // In a real implementation, you would check all conditions properly
        
        let bestPromotion = null;
        let bestDiscount = 0;
        
        for (const promo of promotions) {
            // Check basic conditions
            const conditions = promo.conditions || {};
            
            // Check minimum total amount
            if (conditions.min_total_amount && totalAmount < conditions.min_total_amount) {
                continue;
            }
            
            // Check minimum items
            if (conditions.min_items && totalItems < conditions.min_items) {
                continue;
            }
            
            // Calculate discount
            let discount = 0;
            if (promo.discount_type === 'percent') {
                discount = (totalAmount * promo.discount_value / 100);
            } else {
                discount = Math.min(promo.discount_value, totalAmount);
            }
            
            // Check if this is the best promotion so far
            if (discount > bestDiscount) {
                bestDiscount = discount;
                bestPromotion = {
                    id: promo.id,
                    name: promo.name,
                    discountType: promo.discount_type,
                    value: promo.discount_value,
                    discount: discount
                };
            }
        }
        
        return bestPromotion;
    } catch (error) {
        console.error('Error calculating promotion:', error);
        return null;
    }
}
