
import { useParams, Link } from 'react-router-dom';

export default function Arena() {
    const { id } = useParams();

    return (
        <div className="container">
            <Link to="/" className="btn">← Back</Link>
            <h1>Arena: {id}</h1>
            <div className="card" style={{ marginTop: '24px' }}>
                <p>Arena Page Placeholder</p>
                <input type="text" className="input" placeholder="Type something..." />
            </div>
        </div>
    );
}
