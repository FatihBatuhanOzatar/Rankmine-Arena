
import { useNavigate } from 'react-router-dom';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="container">
            <h1>Rankmine Arena</h1>
            <p>Landing Page Placeholder</p>
            <div className="card" style={{ marginTop: '24px' }}>
                <h2>Create Arena</h2>
                <p>Start a new judging competition.</p>
                <button className="btnPrimary" onClick={() => navigate('/arena/new')}>
                    New Arena
                </button>
            </div>
            <div style={{ marginTop: '16px' }}>
                <button className="btn">Secondary Button</button>
            </div>
        </div>
    );
}
