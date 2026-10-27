import { Baby, BookOpen, Boxes, Car, Dumbbell, Footprints, Package, Palette, PawPrint, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, Watch, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { Baby, BookOpen, Boxes, Car, Dumbbell, Footprints, Package, Palette, PawPrint, Shirt, ShoppingBasket, Smartphone, Sofa, Sparkles, Watch };

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Package;
  return <Icon className={className} aria-hidden />;
}
