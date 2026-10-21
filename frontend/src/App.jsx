import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { api } from './api';
import Home from './pages/Home';
import ListingPage from './pages/ListingPage';
import ListingFormPage from './pages/ListingFormPage';
import { Login, Register } from './pages/AuthPages';
import MyListings from './pages/MyListings';
import Saved from './pages/Saved';
import Messages from './pages/Messages';
import Account from './pages/Account';
import Agreement from './pages/Agreement';
import Guide from './pages/Guide';
import Roommates from './pages/Roommates';
import RoommatePage from './pages/RoommatePage';
import RoommateFormPage from './pages/RoommateFormPage';

export default function App() {
  const { ready } = useAuth();
  const location = useLocation();

  // Move keyboard / screen-reader focus to the page content after each navigation.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main" tabIndex={-1}>
        {!ready ? (
          <p className="container muted" role="status">Loading…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/listings/:id" element={<ListingPage />} />
            <Route path="/post" element={<RequireLogin><ListingFormPage /></RequireLogin>} />
            <Route path="/listings/:id/edit" element={<RequireLogin><ListingFormPage /></RequireLogin>} />
            <Route path="/roommates" element={<Roommates />} />
            <Route path="/roommates/new" element={<RequireLogin><RoommateFormPage /></RequireLogin>} />
            <Route path="/roommates/:id" element={<RoommatePage />} />
            <Route path="/roommates/:id/edit" element={<RequireLogin><RoommateFormPage /></RequireLogin>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/my-listings" element={<RequireLogin><MyListings /></RequireLogin>} />
            <Route path="/saved" element={<RequireLogin><Saved /></RequireLogin>} />
            <Route path="/messages" element={<RequireLogin><Messages /></RequireLogin>} />
            <Route path="/messages/:id" element={<RequireLogin><Messages /></RequireLogin>} />
            <Route path="/account" element={<RequireLogin><Account /></RequireLogin>} />
            <Route path="/agreement" element={<Agreement />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
      <Footer />
    </>
  );
}

function RequireLogin({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = useUnreadCount(user);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link to="/" className="brand" aria-label="NestSwap home">
          nest<span>swap</span>
        </Link>

        <button
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? 'Close' : 'Menu'}
          {unread > 0 && !menuOpen && <span className="dot" aria-hidden="true" />}
        </button>

        <nav id="site-nav" className={`site-nav ${menuOpen ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/" end>Places</NavLink>
          <NavLink to="/roommates">Roommates</NavLink>
          <NavLink to="/guide">Guide</NavLink>
          {user ? (
            <>
              <NavLink to="/saved">Saved</NavLink>
              <NavLink to="/messages">
                Messages
                {unread > 0 && <span className="badge-count" aria-label={`${unread} unread`}>{unread}</span>}
              </NavLink>
              <NavLink to="/my-listings">My posts</NavLink>
              <NavLink to="/account">Account</NavLink>
              <button className="link-btn" onClick={logout}>Log out</button>
              <Link to="/post" className="btn btn-primary">Post a place</Link>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <Link to="/register" className="btn btn-primary">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Polls the server every 15 seconds for unread messages (only while the tab is visible). */
function useUnreadCount(user) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) { setCount(0); return; }
    let stopped = false;
    const load = () => {
      if (document.hidden) return;
      api('/api/conversations/unread').then((r) => !stopped && setCount(r.unread)).catch(() => {});
    };
    load();
    const t = setInterval(load, 15000);
    window.addEventListener('nestswap:read', load);
    return () => { stopped = true; clearInterval(t); window.removeEventListener('nestswap:read', load); };
  }, [user]);
  return count;
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <p>NestSwap. Never pay a deposit before you’ve seen the place and the lease.</p>
        <nav aria-label="Footer">
          <Link to="/guide">Subletting guide</Link>
          <Link to="/agreement">Sublease agreement</Link>
        </nav>
      </div>
    </footer>
  );
}

function NotFound() {
  return (
    <div className="container narrow empty-state">
      <h1>Page not found</h1>
      <p>That page doesn’t exist. <Link to="/">Go back to browsing</Link>.</p>
    </div>
  );
}
