interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: 'default' | 'outline';
}

export function Button({ 
  children, 
  className = "", 
  isLoading = false, 
  variant = 'default',
  ...props 
}: ButtonProps) {
  const baseStyles = "w-full max-w-xs mx-auto block py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    default: "bg-[#7C65C1] text-white hover:bg-[#6952A3] disabled:hover:bg-[#7C65C1]",
    outline: "bg-transparent text-[#7C65C1] border border-[#7C65C1] hover:bg-[#F8F5FF] disabled:hover:bg-transparent"
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
        </div>
      ) : (
        children
      )}
    </button>
  );
}
