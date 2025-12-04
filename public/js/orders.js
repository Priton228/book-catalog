﻿﻿﻿// Загрузка заказов при открытии страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Orders page loaded');
    injectOrdersStyles();
    initializeOrdersEventListeners();
    checkAuthAndLoadOrders();
});

// Проверка авторизации и загрузка заказов
function checkAuthAndLoadOrders() {
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
        showMessage('Для просмотра заказов необходимо войти в систему', 'warning');
        showLogin();
        return;
    }
    
    loadOrders();
}

// Загрузка заказов пользователя
async function loadOrders() {
    console.log('Loading orders...');
    
    document.getElementById('orders-loading').style.display = 'block';
    document.getElementById('no-orders').style.display = 'none';

    try {
        const response = await fetch('/api/orders/my-orders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Orders response:', data);

        document.getElementById('orders-loading').style.display = 'none';

        if (response.ok) {
            displayOrders(data.orders);
        } else {
            // Обработка истёкшего токена
            if (typeof handleAuthError === 'function' && handleAuthError(response, data)) {
                return;
            }
            console.error('Error loading orders:', data.error);
            showMessage('Ошибка загрузки заказов: ' + data.error, 'error');
        }
    } catch (error) {
        document.getElementById('orders-loading').style.display = 'none';
        console.error('Connection error:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Отображение заказов
function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    const noOrders = document.getElementById('no-orders');

    console.log('Displaying orders:', orders);

    if (!orders || orders.length === 0) {
        container.innerHTML = '';
        noOrders.style.display = 'block';
        console.log('No orders to display');
        return;
    }

    noOrders.style.display = 'none';

    container.innerHTML = orders.map(order => {
        console.log('Processing order:', order);
        
        // Extract shipping method from shipping address if it exists
        let shippingAddress = order.shipping_address || '';
        let shippingMethod = '';
        
        // Check if shipping address contains shipping method information
        const methodIndex = shippingAddress.indexOf('. Способ доставки: ');
        if (methodIndex !== -1) {
            shippingMethod = shippingAddress.substring(methodIndex + 19); // 19 is length of ". Способ доставки: "
            shippingAddress = shippingAddress.substring(0, methodIndex);
        }
        
        const metaRaw = localStorage.getItem('order_meta_' + order.id);
        const meta = metaRaw ? JSON.parse(metaRaw) : null;
        const contactLine = (order.user_name || order.user_email || (meta && (meta.full_name || meta.phone || meta.email)))
            ? `<div class="order-address"><strong>Контактные данные:</strong> ${escapeHtml(order.user_name || (meta && meta.full_name) || '')}${meta && meta.phone ? ' · тел.: ' + escapeHtml(meta.phone) : ''}${order.user_email ? ' · ' + escapeHtml(order.user_email) : (meta && meta.email ? ' · ' + escapeHtml(meta.email) : '')}</div>`
            : '';
        const paymentLine = meta && meta.payment_method
            ? `<div class="order-address"><strong>Способ оплаты:</strong> ${escapeHtml(meta.payment_method)}</div>`
            : '';
        const shippingMethodLine = shippingMethod
            ? `<div class="order-address"><strong>Способ доставки:</strong> ${escapeHtml(shippingMethod)}</div>`
            : '';
        const shippingAddressLine = shippingAddress
            ? `<div class="order-address"><strong>Адрес доставки:</strong> ${escapeHtml(shippingAddress)}</div>`
            : '';
        const commentLine = order.customer_notes
            ? `<div class="order-notes"><strong>Комментарий:</strong> ${escapeHtml(order.customer_notes)}</div>`
            : '';
        const defaultCover = 'https://i.pinimg.com/474x/e2/93/05/e29305e0ee7c3d1ef31ce6f234e194f8.jpg';
        // Calculate original amount before discount
        const originalAmount = order.applied_discount && order.applied_discount > 0 
            ? (parseFloat(order.total_amount) + parseFloat(order.applied_discount)).toFixed(2) 
            : parseFloat(order.total_amount).toFixed(2);
        
        const discountLine = order.applied_discount && order.applied_discount > 0
            ? `<div class="order-discount"><strong>Применена скидка:</strong> ${parseFloat(order.applied_discount).toFixed(2)} р</div>`
            : '';
        const promotionLine = order.promotion_name
            ? `<div class="order-promotion"><strong>Акция:</strong> ${escapeHtml(order.promotion_name)}${order.promotion_discount_type ? ` (${order.promotion_discount_type === 'percent' ? order.promotion_discount_value + '%' : order.promotion_discount_value + ' р'})` : ''}</div>`
            : '';
        // Remove the separate total line as requested
        const totalAmountLine = '';
        return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-info">
                    <h3>Заказ #${order.id}</h3>
                    <div class="order-date">${new Date(order.created_at).toLocaleDateString('ru-RU')} ${new Date(order.created_at).toLocaleTimeString('ru-RU')}</div>
                    <div class="order-amount">Сумма: ${order.applied_discount && order.applied_discount > 0 ? `<span style="text-decoration: line-through;">${originalAmount} р</span> <span style="color: red;">${parseFloat(order.total_amount).toFixed(2)} р</span>` : `${parseFloat(order.total_amount).toFixed(2)} р`}</div>
                </div>
                <div class="order-status order-status-${order.status}">
                    ${getStatusText(order.status)}
                </div>
            </div>
            
            <div class="order-items">
                ${order.items && order.items.length > 0 ? 
                    order.items.map(item => `
                        <div class="order-item">
                            <img class="order-item-cover" src="${item.cover_image || defaultCover}" alt="Обложка" onerror="this.onerror=null;this.src='${defaultCover}';"/>
                            <div class="order-item-info">
                                <div class="order-item-title">${escapeHtml(item.title || 'Неизвестная книга')}</div>
                                <div class="order-item-author">${escapeHtml(item.author_name || 'Автор не указан')}</div>
                            </div>
                            <div class="order-item-details">
                                <div class="order-item-quantity">${item.quantity} шт.</div>
                                <div class="order-item-price">${item.unit_price} р × ${item.quantity} = ${(item.unit_price * item.quantity).toFixed(2)} р</div>
                            </div>
                        </div>
                    `).join('') : 
                    '<div class="no-items">Товары не найдены</div>'
                }
            </div>
            
            <div class="order-footer">
                ${contactLine}
                ${shippingAddressLine}
                ${shippingMethodLine}
                ${paymentLine}
                ${commentLine}
                ${promotionLine}
                ${discountLine}
                ${totalAmountLine}
            </div>
        </div>
        `;
    }).join('');
    
    console.log('Orders displayed successfully');
}

// Получение текста статуса заказа
function getStatusText(status) {
    const statuses = {
        'pending': '⏳ Ожидает подтверждения',
        'confirmed': '✅ Подтвержден',
        'shipped': '🚚 Отправлен',
        'delivered': '📦 Доставлен',
        'cancelled': '❌ Отменен'
    };
    return statuses[status] || status;
}

// Инициализация обработчиков событий
function initializeOrdersEventListeners() {
    console.log('Initializing orders event listeners');
}

// Inject required styles
function injectOrdersStyles() {
    if (document.getElementById('orders-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'orders-styles';
    style.textContent = `
        .order-discount, .order-promotion {
            margin-top: 5px;
            padding: 5px;
            background-color: rgba(33, 150, 243, 0.1);
            border-left: 3px solid rgba(33, 150, 243, 0.5);
            font-size: 0.9em;
            color: rgba(33, 150, 243, 0.7);
        }
        .order-promotion {
            background-color: rgba(33, 150, 243, 0.1);
            border-left: 3px solid rgba(33, 150, 243, 0.5);
        }
    `;
    document.head.appendChild(style);
}
