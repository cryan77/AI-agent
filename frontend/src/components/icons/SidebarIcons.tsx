interface IconProps {
  className?: string;
}

export function IconPanelExpand({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16v14H4V5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="miter"
      />
      <path d="M9 5v14" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M13 9.5 16.5 12 13 14.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.75" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M16.25 16.25 20 20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
    </svg>
  );
}
