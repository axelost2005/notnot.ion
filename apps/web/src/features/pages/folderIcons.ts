import type { FolderIcon } from '@notnot/shared'
import {
  Archive,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Clapperboard,
  Code,
  Dumbbell,
  Folder,
  Globe,
  GraduationCap,
  Heart,
  House,
  KeyRound,
  Lightbulb,
  Music,
  Palette,
  Plane,
  Rocket,
  ShoppingCart,
  Star,
  User,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

type IconOption = { Icon: LucideIcon; label: string }

/** Sin ícono elegido: la carpeta de siempre (abierta o cerrada). */
export const DEFAULT_FOLDER_ICON: IconOption = { Icon: Folder, label: 'Carpeta' }

/** Los íconos que se pueden elegir, con su nombre para lectores de pantalla. */
export const FOLDER_ICON_OPTIONS: Record<FolderIcon, IconOption> = {
  briefcase: { Icon: Briefcase, label: 'Maletín' },
  users: { Icon: Users, label: 'Personas' },
  user: { Icon: User, label: 'Persona' },
  code: { Icon: Code, label: 'Código' },
  palette: { Icon: Palette, label: 'Paleta' },
  camera: { Icon: Camera, label: 'Cámara' },
  video: { Icon: Clapperboard, label: 'Video' },
  music: { Icon: Music, label: 'Música' },
  book: { Icon: BookOpen, label: 'Libro' },
  graduation: { Icon: GraduationCap, label: 'Birrete' },
  lightbulb: { Icon: Lightbulb, label: 'Lamparita' },
  star: { Icon: Star, label: 'Estrella' },
  heart: { Icon: Heart, label: 'Corazón' },
  home: { Icon: House, label: 'Casa' },
  calendar: { Icon: Calendar, label: 'Calendario' },
  cart: { Icon: ShoppingCart, label: 'Carrito' },
  plane: { Icon: Plane, label: 'Avión' },
  food: { Icon: Utensils, label: 'Cubiertos' },
  gym: { Icon: Dumbbell, label: 'Pesa' },
  key: { Icon: KeyRound, label: 'Llave' },
  globe: { Icon: Globe, label: 'Mundo' },
  rocket: { Icon: Rocket, label: 'Cohete' },
  archive: { Icon: Archive, label: 'Archivo' },
}
