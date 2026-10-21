import { Link } from 'react-router-dom';

/** Plain-language help page: the landlord-approval checklist and safety tips. */
export default function Guide() {
  return (
    <div className="container narrow guide">
      <h1>Subletting guide</h1>
      <p className="lede">Everything to check before you post or move in, in plain English.</p>

      <nav className="toc" aria-label="On this page">
        <a href="#types">Sublease vs. takeover</a>
        <a href="#landlord">Landlord approval checklist</a>
        <a href="#posting">Writing a listing that gets replies</a>
        <a href="#safety">Avoiding scams</a>
      </nav>

      <section id="types">
        <h2>Sublease vs. lease takeover</h2>
        <div className="compare">
          <div className="card pad">
            <h3>Sublease</h3>
            <p>You stay on the lease and rent your place to someone for part of it, like a summer.</p>
            <p><strong>Good for:</strong> internships, study abroad, short trips.</p>
            <p><strong>Watch out:</strong> you’re still responsible to the landlord if rent is late or something breaks.</p>
          </div>
          <div className="card pad">
            <h3>Lease takeover</h3>
            <p>Someone replaces you on the lease. Also called a lease transfer or assignment.</p>
            <p><strong>Good for:</strong> moving away for good, graduating early.</p>
            <p><strong>Watch out:</strong> the landlord usually has to approve the new tenant and may charge a transfer fee.</p>
          </div>
          <div className="card pad">
            <h3>Room</h3>
            <p>One bedroom in a shared place. The household stays.</p>
            <p><strong>Tip:</strong> describe the roommates and house routines so the right person replies.</p>
          </div>
        </div>
      </section>

      <section id="landlord">
        <h2>Landlord approval checklist</h2>
        <ol className="checklist numbered">
          <li><strong>Find the clause.</strong> Search your lease for “sublet,” “sublease,” “assign,” or “transfer.” Some leases ban it, many require written permission.</li>
          <li><strong>Ask in writing.</strong> Email your landlord or property manager with the dates and the new person’s name. Keep the reply.</li>
          <li><strong>Ask about fees and screening.</strong> Takeovers often need an application, background check, or transfer fee.</li>
          <li><strong>Check your state’s rules.</strong> Some states limit when a landlord can refuse. Your school’s student legal services or a local tenant union can tell you for free.</li>
          <li><strong>Sign a written agreement.</strong> <Link to="/agreement">Use our free template</Link>, and attach a copy of the original lease.</li>
          <li><strong>Do a move-in inspection.</strong> Walk through together and take dated photos of every room.</li>
        </ol>
      </section>

      <section id="posting">
        <h2>Writing a listing that gets replies</h2>
        <ul className="checklist">
          <li>Post 5+ bright photos: every room, the kitchen, the bathroom, and the building outside.</li>
          <li>Give exact dates. “Jan 1 – May 31” beats “spring semester.”</li>
          <li>Say what’s included: furniture, utilities, parking, laundry, internet.</li>
          <li>Drop a map pin so people can search by distance to campus or work.</li>
          <li>Verify your email. Posts with a Verified badge feel safer to message.</li>
          <li>Mark it <em>Taken</em> as soon as it’s gone, so nobody wastes a trip.</li>
        </ul>
      </section>

      <section id="safety">
        <h2>Avoiding scams</h2>
        <ul className="checklist warn">
          <li>See the place in person or on a <strong>live</strong> video call before you pay anything.</li>
          <li>Never wire money, use gift cards, crypto, or pay a “holding deposit” to someone you haven’t met.</li>
          <li>Be wary if the price is far below similar places, or the poster is “out of the country” and will mail the keys.</li>
          <li>Ask to see the original lease and the landlord’s approval.</li>
          <li>Keep the conversation in NestSwap messages until you trust the person.</li>
        </ul>
      </section>

      <p><Link to="/" className="btn btn-primary">Browse listings</Link> <Link to="/post" className="btn btn-ghost">Post a place</Link></p>
    </div>
  );
}
