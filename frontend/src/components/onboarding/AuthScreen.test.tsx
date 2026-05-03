import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthScreen } from "./AuthScreen";
import { getSupabase } from "@/lib/supabase";

// Mock Supabase client
jest.mock("@/lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

describe("AuthScreen", () => {
  const mockOnAuthComplete = jest.fn();
  const mockOnError = jest.fn();
  const mockSignInWithOAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    });
  });

  it("should render the Google OAuth button", () => {
    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("should display loading spinner during OAuth flow", async () => {
    mockSignInWithOAuth.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: {}, error: null }), 100)
        )
    );

    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
  });

  it("should call signInWithOAuth with correct parameters", async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    });
  });

  it("should handle OAuth errors and display error message", async () => {
    const mockError = new Error("Network error");
    mockSignInWithOAuth.mockRejectedValue(mockError);

    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/network error/i)
      ).toBeInTheDocument();
    });

    expect(mockOnError).toHaveBeenCalled();
  });

  it("should handle OAuth cancellation", async () => {
    const mockError = new Error("User cancelled the sign-in");
    mockSignInWithOAuth.mockRejectedValue(mockError);

    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/sign-in was cancelled/i)
      ).toBeInTheDocument();
    });
  });

  it("should allow retry after error", async () => {
    const mockError = new Error("Network error");
    mockSignInWithOAuth.mockRejectedValueOnce(mockError);
    mockSignInWithOAuth.mockResolvedValueOnce({ data: {}, error: null });

    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText(/try again/i);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(2);
    });
  });

  it("should disable button during loading", async () => {
    mockSignInWithOAuth.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: {}, error: null }), 100)
        )
    );

    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it("should have accessible button with aria-label", () => {
    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    const button = screen.getByRole("button", { name: /continue with google/i });
    expect(button).toHaveAttribute("aria-label", "Continue with Google");
  });

  it("should display privacy notice", () => {
    render(
      <AuthScreen
        onAuthComplete={mockOnAuthComplete}
        onError={mockOnError}
      />
    );

    expect(
      screen.getByText(/by continuing, you agree to our terms of service/i)
    ).toBeInTheDocument();
  });
});
