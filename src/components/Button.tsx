import { ReactNode } from 'react';

import Spinner from './Spinner';

interface ButtonProps {
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

const Button = ({
  children,
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  variant = 'primary',
  onClick,
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={
        'min-w-[82.55px] flex items-center justify-center p-4 font-bold rounded text-[13.8px] tracking-[.057em] uppercase transition-all duration-300 ease-out disabled:bg-[#dddddd] disabled:border-[#dddddd] disabled:hover:bg-[#dddddd] disabled:hover:border-[#dddddd] disabled:text-[#1d1c1dbf] ' +
        (variant === 'primary'
          ? 'text-[#fff] bg-[#034697] border-[#034697] hover:bg-[#023775] border hover:border-[#023775] '
          : 'text-[#034697] bg-[#fff] shadow-[inset_0_0_0_1px_#034697] hover:shadow-[inset_0_0_0_2px_#034697] ') +
        className
      }
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {!loading && children}
      {loading && <Spinner />}
    </button>
  );
};

export default Button;
