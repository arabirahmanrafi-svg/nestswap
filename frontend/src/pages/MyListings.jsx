import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ListingCard from '../components/ListingCard';
import RoommateCard from '../components/RoommateCard';
import { ErrorBanner } from '../components/bits';

export default function MyListings() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [roommatePosts, setRoommatePosts] = useState([]);

  useEffect(() => {
    api('/api/listings/mine').then(setItems).catch((e) => setError(e.message));
    api('/api/roommates/mine').then(setRoommatePosts).catch(() => {});
  }, []);

  const active = items?.filter((l) => l.status === 'ACTIVE') || [];
  const taken = items?.filter((l) => l.status === 'TAKEN') || [];

  return (
    <div className="container">
      <div className="page-head">
        <h1>My posts</h1>
        <div className="row-buttons">
          <Link to="/roommates/new" className="btn btn-ghost">Post a roommate profile</Link>
          <Link to="/post" className="btn btn-primary">Post a place</Link>
        </div>
      </div>
      <ErrorBanner error={error} />
      {!items && !error && <p className="muted">Loading…</p>}
      {items && items.length === 0 && roommatePosts.length === 0 && (
        <div className="empty-state">
          <h2 className="h3">You haven’t posted anything yet</h2>
          <p>Leaving before your lease ends? Post your place and let people come to you.</p>
          <Link to="/post" className="btn btn-primary">Post your first place</Link>
        </div>
      )}
      {active.length > 0 && (
        <>
          <h2 className="h3">Active ({active.length})</h2>
          <div className="grid">{active.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        </>
      )}
      {taken.length > 0 && (
        <>
          <h2 className="h3">Taken ({taken.length})</h2>
          <p className="muted">Hidden from search. Open one to re-list it.</p>
          <div className="grid">{taken.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        </>
      )}
      {roommatePosts.length > 0 && (
        <>
          <h2 className="h3 section-gap">Roommate posts ({roommatePosts.length})</h2>
          <div className="grid">{roommatePosts.map((p) => <RoommateCard key={p.id} post={p} />)}</div>
        </>
      )}
    </div>
  );
}
