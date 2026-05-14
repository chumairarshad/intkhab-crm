'use client';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function LoginCharacter({ state, shakeKey }: { state: 'idle'|'password'|'error'|'success'; shakeKey: number }) {
  const coverHands = state === 'password' || state === 'error' || state === 'success';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
      <style>{`
        @keyframes floatChar {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shakeChar {
          0%,100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-10px) rotate(-5deg); }
          25% { transform: translateX(10px) rotate(5deg); }
          40% { transform: translateX(-10px) rotate(-5deg); }
          55% { transform: translateX(10px) rotate(5deg); }
          70% { transform: translateX(-6px) rotate(-3deg); }
          85% { transform: translateX(6px) rotate(3deg); }
        }
        @keyframes nodChar {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          20% { transform: translateY(-10px) rotate(-8deg); }
          40% { transform: translateY(4px) rotate(4deg); }
          60% { transform: translateY(-8px) rotate(-6deg); }
          80% { transform: translateY(3px) rotate(3deg); }
        }
        @keyframes handUp {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-22px); }
        }
        @keyframes handDown {
          0% { transform: translateY(-22px); }
          100% { transform: translateY(0px); }
        }
        .char-body-shake { animation: shakeChar 0.7s ease-in-out; }
        .char-body-nod { animation: nodChar 0.8s ease-in-out; }
        .char-body-float { animation: floatChar 3s ease-in-out infinite; }
        .hand-cover { animation: handUp 0.35s ease forwards; }
        .hand-uncover { animation: handDown 0.35s ease forwards; }
      `}</style>

      <svg
        key={shakeKey}
        className={state === 'error' ? 'char-body-shake' : state === 'success' ? 'char-body-nod' : 'char-body-float'}
        width="120" height="132" viewBox="0 0 120 132"
        fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="60" cy="128" rx="22" ry="5" fill="rgba(0,0,0,0.18)"/>
        {/* Body */}
        <ellipse cx="60" cy="112" rx="26" ry="16" fill="#1A56DB"/>
        {/* Tie */}
        <path d="M57 100 L60 114 L63 100 Q60 97 57 100Z" fill="#EA580C"/>
        <path d="M55 94 Q60 91 65 94 L63 101 Q60 98 57 101Z" fill="#EA580C"/>
        {/* Neck */}
        <rect x="53" y="91" width="14" height="12" rx="5" fill="#FFD3A8"/>
        {/* Head */}
        <circle cx="60" cy="70" r="32" fill="#FFD3A8"/>
        {/* Hair */}
        <ellipse cx="60" cy="41" rx="32" ry="13" fill="#2D1B00"/>
        <ellipse cx="37" cy="51" rx="9" ry="13" fill="#2D1B00"/>
        <ellipse cx="83" cy="51" rx="9" ry="13" fill="#2D1B00"/>
        {/* Ears */}
        <ellipse cx="28" cy="70" rx="7" ry="9" fill="#FFB98A"/>
        <ellipse cx="92" cy="70" rx="7" ry="9" fill="#FFB98A"/>

        {/* Eyes white */}
        <ellipse cx="46" cy="68" rx="10" ry="11" fill="white"/>
        <ellipse cx="74" cy="68" rx="10" ry="11" fill="white"/>
        {/* Iris */}
        <circle cx="46" cy="69" r="6.5" fill={state === 'success' ? '#059669' : '#3B82F6'}/>
        <circle cx="74" cy="69" r="6.5" fill={state === 'success' ? '#059669' : '#3B82F6'}/>
        {/* Pupil */}
        <circle cx="47" cy="69" r="3.5" fill="#1E1B4B"/>
        <circle cx="75" cy="69" r="3.5" fill="#1E1B4B"/>
        {/* Shine */}
        <circle cx="49" cy="67" r="1.5" fill="white"/>
        <circle cx="77" cy="67" r="1.5" fill="white"/>

        {/* Eyebrows */}
        {state === 'error' ? <>
          <path d="M37 56 Q46 53 55 57" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M65 57 Q74 53 83 56" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </> : state === 'success' ? <>
          <path d="M37 57 Q46 52 55 55" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M65 55 Q74 52 83 57" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </> : <>
          <path d="M37 58 Q46 54 55 58" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M65 58 Q74 54 83 58" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </>}

        {/* Nose */}
        <ellipse cx="60" cy="77" rx="3.5" ry="2.5" fill="#FFB98A"/>

        {/* Mouth */}
        {state === 'idle' && <path d="M50 85 Q60 92 70 85" stroke="#D4845A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>}
        {state === 'password' && <ellipse cx="60" cy="86" rx="5" ry="3" fill="#D4845A"/>}
        {state === 'error' && <path d="M50 89 Q60 84 70 89" stroke="#D4845A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>}
        {state === 'success' && <>
          <path d="M48 85 Q60 95 72 85" stroke="#D4845A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <circle cx="48" cy="83" r="3" fill="#FFB98A"/>
          <circle cx="72" cy="83" r="3" fill="#FFB98A"/>
        </>}

        {/* Thumbs up for success */}
        {state === 'success' && <>
          <ellipse cx="22" cy="90" rx="10" ry="7" fill="#1A56DB" transform="rotate(-30 22 90)"/>
          <ellipse cx="22" cy="82" rx="6" ry="9" fill="#FFD3A8" transform="rotate(-10 22 82)"/>
          <rect x="19" y="72" width="6" height="10" rx="3" fill="#FFD3A8" transform="rotate(-10 19 72)"/>
          <ellipse cx="98" cy="90" rx="10" ry="7" fill="#1A56DB" transform="rotate(30 98 90)"/>
          <ellipse cx="98" cy="82" rx="6" ry="9" fill="#FFD3A8" transform="rotate(10 98 82)"/>
          <rect x="95" y="72" width="6" height="10" rx="3" fill="#FFD3A8" transform="rotate(10 95 72)"/>
        </>}

        {/* Left hand */}
        {state !== 'success' && (
          <g className={coverHands ? 'hand-cover' : 'hand-uncover'} style={{ transformOrigin: '32px 95px' }}>
            <ellipse cx="32" cy="90" rx="13" ry="10" fill="#FFD3A8" transform="rotate(-10 32 90)"/>
            <rect x="22" y="80" width="5" height="10" rx="2.5" fill="#FFD3A8" transform="rotate(-15 22 80)"/>
            <rect x="28" y="78" width="5" height="11" rx="2.5" fill="#FFD3A8" transform="rotate(-5 28 78)"/>
            <rect x="34" y="78" width="5" height="11" rx="2.5" fill="#FFD3A8" transform="rotate(5 34 78)"/>
            <rect x="40" y="80" width="5" height="10" rx="2.5" fill="#FFD3A8" transform="rotate(15 40 80)"/>
          </g>
        )}

        {/* Right hand */}
        {state !== 'success' && (
          <g className={coverHands ? 'hand-cover' : 'hand-uncover'} style={{ transformOrigin: '88px 95px' }}>
            <ellipse cx="88" cy="90" rx="13" ry="10" fill="#FFD3A8" transform="rotate(10 88 90)"/>
            <rect x="78" y="80" width="5" height="10" rx="2.5" fill="#FFD3A8" transform="rotate(-15 78 80)"/>
            <rect x="84" y="78" width="5" height="11" rx="2.5" fill="#FFD3A8" transform="rotate(-5 84 78)"/>
            <rect x="90" y="78" width="5" height="11" rx="2.5" fill="#FFD3A8" transform="rotate(5 90 78)"/>
            <rect x="96" y="80" width="5" height="10" rx="2.5" fill="#FFD3A8" transform="rotate(15 96 80)"/>
          </g>
        )}
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [charState, setCharState] = useState<'idle'|'password'|'error'|'success'>('idle');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [isOnPassword, setIsOnPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.ok) {
      setCharState('success');
      setTimeout(() => router.push('/dashboard'), 1200);
    } else {
      setError('❌ Wrong password! Dobara try karo.');
      setCharState('error');
      setShakeKey((k) => k + 1);
      setTimeout(() => setCharState(isOnPassword ? 'password' : 'idle'), 900);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A1628 0%, #1A3060 50%, #0A1628 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <LoginCharacter state={charState} shakeKey={shakeKey} />

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.5 }}>
            Team Intkhab Alam CRM
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.8)', marginTop: 4 }}>
            Real Estate Management Platform
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginBottom: 24 }}>
            Sign in to your account
          </h2>

          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.5)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              color: '#FCA5A5', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {error}
            </div>
          )}

          {charState === 'success' && (
            <div style={{
              background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(5,150,105,0.5)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
              color: '#6EE7B7', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ✅ Login successful! Dashboard khul raha hai...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.9)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onFocus={() => { setIsOnPassword(false); if (charState !== 'error') setCharState('idle'); }}
                placeholder="admin@crm.com"
                required
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, padding: '11px 14px', color: '#F1F5F9', fontSize: 13,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.9)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onFocus={() => { setIsOnPassword(true); if (charState !== 'error') setCharState('password'); }}
                onBlur={() => { setIsOnPassword(false); if (charState !== 'error' && charState !== 'success') setCharState('idle'); }}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${error ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 10, padding: '11px 14px', color: '#F1F5F9', fontSize: 13,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || charState === 'success'}
              style={{
                width: '100%',
                background: charState === 'success' ? '#1B4332' : loading ? '#2D4A35' : '#2D6A4F',
                color: 'white', border: 'none', borderRadius: 10, padding: '12px 18px',
                fontSize: 14, fontWeight: 700,
                cursor: (loading || charState === 'success') ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
                boxShadow: '0 4px 12px rgba(45,106,79,0.45)',
              }}
            >
              {loading
                ? <span><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Signing in...</span>
                : charState === 'success'
                ? <span><i className="fas fa-check" style={{ marginRight: 8 }}></i>Dashboard pe jaa raha hun...</span>
                : <span><i className="fas fa-sign-in-alt" style={{ marginRight: 8 }}></i>Sign In</span>
              }
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                style={{ background: 'none', border: 'none', color: 'rgba(143,184,154,0.8)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(143,184,154,0.45)' }}>
          Built with ❤️ by Team Intkhab Alam
        </div>

        {/* ── FORGOT PASSWORD MODAL ── */}
        {showForgot && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,46,31,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#1A2E1F', border: '1px solid rgba(143,184,154,0.15)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔑</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F1F5F9', marginBottom: 6 }}>Reset Password</div>
                <div style={{ fontSize: 12, color: 'rgba(143,184,154,0.7)', lineHeight: 1.5 }}>
                  {forgotSent
                    ? '✅ Reset instructions sent! Check your email.'
                    : 'Enter your email — admin will reset your password.'}
                </div>
              </div>
              {!forgotSent ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(143,184,154,0.8)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(143,184,154,0.2)', borderRadius: 10, padding: '11px 14px', color: '#F1F5F9', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
                    />
                  </div>
                  <div style={{ background: 'rgba(45,106,79,0.15)', border: '1px solid rgba(45,106,79,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 11, color: 'rgba(143,184,154,0.8)', lineHeight: 1.5 }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                    Contact your admin to reset password: <strong style={{ color: '#C2D9C8' }}>admin@crm.com</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => { setShowForgot(false); setForgotEmail(''); }}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.07)', color: 'rgba(143,184,154,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { if (forgotEmail) { setForgotSent(true); setTimeout(() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }, 3000); } }}
                      style={{ flex: 2, background: '#2D6A4F', color: 'white', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(45,106,79,0.4)' }}
                    >
                      <i className="fas fa-paper-plane" style={{ marginRight: 8 }}></i>Send Request
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
                  <div style={{ fontSize: 13, color: 'rgba(143,184,154,0.8)', marginBottom: 20 }}>
                    Request sent for <strong style={{ color: '#C2D9C8' }}>{forgotEmail}</strong>
                  </div>
                  <button
                    onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}
                    style={{ background: '#2D6A4F', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
