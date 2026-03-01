import React, { InputHTMLAttributes } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const GlassInput: React.FC<GlassInputProps> = ({
  icon,
  className = "",
  ...props
}) => {
  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        {icon}
      </div>
      <input
        className={`
          w-full 
          bg-white/20 
          hover:bg-white/30 
          focus:bg-white/35 
          border border-white/10 
          focus:border-white/40
          rounded-full 
          py-3.5 pl-12 pr-4 
          text-white 
          placeholder-white/70 
          outline-none 
          transition-all duration-300 
          ${className}
        `}
        {...props}
      />
    </div>
  );
};

export default GlassInput;
