// Страница оформления заказа
document.addEventListener('DOMContentLoaded', function() {
    console.log('Checkout page loaded');
    initializeCheckoutEventListeners();
    loadCheckoutData();
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
function loadCheckoutData() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total-amount');
    
    if (cart.length === 0) {
        checkoutItems.innerHTML = '<p class="empty-cart">Корзина пуста</p>';
        checkoutTotal.textContent = '0 ₽';
        return;
    }
    
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <div class="checkout-item-info">
                <div class="checkout-item-title">${escapeHtml(item.title)}</div>
                <div class="checkout-item-author">${escapeHtml(item.author)}</div>
            </div>
            <div class="checkout-item-details">
                <div class="checkout-item-quantity">${item.quantity} шт.</div>
                <div class="checkout-item-price">${item.price} ₽ × ${item.quantity} = ${(item.price * item.quantity).toFixed(2)} ₽</div>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    checkoutTotal.textContent = total.toFixed(2) + ' ₽';
    
    console.log('Checkout data loaded');
}

// Предзаполнение данных пользователя
function prefillUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (currentUser) {
        document.getElementById('full-name').value = currentUser.full_name || '';
        document.getElementById('email').value = currentUser.email || '';
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
            shipping_address: `${formData.shipping_address}. Способ доставки: ${getShippingMethodText(formData.shipping_method)}`,
            customer_notes: `Контактные данные: ${formData.full_name}, тел.: ${formData.phone}, email: ${formData.email}. Способ оплаты: ${getPaymentMethodText(formData.payment_method)}. ${formData.customer_notes || ''}`
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
            
            // Очищаем корзину
            localStorage.removeItem('cart');
            
            // Показываем подтверждение заказа
            setTimeout(() => {
                showOrderConfirmation(data.order, formData);
            }, 1000);
            
        } else {
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
                <p><strong>Сумма заказа:</strong> ${order.total_amount} ₽</p>
                <p><strong>Статус:</strong> ${getStatusText(order.status)}</p>
                <p><strong>Получатель:</strong> ${formData.full_name}</p>
                <p><strong>Телефон:</strong> ${formData.phone}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Адрес доставки:</strong> ${formData.shipping_address}</p>
                <p><strong>Способ доставки:</strong> ${getShippingMethodText(formData.shipping_method)}</p>
                <p><strong>Способ оплаты:</strong> ${getPaymentMethodText(formData.payment_method)}</p>
            </div>
            <div class="confirmation-actions">
                <button onclick="window.location.href='/orders.html'" class="btn btn-primary">Мои заказы</button>
                <button onclick="window.location.href='/catalog.html'" class="btn btn-outline">Продолжить покупки</button>
            </div>
        </div>
    `;
    
    document.querySelector('.checkout-content').innerHTML = confirmationHTML;
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
