import { cn } from '@/lib/utils';
import { getWolfAvatar, pickDefaultWolfAvatar } from '@/lib/wolf-avatars';
import { getPinIcon, getPinTheme } from '@/lib/pin-themes';

interface WolfAvatarProps {
  avatarKey?: string | null;
  /** Used as seed to pick a deterministic default avatar when avatarKey is empty. */
  seed?: string | null;
  /** Visible name shown in alt text. */
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Optional featured pin shown as a badge integrated on the avatar. */
  featuredPin?: { name: string; rarity: string; category: string } | null;
}

const SIZE_MAP: Record<NonNullable<WolfAvatarProps['size']>, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const BADGE_SIZE: Record<NonNullable<WolfAvatarProps['size']>, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

const ICON_SIZE: Record<NonNullable<WolfAvatarProps['size']>, number> = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
};

export function WolfAvatar({ avatarKey, seed, name, size = 'md', className, featuredPin }: WolfAvatarProps) {
  const chosen = getWolfAvatar(avatarKey) ?? pickDefaultWolfAvatar(seed ?? name ?? avatarKey);
  const hasPin = !!featuredPin;
  const [c1, c2] = hasPin ? getPinTheme(featuredPin!) : ['', '', ''];
  const PinIcon = hasPin ? getPinIcon(featuredPin!) : null;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border',
        SIZE_MAP[size],
        className,
      )}
      title={name ?? chosen.label}
    >
      <img
        src={chosen.src}
        alt={name ?? chosen.label}
        loading="lazy"
        width={512}
        height={512}
        className="h-full w-full object-cover"
      />
      {hasPin && PinIcon && (
        <span
          className={cn(
            'absolute bottom-0 right-0 flex items-center justify-center rounded-full ring-2 ring-background shadow-sm',
            BADGE_SIZE[size],
          )}
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          title={featuredPin!.name}
        >
          <PinIcon size={ICON_SIZE[size]} className="text-white" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}
