import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets the window scroll position to the top whenever the route's
 * pathname changes. Place inside the Router but above <Routes>.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const el = document.getElementById('main-scroll');
    if (el) {
      el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [pathname]);
  return null;
}
