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

async function renderPromotionsCarousel(promotions, container) {
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
    
    // Create slides asynchronously
    const slidePromises = allPromotions.map((promo, index) => createPromotionSlide(promo, index === 0));
    const slides = await Promise.all(slidePromises);
    
    slides.forEach(slide => slidesContainer.appendChild(slide));
    
    carousel.appendChild(slidesContainer);
    
    // Create navigation dots
    if (promotions.length > 1) {
        const dotsContainer = document.createElement('div');
        dotsContainer.id = 'promo-dots';
        dotsContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 10;
        `;
        
        promotions.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.className = 'promo-dot';
            dot.dataset.index = index;
            dot.style.cssText = `
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.5);
                cursor: pointer;
                transition: background-color 0.3s ease;
            `;
            
            // Add click event to navigate to specific slide
            dot.addEventListener('click', () => {
                goToSlide(index, promotions.length);
            });
            
            dotsContainer.appendChild(dot);
        });
        
        carousel.appendChild(dotsContainer);
        
        // Set first dot as active
        updateDots(0);
    }
    
    container.appendChild(carousel);
    
    // Start autoplay if more than one promotion
    if (promotions.length > 1) {
        startAutoplay(promotions.length);
    }
}

async function createPromotionSlide(promo, isActive) {
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
    
    // Get genre and author information
    let conditionsText = '';
    if (promo.conditions) {
        const conditions = typeof promo.conditions === 'string' ? JSON.parse(promo.conditions) : promo.conditions;
        
        if (conditions.include_genres && conditions.include_genres.length > 0) {
            try {
                const response = await fetch('/api/genres');
                if (response.ok) {
                    const genres = await response.json();
                    const genreNames = genres
                        .filter(g => conditions.include_genres.includes(g.id))
                        .map(g => g.name);
                    if (genreNames.length > 0) {
                        conditionsText += `Жанры: ${genreNames.join(', ')}<br>`;
                    }
                }
            } catch (e) {
                console.warn('Failed to load genres for promotion:', e);
            }
        }
        
        if (conditions.include_authors && conditions.include_authors.length > 0) {
            try {
                const response = await fetch('/api/authors');
                if (response.ok) {
                    const authors = await response.json();
                    const authorNames = authors
                        .filter(a => conditions.include_authors.includes(a.id))
                        .map(a => a.name || a.full_name);
                    if (authorNames.length > 0) {
                        conditionsText += `Авторы: ${authorNames.join(', ')}`;
                    }
                }
            } catch (e) {
                console.warn('Failed to load authors for promotion:', e);
            }
        }
    }
    
    slide.innerHTML = `
        <h2 style="font-size: 2rem; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${escapeHtml(promo.name)}</h2>
        <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${discountText}</div>
        ${conditionsText ? `<div style="font-size: 1rem; opacity: 0.9; text-shadow: 0 1px 2px rgba(0,0,0,0.5); margin-bottom: 0.5rem;">${conditionsText}</div>` : ''}
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
            promoInterval = setInterval(autoplayFunction, 3000);
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
        
        // Update dots (account for duplicate slide)
        const displayIndex = currentIndex >= totalSlides ? 0 : currentIndex;
        updateDots(displayIndex);
        
        // Reset to first slide without transition for seamless loop
        if (totalSlides > 1 && currentIndex === totalSlides) {
            setTimeout(() => {
                slidesContainer.style.transition = 'none';
                slidesContainer.style.transform = 'translateX(0%)';
                currentIndex = 0;
                updateDots(0);
                // Restore transition after reset
                setTimeout(() => {
                    slidesContainer.style.transition = 'transform 0.8s ease-in-out';
                }, 50);
            }, 850);
        }
    };
    
    promoInterval = setInterval(autoplayFunction, 3000); // Change slide every 3 seconds
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

// Function to navigate to a specific slide
function goToSlide(slideIndex, totalSlides) {
    const slidesContainer = document.getElementById('promo-slides');
    if (!slidesContainer) return;
    
    // Apply the transformation
    slidesContainer.style.transform = `translateX(-${slideIndex * 100}%)`;
    
    // Update dots
    updateDots(slideIndex);
    
    // Reset autoplay
    if (promoInterval) {
        clearInterval(promoInterval);
        startAutoplay(totalSlides);
    }
}

// Function to update active dot
function updateDots(activeIndex) {
    const dots = document.querySelectorAll('.promo-dot');
    dots.forEach((dot, index) => {
        if (index === activeIndex) {
            dot.style.backgroundColor = 'white';
        } else {
            dot.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        }
    });
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