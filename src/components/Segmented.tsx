type Props<K extends string> = {
  options: [K, string][];
  value: K;
  onChange: (key: K) => void;
  small?: boolean;
  label: string;
};

export function Segmented<K extends string>({ options, value, onChange, small, label }: Props<K>) {
  return (
    <div className={'seg' + (small ? ' seg--sm' : '')} role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button key={key} aria-pressed={key === value} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  );
}
