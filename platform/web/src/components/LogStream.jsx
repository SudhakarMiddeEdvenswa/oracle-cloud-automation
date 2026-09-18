import React, { useEffect, useRef } from 'react';

/** The run's live log, newest line at the bottom, auto-scrolled while running. */
export default function LogStream({ lines, running }) {
  const box = useRef(null);
  const pinned = useRef(true);

  // Follow the tail unless the user has scrolled up to read something.
  useEffect(() => {
    const el = box.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  return (
    <section className="card">
      <h2>
        Live log {running ? '(running)' : ''} — {lines.length} lines
      </h2>
      {lines.length === 0 ? (
        <div className="empty">Nothing yet.</div>
      ) : (
        <pre className="log" ref={box} onScroll={onScroll}>
          {lines.map((line, i) => (
            <div className={`line ${line.level}`} key={i}>
              <span className="t">{time(line.ts)}</span>
              {line.rowNumber ? <span className="t">row {line.rowNumber}</span> : null}
              {line.message}
            </div>
          ))}
        </pre>
      )}
    </section>
  );
}

function time(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour12: false });
}
