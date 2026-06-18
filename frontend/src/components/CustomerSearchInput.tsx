interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label": string;
  disabled?: boolean;
}

export default function CustomerSearchInput({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  disabled = false,
}: Props) {
  return (
    <div className="customers-search">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
      />
    </div>
  );
}
