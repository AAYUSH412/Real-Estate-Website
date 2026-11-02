import React from 'react';

const SimpleFooter: React.FC = () => {
  return (
    <footer className="bg-[#F2EFE9] border-t border-[#E6E0DA] py-8">
      <div className="max-w-[1280px] mx-auto px-8 text-center">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 bg-[#D4755B] rounded-full" />
          <span className="font-manrope font-extralight text-sm text-[#1E293B] uppercase tracking-widest">
            BuildEstate
          </span>
        </div>

        {/* Copyright */}
        <p className="font-manrope font-extralight text-xs text-[#94A3B8]">
          © {new Date().getFullYear()} BuildEstate. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default SimpleFooter;