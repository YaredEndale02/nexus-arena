import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center bg-[#1A1C1F] border border-[#2B2E33] rounded-full p-0.5 text-xs font-bold tracking-wider",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-label="Switch to English"
        className={cn(
          "px-2.5 py-1 rounded-full transition-all duration-200 flex items-center gap-1",
          language === "en"
            ? "bg-[#D4AF37] text-black font-extrabold shadow-[0_0_12px_rgba(212,175,55,0.4)]"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="text-[11px]">EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage("am")}
        aria-label="Switch to Amharic"
        className={cn(
          "px-2.5 py-1 rounded-full transition-all duration-200 flex items-center gap-1",
          language === "am"
            ? "bg-[#D4AF37] text-black font-extrabold shadow-[0_0_12px_rgba(212,175,55,0.4)]"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="text-[11px]">አማ</span>
      </button>
    </div>
  );
}
