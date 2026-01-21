import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import useSound from "@/hooks/useSound";

interface DuoCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  colorClass?: string;
}

export function DuoCard({ children, onClick, className = "", colorClass }: DuoCardProps) {
  const { playSound } = useSound();

  const handleClick = () => {
    playSound('tap');
    onClick?.();
  };

  return (
    <motion.div
      className={`duo-card p-4 cursor-pointer ${colorClass} ${className}`}
      onClick={handleClick}
      whileHover={{ y: -2 }}
      whileTap={{ y: 2 }}
    >
      {children}
    </motion.div>
  );
}

interface DuoButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  className?: string;
  disabled?: boolean;
}

export function DuoButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  icon: Icon,
  className = "",
  disabled = false
}: DuoButtonProps) {
  const { playSound } = useSound();

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'duo-button-primary',
    secondary: 'duo-button-secondary',
    accent: 'duo-button-accent',
    destructive: 'duo-button-destructive',
  };

  const handleClick = () => {
    if (!disabled) {
      playSound(variant === 'primary' ? 'success' : 'tap');
      onClick?.();
    }
  };

  return (
    <motion.button
      className={`duo-button ${variantClasses[variant]} ${sizeClasses[size]} ${className} flex items-center justify-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleClick}
      whileTap={disabled ? {} : { y: 2 }}
      disabled={disabled}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </motion.button>
  );
}

interface DuoBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple' | 'pink';
}

export function DuoBadge({ children, variant = 'default' }: DuoBadgeProps) {
  const variantClasses = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    info: 'bg-info text-info-foreground',
    purple: 'bg-purple text-purple-foreground',
    pink: 'bg-pink text-pink-foreground',
  };

  return (
    <span className={`duo-badge ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}

interface DuoIconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}

export function DuoIconButton({ 
  icon: Icon, 
  onClick, 
  variant = 'primary',
  size = 'md'
}: DuoIconButtonProps) {
  const { playSound } = useSound();

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground shadow-[0_4px_0_0_hsl(145_65%_32%)]',
    secondary: 'bg-secondary text-secondary-foreground shadow-[0_4px_0_0_hsl(210_20%_82%)]',
    accent: 'bg-accent text-accent-foreground shadow-[0_4px_0_0_hsl(35_100%_40%)]',
  };

  const handleClick = () => {
    playSound('pop');
    onClick?.();
  };

  return (
    <motion.button
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-2xl flex items-center justify-center transition-all`}
      onClick={handleClick}
      whileTap={{ y: 2 }}
    >
      <Icon className={iconSizes[size]} />
    </motion.button>
  );
}
