// Главная страница: персональные рекомендации по жанрам

document.addEventListener('DOMContentLoaded', function() {
    try {
        buildHomepageRecommendations();
    } catch (e) {
        console.error('Homepage init error:', e);
    }
});

async function buildHomepageRecommendations() {
    const container = document.getElementById('reco-container');
    const titleEl = document.getElementById('reco-title');
    if (!container) return;

    injectHomepageStyles();

    const token = localStorage.getItem('authToken');
    let genresMap = new Map();

    if (token) {
        try {
            const resp = await fetch('/api/orders/my-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            if (resp.ok && Array.isArray(data.orders) && data.orders.length > 0) {
                data.orders.forEach(order => {
                    (order.items || []).forEach(item => {
                        if (item && item.genre_id && item.genre_name) {
                            const key = String(item.genre_id);
                            const g = genresMap.get(key) || { id: item.genre_id, name: item.genre_name, count: 0 };
                            g.count += Number(item.quantity || 1);
                            genresMap.set(key, g);
                        }
                    });
                });
                if (genresMap.size > 0) {
                    titleEl && (titleEl.textContent = 'Персональные рекомендации');
                    const sortedGenres = Array.from(genresMap.values()).sort((a,b) => b.count - a.count);
                    await renderRowsByGenres(sortedGenres, container);
                    return;
                }
            }
        } catch (e) {
            console.warn('Orders fetch failed, fallback to popular:', e);
        }
    }

    titleEl && (titleEl.textContent = 'Популярное по жанрам');
    await renderPopularByGenres(container);
}

async function renderRowsByGenres(genres, container) {
    for (const g of genres) {
        const url = `/api/books?genre_id=${encodeURIComponent(g.id)}`;
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            if (resp.ok && Array.isArray(data.books) && data.books.length > 0) {
                const books = data.books.slice(0, 12);
                const row = buildGenreRow(g.name, books);
                container.appendChild(row);
                attachRowHandlers(row);
            }
        } catch (e) {
            console.error('Load books by genre failed:', e);
        }
    }
}

async function renderPopularByGenres(container) {
    try {
        const resp = await fetch('/api/books/popular');
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Popular endpoint error');
        const byGenre = new Map();
        (data.books || []).forEach(b => {
            const g = (b.genre_name || 'Другие');
            const arr = byGenre.get(g) || [];
            arr.push(b);
            byGenre.set(g, arr);
        });
        for (const [genreName, list] of byGenre.entries()) {
            const books = list.slice(0, 12);
            const row = buildGenreRow(genreName, books);
            container.appendChild(row);
            attachRowHandlers(row);
        }
    } catch (e) {
        console.error('Popular by genre load error:', e);
    }
}

function buildGenreRow(genreName, books) {
    const row = document.createElement('div');
    row.className = 'reco-row';
    row.innerHTML = `
        <div class="reco-header">
            <h3 class="reco-genre">${escapeHtml(genreName)}</h3>
        </div>
        <div class="reco-track">
            ${books.map(b => bookCard(b)).join('')}
        </div>
    `;
    return row;
}

function bookCard(book) {
    const safeTitle = escapeHtml(book.title || 'Без названия');
    const safeAuthor = escapeHtml(book.author_name || 'Автор не указан');
    const priceText = (book.price != null) ? `${book.price} р` : 'Цена не указана';
    const defaultCover = 'https://i.pinimg.com/474x/e2/93/05/e29305e0ee7c3d1ef31ce6f234e194f8.jpg';
    const coverSrc = book.cover_image ? book.cover_image : defaultCover;
    const inStock = Number(book.stock_quantity || 0) > 0;
    return `
        <div class="reco-card" data-book-id="${book.id}">
            <img class="reco-cover" src="${coverSrc}" alt="Обложка ${safeTitle}" onerror="this.onerror=null;this.src='${defaultCover}';"/>
            <div class="reco-title">${safeTitle}</div>
            <div class="reco-author">${safeAuthor}</div>
            <div class="reco-price">${priceText}</div>
            <div class="reco-actions">
                ${inStock ? `
                <button class="btn btn-primary add-to-cart" 
                        data-id="${book.id}"
                        data-title="${safeTitle}"
                        data-price="${book.price || 0}"
                        data-author="${safeAuthor}"
                        data-cover="${coverSrc}">
                    В корзину
                </button>
                ` : `
                <button class="btn btn-outline" disabled>Нет в наличии</button>
                `}
            </div>
        </div>
    `;
}

function attachRowHandlers(row) {
    row.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const title = btn.getAttribute('data-title');
            const price = parseFloat(btn.getAttribute('data-price')) || 0;
            const author = btn.getAttribute('data-author');
            const cover = btn.getAttribute('data-cover');
            if (typeof window.addToCart === 'function') {
                window.addToCart(id, title, price, author, cover);
            }
        });
    });
}

function injectHomepageStyles() {
    const style = document.createElement('style');
    style.textContent = `
    #recommendations { margin-bottom: 2rem; }
    #recommendations .reco-row { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; }
    #recommendations .reco-header { display: flex; align-items: center; justify-content: flex-start; margin-bottom: 0.75rem; padding-bottom: 0.5rem; }
    #recommendations .reco-genre { color: #2c3e50; }
    #recommendations .reco-track { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }
    #recommendations .reco-card { width: 280px; flex: 0 0 280px; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 1rem; }
    #recommendations .reco-cover { width: 120px; height: 180px; object-fit: cover; border-radius: 6px; display: block; margin: 0 auto 0.75rem; background-color: #eee; }
    #recommendations .reco-title { font-weight: bold; color: #2c3e50; margin-bottom: 0.25rem; text-align: center; }
    #recommendations .reco-author { color: #7f8c8d; font-size: 0.9rem; margin-bottom: 0.25rem; text-align: center; }
    #recommendations .reco-price { color: #27ae60; font-weight: bold; margin-bottom: 0.5rem; text-align: center; }
    #recommendations .reco-actions { display: flex; justify-content: center; }
    `;
    document.head.appendChild(style);
}

function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
