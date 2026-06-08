'use client';
import { useEffect, useState } from 'react';

interface ChallengeData {
  callsDone: number; callsTarget: number;
  closedDone: number; closedTarget: number;
  whatsappDone: number; whatsappTarget: number;
  streak: number; longestStreak: number; totalXP: number;
  completed: boolean;
}

export default function DailyChallenge({ agentId }: { agentId: number }) {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    fetch('/api/gamification/challenge').then(r => r.json()).then(d => {
      setData(d);
      if (d.completed && !sessionStorage.getItem('celebrated_' + new Date().toISOString().slice(0,10))) {
        setShowCelebration(true);
        sessionStorage.setItem('celebrated_' + new Date().toISOString().slice(0,10), '1');
        setTimeout(() => setShowCelebration(false), 4000);
      }
    });
    const interval = setInterval(() => {
      fetch('/api/gamification/challenge').then(r => r.json()).then(setData);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const pct = (done: number, target: number) => Math.min(100, Math.round((done / target) * 100));
  const allDone = data.callsDone >= data.callsTarget && data.closedDone >= data.closedTarget && data.whatsappDone >= data.whatsappTarget;

  const level = data.totalXP < 100 ? { name: 'Rookie', icon: '🥉', color: '#CD7F32' }
    : data.totalXP < 500 ? { name: 'Silver', icon: '🥈', color: '#C0C0C0' }
    : data.totalXP < 1500 ? { name: 'Gold', icon: '🥇', color: '#FFD700' }
    : { name: 'Diamond', icon: '💎', color: '#00BFFF' };

  return (
    <>
      {/* Celebration Popup */}
      {showCelebration && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg,#1A3A6B,#2550A0)', borderRadius: 20, padding: '32px 48px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', animation: 'popIn 0.4s ease' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Challenge Complete!</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Aaj ka challenge pura ho gaya! Zabardast kaam! 🔥</div>
            <div style={{ marginTop: 12, fontSize: 18, color: '#FFD700', fontWeight: 700 }}>+{data.callsDone + data.closedDone * 10 + data.whatsappDone * 2} XP Earned!</div>
          </div>
        </div>
      )}

      {/* Challenge Widget */}
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: '0 4px 20px rgba(26,58,107,0.08)',
        overflow: 'hidden',
        transition: 'all 0.3s'
      }}>
        {/* Header */}
        <div onClick={() => setMinimized(v => !v)} style={{
          background: allDone ? 'linear-gradient(135deg,#059669,#10B981)' : 'linear-gradient(135deg,#1A3A6B,#2550A0)',
          padding: '12px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{allDone ? '✅' : '🎯'}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Daily Challenge</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Streak */}
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{data.streak}</span>
            </div>
            {/* Level */}
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14 }}>{level.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{level.name}</span>
            </div>
            <i className={`fas fa-chevron-${minimized ? 'down' : 'up'}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}></i>
          </div>
        </div>

        {!minimized && (
          <div style={{ padding: '14px 16px' }}>
            {/* XP bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Total XP: <strong style={{ color: 'var(--accent)' }}>{data.totalXP.toLocaleString()}</strong></span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Best streak: 🔥{data.longestStreak} days</span>
            </div>

            {/* Challenges */}
            {[
              { label: '📞 Calls Today', done: data.callsDone, target: data.callsTarget, color: '#3B82F6' },
              { label: '🤝 Deals Closed', done: data.closedDone, target: data.closedTarget, color: '#10B981' },
              { label: '💬 WhatsApp Sent', done: data.whatsappDone, target: data.whatsappTarget, color: '#25D366' },
            ].map(c => (
              <div key={c.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{c.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.done >= c.target ? '#059669' : 'var(--text2)' }}>
                    {c.done >= c.target ? '✅' : ''} {c.done}/{c.target}
                  </span>
                </div>
                <div style={{ background: '#F1F5F9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    width: `${pct(c.done, c.target)}%`,
                    background: c.done >= c.target ? '#10B981' : c.color,
                    transition: 'width 0.5s ease',
                    boxShadow: c.done >= c.target ? `0 0 8px ${c.color}88` : 'none'
                  }}></div>
                </div>
              </div>
            ))}

            {allDone && (
              <div style={{ marginTop: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#065F46', textAlign: 'center', fontWeight: 600 }}>
                🎉 Aaj ka challenge complete! Kal phir milein!
              </div>
            )}

            {!allDone && (
              <div style={{ marginTop: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#1D4ED8', textAlign: 'center' }}>
                💪 Mehnat karo — challenge pura karo aur streak badhao!
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </>
  );
}
