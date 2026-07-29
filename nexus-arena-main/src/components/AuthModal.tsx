import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthPanel } from "./AuthPanel";
import { useAuth } from "@/hooks/useAuth";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function AuthModal({
  isOpen,
  onOpenChange,
  title = "Sign In / Register",
  description = "Access tournament brackets, LAN station desks, and live broadcasts.",
}: AuthModalProps) {
  const { user } = useAuth();

  // Automatically close modal when user state logs in
  useEffect(() => {
    if (user && isOpen) {
      onOpenChange(false);
    }
  }, [user, isOpen, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 bg-transparent border-none shadow-none max-h-[90vh] overflow-y-auto">
        <AuthPanel
          title={title}
          description={description}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
