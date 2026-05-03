import { render, screen, waitFor } from "@testing-library/react";
import { OnboardingFlow } from "./OnboardingFlow";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

// Mock the child screen components
jest.mock("./AuthScreen", () => ({
  AuthScreen: ({ onAuthComplete }: any) => (
    <div data-testid="auth-screen">
      <button onClick={() => onAuthComplete({ id: "1", email: "test@example.com", displayName: "Test User" })}>
        Sign In
      </button>
    </div>
  ),
}));

jest.mock("./CameraPermissionScreen", () => ({
  CameraPermissionScreen: ({ onPermissionGranted, onPermissionDenied }: any) => (
    <div data-testid="camera-permission-screen">
      <button onClick={onPermissionGranted}>Grant Permission</button>
      <button onClick={onPermissionDenied}>Deny Permission</button>
    </div>
  ),
}));

jest.mock("./SelfieCaptureScreen", () => ({
  SelfieCaptureScreen: ({ onCapture }: any) => (
    <div data-testid="selfie-capture-screen">
      <button onClick={() => onCapture("data:image/jpeg;base64,fake")}>Capture</button>
    </div>
  ),
}));

// Mock Supabase
jest.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    auth: {
      signInWithOAuth: jest.fn(),
    },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("OnboardingFlow", () => {

  it("renders auth screen by default", () => {
    render(
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );

    expect(screen.getByTestId("auth-screen")).toBeInTheDocument();
  });

  it("advances to camera permission screen after auth", async () => {
    render(
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );

    const signInButton = screen.getByText("Sign In");
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("camera-permission-screen")).toBeInTheDocument();
    });
  });

  it("advances to selfie capture screen after camera permission granted", async () => {
    render(
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );

    // Complete auth
    const signInButton = screen.getByText("Sign In");
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("camera-permission-screen")).toBeInTheDocument();
    });

    // Grant permission
    const grantButton = screen.getByText("Grant Permission");
    grantButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("selfie-capture-screen")).toBeInTheDocument();
    });
  });

  it("shows error when camera permission is denied", async () => {
    render(
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );

    // Complete auth
    const signInButton = screen.getByText("Sign In");
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("camera-permission-screen")).toBeInTheDocument();
    });

    // Deny permission
    const denyButton = screen.getByText("Deny Permission");
    denyButton.click();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Camera permission is required/i)).toBeInTheDocument();
    });
  });

  it("advances to analysis screen after selfie capture", async () => {
    render(
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );

    // Complete auth
    const signInButton = screen.getByText("Sign In");
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("camera-permission-screen")).toBeInTheDocument();
    });

    // Grant permission
    const grantButton = screen.getByText("Grant Permission");
    grantButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("selfie-capture-screen")).toBeInTheDocument();
    });

    // Capture selfie
    const captureButton = screen.getByText("Capture");
    captureButton.click();

    await waitFor(() => {
      expect(screen.getByText(/Analyzing Your Appearance/i)).toBeInTheDocument();
    });
  });

  it("displays error with retry button", async () => {
    render(
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );

    // Complete auth
    const signInButton = screen.getByText("Sign In");
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("camera-permission-screen")).toBeInTheDocument();
    });

    // Deny permission to trigger error
    const denyButton = screen.getByText("Deny Permission");
    denyButton.click();

    await waitFor(() => {
      const errorAlert = screen.getByRole("alert");
      expect(errorAlert).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("can dismiss error message", async () => {
    render(
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );

    // Complete auth
    const signInButton = screen.getByText("Sign In");
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("camera-permission-screen")).toBeInTheDocument();
    });

    // Deny permission to trigger error
    const denyButton = screen.getByText("Deny Permission");
    denyButton.click();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Dismiss error
    const dismissButton = screen.getByLabelText("Dismiss error");
    dismissButton.click();

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("renders placeholder screens for incomplete steps", async () => {
    render(
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    );

    // Navigate through to analysis screen
    const signInButton = screen.getByText("Sign In");
    signInButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("camera-permission-screen")).toBeInTheDocument();
    });

    const grantButton = screen.getByText("Grant Permission");
    grantButton.click();

    await waitFor(() => {
      expect(screen.getByTestId("selfie-capture-screen")).toBeInTheDocument();
    });

    const captureButton = screen.getByText("Capture");
    captureButton.click();

    await waitFor(() => {
      // Should show placeholder ScanProgressScreen
      expect(screen.getByText(/Analyzing Your Appearance/i)).toBeInTheDocument();
    });
  });
});
