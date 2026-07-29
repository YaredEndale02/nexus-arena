import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthPanel } from "@/components/AuthPanel";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn().mockResolvedValue({ pendingConfirmation: false }),
    signInWithProvider: vi.fn(),
    resetPassword: vi.fn(),
    isLoading: false,
  }),
}));

describe("AuthPanel Role-Tailored Registration", () => {
  it("renders Player registration fields by default when Register is clicked", () => {
    render(<AuthPanel />);
    const registerTab = screen.getByRole("button", { name: /register account/i });
    fireEvent.click(registerTab);

    expect(screen.getByText("Player")).toBeDefined();
    expect(screen.getByText("Organizer")).toBeDefined();
    expect(screen.getByLabelText(/gamer tag /i)).toBeDefined();
  });

  it("switches to Organizer registration fields when Organizer role is selected", () => {
    render(<AuthPanel />);
    const registerTab = screen.getByRole("button", { name: /register account/i });
    fireEvent.click(registerTab);

    const organizerCard = screen.getByText("Organizer");
    fireEvent.click(organizerCard);

    expect(screen.getByLabelText(/club \/ org name/i)).toBeDefined();
    expect(screen.getByLabelText(/venue \/ city/i)).toBeDefined();
  });
});
