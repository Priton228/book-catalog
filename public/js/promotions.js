// Promotions carousel functionality

document.addEventListener('DOMContentLoaded', function() {
    try {
        loadPromotionsCarousel();
    } catch (e) {
        console.error('Promotions carousel init error:', e);
    }
});

let currentPromoIndex = 0;
let promoInterval;

async function loadPromotionsCarousel() {
    const container = document.getElementById('promotions-container');
    if (!container) return;

    try {
        const response = await fetch('/api/books/promotions');
        if (!response.ok) {
            throw new Error('Failed to fetch promotions');
        }
        
        const promotions = await response.json();
        
        if (!Array.isArray(promotions) || promotions.length === 0) {
            // Hide the promotions section if there are no active promotions
            const carouselSection = document.getElementById('promotions-carousel');
            if (carouselSection) {
                carouselSection.style.display = 'none';
            }
            return;
        }
        
        // Show promotions in the carousel
        renderPromotionsCarousel(promotions, container);
    } catch (error) {
        console.error('Error loading promotions:', error);
        container.innerHTML = '<div class="error">Не удалось загрузить акции</div>';
    }
}

function renderPromotionsCarousel(promotions, container) {
    // Clear container
    container.innerHTML = '';
    
    // Create a single carousel container
    const carousel = document.createElement('div');
    carousel.id = 'promo-carousel';
    carousel.style.cssText = `
        position: relative;
        width: 100%;
        height: 300px;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    `;
    
    // Create slides container
    const slidesContainer = document.createElement('div');
    slidesContainer.id = 'promo-slides';
    slidesContainer.style.cssText = `
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        transition: transform 0.8s ease-in-out;
    `;
    
    // Duplicate first slide to last position for seamless looping
    const allPromotions = [...promotions];
    if (promotions.length > 1) {
        allPromotions.push(promotions[0]);
    }
    
    // Create slides
    allPromotions.forEach((promo, index) => {
        const slide = createPromotionSlide(promo, index === 0);
        slidesContainer.appendChild(slide);
    });
    
    carousel.appendChild(slidesContainer);
    container.appendChild(carousel);
    
    // Start autoplay if more than one promotion
    if (promotions.length > 1) {
        startAutoplay(promotions.length);
    }
}

function createPromotionSlide(promo, isActive) {
    const slide = document.createElement('div');
    slide.className = 'promo-slide';
    slide.dataset.index = currentPromoIndex++;
    
    // Default background image URL (you can customize this)
    const backgroundImage = promo.image_url || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1153&q=80';
    
    slide.style.cssText = `
        min-width: 100%;
        height: 100%;
        background-image: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${backgroundImage}');
        background-size: cover;
        background-position: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        color: white;
        padding: 2rem;
        box-sizing: border-box;
    `;
    
    const discountText = promo.discount_type === 'percent' 
        ? `${promo.discount_value}% скидка` 
        : `Скидка ${promo.discount_value} руб.`;
    
    slide.innerHTML = `
        <h2 style="font-size: 2rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${escapeHtml(promo.name)}</h2>
        <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${discountText}</div>
        <div style="font-size: 1rem; opacity: 0.9; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
            ${formatPromotionDates(promo.start_date, promo.end_date)}
        </div>
    `;
    
    return slide;
}

function startAutoplay(totalSlides) {
    clearInterval(promoInterval);
    
    let currentIndex = 0;
    const totalSlidesWithDuplicate = totalSlides + (totalSlides > 1 ? 1 : 0);
    
    // Set up hover pause functionality
    const carousel = document.getElementById('promo-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', () => {
            clearInterval(promoInterval);
        });
        
        carousel.addEventListener('mouseleave', () => {
            // Restart the interval
            promoInterval = setInterval(autoplayFunction, 5000);
        });
    }
    
    const autoplayFunction = () => {
        const slidesContainer = document.getElementById('promo-slides');
        if (!slidesContainer) return;
        
        const slides = document.querySelectorAll('.promo-slide');
        if (slides.length <= 1) return;
        
        currentIndex = (currentIndex + 1) % totalSlidesWithDuplicate;
        
        // Apply the transformation
        slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // Reset to first slide without transition for seamless loop
        if (totalSlides > 1 && currentIndex === totalSlides) {
            setTimeout(() => {
                slidesContainer.style.transition = 'none';
                slidesContainer.style.transform = 'translateX(0%)';
                currentIndex = 0;
                // Restore transition after reset
                setTimeout(() => {
                    slidesContainer.style.transition = 'transform 0.8s ease-in-out';
                }, 50);
            }, 800);
        }
    };
    
    promoInterval = setInterval(autoplayFunction, 5000); // Change slide every 5 seconds
}

function formatPromotionDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    const startStr = start.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    if (end) {
        const endStr = end.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        return `Действует с ${startStr} по ${endStr}`;
    }
    
    return `Начало: ${startStr}`;
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