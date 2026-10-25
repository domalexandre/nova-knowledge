import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, CloudOff, LoaderCircle, LogIn, LogOut, UserRound, X } from 'lucide-react';
import './account.css';

export default function AccountModal({ account, onClose }) {
  const [mode, setMode] = useState('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMessage('');
    setError('');
  }, [mode]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (mode === 'signup') {
        const data = await account.signUp({ email, password, displayName });
        if (data?.session) {
          setMessage('Account created. Your NOVA data is syncing now.');
        } else {
          setMessage('Account created. Check your email to confirm the account, then sign in.');
        }
      } else {
        await account.signIn({ email, password });
        setMessage('Signed in. Your interests and saved ideas are syncing.');
      }
    } catch (requestError) {
      setError(requestError?.message || 'Could not complete that request.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError('');
    try {
      await account.signOut();
      onClose();
    } catch (requestError) {
      setError(requestError?.message || 'Could not sign out.');
      setBusy(false);
    }
  };

  const syncLabel = {
    connecting: 'Connecting…',
    syncing: 'Syncing your NOVA data…',
    synced: 'Cloud sync active',
    error: 'Cloud sync needs attention',
    guest: 'Guest mode',
  }[account.cloudState] || 'Guest mode';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal account-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close account"><X /></button>

        <span className="eyebrow"><UserRound size={14} /> NOVA ACCOUNT</span>

        {!account.configured ? (
          <div className="account-unconfigured">
            <CloudOff size={30} />
            <h2>Cloud accounts are being connected</h2>
            <p>You can keep using NOVA in guest mode. Your interests and saved ideas stay on this device until cloud sync is enabled.</p>
          </div>
        ) : account.user ? (
          <div className="account-signed-in">
            <div className="account-avatar"><UserRound size={25} /></div>
            <h2>{account.user.user_metadata?.display_name || 'Your NOVA account'}</h2>
            <p className="account-email">{account.user.email}</p>
            <div className={`sync-status ${account.cloudState === 'error' ? 'error' : ''}`}>
              {account.cloudState === 'synced' ? <CheckCircle2 size={17} /> : <Cloud size={17} />}
              <span>{syncLabel}</span>
            </div>
            {account.cloudError && <div className="account-error">{account.cloudError}</div>}
            <div className="account-benefits">
              <span>✓ Interests sync between devices</span>
              <span>✓ Saved ideas stay with your account</span>
              <span>✓ Reading and AI activity can personalise your feed</span>
            </div>
            <button className="account-secondary" onClick={handleSignOut} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <LogOut size={17} />} Sign out
            </button>
          </div>
        ) : (
          <>
            <h2>{mode === 'signin' ? 'Welcome back' : 'Create your NOVA account'}</h2>
            <p>{mode === 'signin' ? 'Sign in to keep your knowledge feed in sync.' : 'Your current guest interests and saved ideas will be carried into the account.'}</p>

            <div className="account-mode-tabs">
              <button className={mode === 'signin' ? 'selected' : ''} onClick={() => setMode('signin')}>Sign in</button>
              <button className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>Create account</button>
            </div>

            <form className="account-form" onSubmit={submit}>
              {mode === 'signup' && (
                <label>
                  Name
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value.slice(0, 80))} placeholder="How NOVA should address you" autoComplete="name" />
                </label>
              )}
              <label>
                Email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength="8" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
              </label>
              <button className="account-primary" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}
                {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            {message && <div className="account-message">{message}</div>}
            {error && <div className="account-error">{error}</div>}
            <p className="account-privacy">NOVA only stores the account data needed to sync your preferences, saved ideas and product activity.</p>
          </>
        )}
      </div>
    </div>
  );
}
