/**
 * Registre unique d'icônes (Phosphor, variante bold). Imports profonds pour ne pas
 * embarquer les ~1500 icônes du paquet. Les clés de pictogrammes d'activités
 * correspondent à la colonne `categories.icon`.
 */
import type { Icon } from 'phosphor-react-native';
import { ArrowLeftIcon as ArrowLeft } from 'phosphor-react-native/src/icons/ArrowLeft';
import { BarbellIcon as Barbell } from 'phosphor-react-native/src/icons/Barbell';
import { BasketballIcon as Basketball } from 'phosphor-react-native/src/icons/Basketball';
import { BellIcon as Bell } from 'phosphor-react-native/src/icons/Bell';
import { BicycleIcon as Bicycle } from 'phosphor-react-native/src/icons/Bicycle';
import { BookmarkSimpleIcon as BookmarkSimple } from 'phosphor-react-native/src/icons/BookmarkSimple';
import { BoxingGloveIcon as BoxingGlove } from 'phosphor-react-native/src/icons/BoxingGlove';
import { CalendarBlankIcon as CalendarBlank } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CaretDownIcon as CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretRightIcon as CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { ChatCircleDotsIcon as ChatCircleDots } from 'phosphor-react-native/src/icons/ChatCircleDots';
import { CheckIcon as Check } from 'phosphor-react-native/src/icons/Check';
import { ClockIcon as Clock } from 'phosphor-react-native/src/icons/Clock';
import { CopyIcon as Copy } from 'phosphor-react-native/src/icons/Copy';
import { DiceFiveIcon as DiceFive } from 'phosphor-react-native/src/icons/DiceFive';
import { DiscIcon as Disc } from 'phosphor-react-native/src/icons/Disc';
import { DotsThreeIcon as DotsThree } from 'phosphor-react-native/src/icons/DotsThree';
import { FlagIcon as Flag } from 'phosphor-react-native/src/icons/Flag';
import { GameControllerIcon as GameController } from 'phosphor-react-native/src/icons/GameController';
import { GolfIcon as Golf } from 'phosphor-react-native/src/icons/Golf';
import { HockeyIcon as Hockey } from 'phosphor-react-native/src/icons/Hockey';
import { HorseIcon as Horse } from 'phosphor-react-native/src/icons/Horse';
import { ListBulletsIcon as ListBullets } from 'phosphor-react-native/src/icons/ListBullets';
import { LightningIcon as Lightning } from 'phosphor-react-native/src/icons/Lightning';
import { MagnifyingGlassIcon as MagnifyingGlass } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinIcon as MapPin } from 'phosphor-react-native/src/icons/MapPin';
import { MapTrifoldIcon as MapTrifold } from 'phosphor-react-native/src/icons/MapTrifold';
import { MountainsIcon as Mountains } from 'phosphor-react-native/src/icons/Mountains';
import { PaintBrushIcon as PaintBrush } from 'phosphor-react-native/src/icons/PaintBrush';
import { PersonSimpleRunIcon as PersonSimpleRun } from 'phosphor-react-native/src/icons/PersonSimpleRun';
import { PersonSimpleTaiChiIcon as PersonSimpleTaiChi } from 'phosphor-react-native/src/icons/PersonSimpleTaiChi';
import { PlusIcon as Plus } from 'phosphor-react-native/src/icons/Plus';
import { ProhibitIcon as Prohibit } from 'phosphor-react-native/src/icons/Prohibit';
import { RacquetIcon as Racquet } from 'phosphor-react-native/src/icons/Racquet';
import { ShareNetworkIcon as ShareNetwork } from 'phosphor-react-native/src/icons/ShareNetwork';
import { ShieldCheckIcon as ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { SlidersHorizontalIcon as SlidersHorizontal } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { SoccerBallIcon as SoccerBall } from 'phosphor-react-native/src/icons/SoccerBall';
import { TennisBallIcon as TennisBall } from 'phosphor-react-native/src/icons/TennisBall';
import { ThumbsDownIcon as ThumbsDown } from 'phosphor-react-native/src/icons/ThumbsDown';
import { ThumbsUpIcon as ThumbsUp } from 'phosphor-react-native/src/icons/ThumbsUp';
import { UserCircleIcon as UserCircle } from 'phosphor-react-native/src/icons/UserCircle';
import { UsersThreeIcon as UsersThree } from 'phosphor-react-native/src/icons/UsersThree';
import { VolleyballIcon as Volleyball } from 'phosphor-react-native/src/icons/Volleyball';
import { WarningCircleIcon as WarningCircle } from 'phosphor-react-native/src/icons/WarningCircle';
import { WifiSlashIcon as WifiSlash } from 'phosphor-react-native/src/icons/WifiSlash';
import { XIcon as X } from 'phosphor-react-native/src/icons/X';
import { CompassIcon as Compass } from 'phosphor-react-native/src/icons/Compass';
import { PaperPlaneTiltIcon as PaperPlaneTilt } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { SunIcon as Sun } from 'phosphor-react-native/src/icons/Sun';
import { MoonIcon as Moon } from 'phosphor-react-native/src/icons/Moon';
import { NavigationArrowIcon as NavigationArrow } from 'phosphor-react-native/src/icons/NavigationArrow';
import { ArrowsClockwiseIcon as ArrowsClockwise } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { SignOutIcon as SignOut } from 'phosphor-react-native/src/icons/SignOut';
import { TrashIcon as Trash } from 'phosphor-react-native/src/icons/Trash';
import { LockSimpleIcon as LockSimple } from 'phosphor-react-native/src/icons/LockSimple';
import { ImageIcon as ImageSquare } from 'phosphor-react-native/src/icons/Image';
import { EnvelopeSimpleIcon as EnvelopeSimple } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { GoogleLogoIcon as GoogleLogo } from 'phosphor-react-native/src/icons/GoogleLogo';
import { AppleLogoIcon as AppleLogo } from 'phosphor-react-native/src/icons/AppleLogo';
import { LinkSimpleIcon as LinkSimple } from 'phosphor-react-native/src/icons/LinkSimple';
import { UserPlusIcon as UserPlus } from 'phosphor-react-native/src/icons/UserPlus';
import { MinusIcon as Minus } from 'phosphor-react-native/src/icons/Minus';

export const Icons = {
  ArrowLeft, ArrowsClockwise, Bell, BookmarkSimple, CalendarBlank, CaretDown, CaretRight, ChatCircleDots,
  Check, Clock, Compass, Copy, DotsThree, Flag, Lightning, ListBullets, LockSimple, MagnifyingGlass, MapPin,
  MapTrifold, Minus, Moon, NavigationArrow, PaperPlaneTilt, Plus, Prohibit, ShareNetwork, ShieldCheck,
  SignOut, SlidersHorizontal, Sun, ThumbsDown, ThumbsUp, Trash, UserCircle, UserPlus, UsersThree,
  WarningCircle, WifiSlash, X, ImageSquare, EnvelopeSimple, GoogleLogo, AppleLogo, LinkSimple,
} satisfies Record<string, Icon>;

/** Pictogrammes d'activités (clé = categories.icon). */
export const activityIcons = {
  'team-sports': UsersThree,
  basketball: Basketball,
  soccer: SoccerBall,
  volleyball: Volleyball,
  hockey: Hockey,
  ultimate: Disc,
  running: PersonSimpleRun,
  cycling: Bicycle,
  golf: Golf,
  'horse-riding': Horse,
  racket: Racquet,
  tennis: TennisBall,
  fitness: PersonSimpleTaiChi,
  barbell: Barbell,
  outdoors: Mountains,
  combat: BoxingGlove,
  'board-games': DiceFive,
  esports: GameController,
  creative: PaintBrush,
  other: DotsThree,
} satisfies Record<string, Icon>;

export function activityIcon(key: string | null | undefined): Icon {
  return activityIcons[(key ?? 'other') as keyof typeof activityIcons] ?? activityIcons.other;
}

export type { Icon };
