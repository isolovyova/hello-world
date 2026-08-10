type BirthCounterProps = {
  count: number;
};

export function BirthCounter({ count }: BirthCounterProps) {
  return (
    <p className="birth-counter" aria-live="polite">
      <strong>{count.toLocaleString()}</strong>{' '}
      {count === 1 ? 'life has begun' : 'lives have begun'} since you arrived.
    </p>
  );
}

