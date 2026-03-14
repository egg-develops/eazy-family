import React, { useState, useEffect } from 'react';
export interface CarouselItem { id: string; image: string; title: string; description?: string }
export const Carousel: React.FC<{ items: CarouselItem[]; autoPlay?: boolean; autoPlayInterval?: number; showIndicators?: boolean; showControls?: boolean; onItemChange?: (index: number) => void }> = ({ items, autoPlay = true, autoPlayInterval = 5000, showIndicators = true, showControls = true, onItemChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    if (!autoPlay || items.length === 0) return;
    const interval = setInterval(() => setCurrentIndex(prev => (prev + 1) % items.length), autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, items.length]);
  useEffect(() => { onItemChange?.(currentIndex) }, [currentIndex, onItemChange]);
  const goToPrevious = () => setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
  const goToNext = () => setCurrentIndex(prev => (prev + 1) % items.length);
  const goToSlide = (index: number) => setCurrentIndex(index);
  if (items.length === 0) return <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}><p>No carousel items</p></div>;
  const currentItem = items[currentIndex];
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '66.67%' }}>
        <img src={currentItem.image} alt={currentItem.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {(currentItem.title || currentItem.description) && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', color: 'white', padding: '2rem 1rem 1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{currentItem.title}</h3>
            {currentItem.description && <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>{currentItem.description}</p>}
          </div>
        )}
      </div>
      {showControls && (
        <button onClick={goToPrevious} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s', zIndex: 10 }} onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.8)'} onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.5)'}>‹</button>
      )}
      {showControls && (
        <button onClick={goToNext} style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s', zIndex: 10 }} onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.8)'} onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.5)'}>›</button>
      )}
      {showIndicators && items.length > 1 && (
        <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
          {items.map((_, index) => (
            <button key={index} onClick={() => goToSlide(index)} style={{ width: '10px', height: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: index === currentIndex ? 'white' : 'rgba(255,255,255,0.5)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.7)'} onMouseLeave={(e) => { if (index !== currentIndex) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.5)'; }} />
          ))}
        </div>
      )}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', zIndex: 10 }}>{currentIndex + 1} / {items.length}</div>
    </div>
  );
};
