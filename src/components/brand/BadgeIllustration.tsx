type BadgeIllustrationProps = {
  className?: string
}

/** Mini lanyard / reading-badge graphic for kiosk scan prompts. */
export default function BadgeIllustration({
  className = 'h-20 w-15',
}: BadgeIllustrationProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 80"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="52" height="72" rx="4" fill="#fffef8" stroke="#e5d4bc" strokeWidth="1.5" />
      <rect x="4" y="4" width="52" height="18" rx="4" fill="#8b0000" />
      <rect x="4" y="18" width="52" height="4" fill="#8b0000" />
      <text
        x="30"
        y="16"
        textAnchor="middle"
        fill="#fffef8"
        fontFamily="Georgia, serif"
        fontSize="8"
        fontWeight="700"
        letterSpacing="0.08em"
      >
        B.A.R.T.
      </text>
      <rect x="18" y="28" width="24" height="24" rx="2" fill="#faf4e8" stroke="#d4c4a8" strokeWidth="1" />
      <rect x="20" y="30" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="26" y="30" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="32" y="30" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="38" y="30" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="20" y="36" width="4" height="4" fill="#1c1410" opacity="0.55" />
      <rect x="26" y="36" width="4" height="4" fill="#1c1410" opacity="0.55" />
      <rect x="32" y="36" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="38" y="36" width="4" height="4" fill="#1c1410" opacity="0.55" />
      <rect x="20" y="42" width="4" height="4" fill="#1c1410" opacity="0.55" />
      <rect x="26" y="42" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="32" y="42" width="4" height="4" fill="#1c1410" opacity="0.55" />
      <rect x="38" y="42" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="20" y="48" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="26" y="48" width="4" height="4" fill="#1c1410" opacity="0.55" />
      <rect x="32" y="48" width="4" height="4" fill="#1c1410" opacity="0.85" />
      <rect x="38" y="48" width="4" height="4" fill="#1c1410" opacity="0.55" />
      <rect x="22" y="58" width="16" height="3" rx="1" fill="#e5d4bc" />
      <rect x="26" y="64" width="8" height="2" rx="1" fill="#d4c4a8" />
      <path
        d="M 8 76 L 52 76"
        stroke="#d4c4a8"
        strokeWidth="1"
        strokeDasharray="3 2"
      />
    </svg>
  )
}
