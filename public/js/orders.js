﻿// Загрузка заказов при открытии страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Orders page loaded');
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
        return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-info">
                    <h3>Заказ #${order.id}</h3>
                    <div class="order-date">${new Date(order.created_at).toLocaleDateString('ru-RU')} ${new Date(order.created_at).toLocaleTimeString('ru-RU')}</div>
                    <div class="order-amount">Сумма: ${order.total_amount} ₽</div>
                </div>
                <div class="order-status order-status-${order.status}">
                    ${getStatusText(order.status)}
                </div>
            </div>
            
            <div class="order-items">
                ${order.items && order.items.length > 0 ? 
                    order.items.map(item => `
                        <div class="order-item">
                            <div class="order-item-info">
                                <div class="order-item-title">${escapeHtml(item.title || 'Неизвестная книга')}</div>
                                <div class="order-item-author">${escapeHtml(item.author_name || 'Автор не указан')}</div>
                            </div>
                            <div class="order-item-details">
                                <div class="order-item-quantity">${item.quantity} шт.</div>
                                <div class="order-item-price">${item.unit_price} ₽ × ${item.quantity} = ${(item.unit_price * item.quantity).toFixed(2)} ₽</div>
                            </div>
                        </div>
                    `).join('') : 
                    '<div class="no-items">Товары не найдены</div>'
                }
            </div>
            
            <div class="order-footer">
                ${order.shipping_address ? `
                    <div class="order-address">
                        <strong>Адрес доставки:</strong> ${escapeHtml(order.shipping_address)}
                    </div>
                ` : ''}
                ${order.customer_notes ? `
                    <div class="order-notes">
                        <strong>Комментарий:</strong> ${escapeHtml(order.customer_notes)}
                    </div>
                ` : ''}
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
