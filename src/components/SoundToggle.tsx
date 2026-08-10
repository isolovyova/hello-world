type SoundToggleProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  return (
    <button
      className={`sound-toggle ${enabled ? 'sound-toggle--enabled' : ''}`}
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? 'Turn sound off' : 'Turn sound on'}
      onClick={onToggle}
    >
      <span aria-hidden="true">{enabled ? 'sound off' : 'sound on'}</span>
    </button>
  );
}
