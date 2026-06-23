import { useEffect, useRef, useState } from 'react';

let counter = 0;
const nextId = () => `row-${(counter += 1)}`;

interface KeyedRow<T> {
  id: string;
  value: T;
}

/**
 * Controlled list editor state with stable per-row keys (so we never key on the
 * array index — SonarQube S6479). Re-seeds when the parent replaces `value`
 * from outside (e.g. opening the edit dialog for a different club).
 */
export function useKeyedRows<T>(value: T[], onChange: (value: T[]) => void) {
  const [rows, setRows] = useState<KeyedRow<T>[]>(() =>
    value.map((item) => ({ id: nextId(), value: item }))
  );
  const lastEmitted = useRef(JSON.stringify(value));

  useEffect(() => {
    const incoming = JSON.stringify(value);
    if (incoming !== lastEmitted.current) {
      lastEmitted.current = incoming;
      setRows(value.map((item) => ({ id: nextId(), value: item })));
    }
  }, [value]);

  const commit = (next: KeyedRow<T>[]) => {
    setRows(next);
    const plain = next.map((row) => row.value);
    lastEmitted.current = JSON.stringify(plain);
    onChange(plain);
  };

  return {
    rows,
    add: (item: T) => commit([...rows, { id: nextId(), value: item }]),
    update: (id: string, item: T) =>
      commit(rows.map((row) => (row.id === id ? { ...row, value: item } : row))),
    remove: (id: string) => commit(rows.filter((row) => row.id !== id)),
  };
}
