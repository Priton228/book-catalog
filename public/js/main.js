// Основные функции для главной страницы
console.log('BookCatalog initialized');

// Добавляем стили для сообщений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .message {
        font-family: Arial, sans-serif;
        font-size: 14px;
    }
    
    .empty-cart {
        text-align: center;
        padding: 2rem;
        color: #7f8c8d;
    }
    
    .cart-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #eee;
    }
    .cart-item-cover {
        width: 40px;
        height: 60px;
        object-fit: cover;
        border-radius: 4px;
        margin-right: 0.75rem;
    }
    
    .cart-item-info {
        flex: 1;
    }
    
    .cart-item-title {
        font-weight: bold;
        margin-bottom: 0.25rem;
    }
    
    .cart-item-author {
        color: #7f8c8d;
        font-size: 0.9rem;
        margin-bottom: 0.25rem;
    }
    
    .cart-item-price {
        color: #27ae60;
        font-weight: bold;
    }
    
    .cart-item-total {
        font-weight: bold;
        margin: 0 1rem;
    }
    
    .cart-item-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .cart-total {
        text-align: right;
        padding: 1rem;
        border-top: 2px solid #eee;
        margin-top: 1rem;
        font-size: 1.2rem;
    }
    
    .cart-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
    }
    
    .btn-danger {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
    }
`;
document.head.appendChild(style);
