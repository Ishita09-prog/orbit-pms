import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Logo } from '../components/AppShell.jsx';

const DEMO_TASKS = [
  { name: 'Design the new homepage', tag: 'High · Fri' },
  { name: 'Review pull requests', tag: 'Medium · Today' },
  { name: 'Ship the Android build', tag: 'High · Mon' },
];

/** Hero with a looping mini-demo: tasks tick themselves off one by one, then reset. */
function FloatingTasks() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (DEMO_TASKS.length + 2)), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="float-stack" aria-hidden="true">
      {DEMO_TASKS.map((task, i) => {
        const done = step > i && step <= DEMO_TASKS.length;
        return (
          <motion.div
            key={task.name}
            className="float-card"
            style={{ top: i * 78 }}
            initial={{ opacity: 0, y: 30, x: i % 2 ? 24 : -8 }}
            animate={{ opacity: 1, y: [0, -7, 0], x: i % 2 ? 24 : -8 }}
            transition={{
              opacity: { delay: 0.4 + i * 0.18, duration: 0.6 },
              y: { delay: 0.4 + i * 0.18, duration: 5 + i, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <span className="check" aria-checked={done} style={done ? { borderColor: 'var(--mint)', background: 'var(--mint)' } : undefined}>
              <motion.span animate={{ scale: done ? 1 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }} style={{ display: 'grid' }}>
                <Check size={16} strokeWidth={3.2} />
              </motion.span>
            </span>
            <span style={done ? { color: 'var(--faint)', textDecoration: 'line-through' } : undefined}>{task.name}</span>
            <small>{task.tag}</small>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <motion.section className="auth-hero" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <div className="brand">
          <Logo size={38} /> Orbit
        </div>
        <div>
          <h1>Keep every project moving.</h1>
          <p className="lead">Plan projects, break them into tasks and watch your progress add up — on the web or on your phone, always in sync.</p>
        </div>
        <FloatingTasks />
      </motion.section>
      <section className="auth-panel">
        <motion.div className="card auth-card" initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.1 }}>
          {children}
        </motion.div>
      </section>
    </div>
  );
}
