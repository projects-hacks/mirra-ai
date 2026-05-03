import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CameraPermissionScreen } from "./CameraPermissionScreen";

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
const mockQuery = jest.fn();

beforeEach(() => {
  // Reset mocks
  mockGetUserMedia.mockReset();
  mockQuery.mockReset();

  // Setup navigator.mediaDevices mock
  Object.defineProperty(global.navigator, "mediaDevices", {
    writable: true,
    value: {
      getUserMedia: mockGetUserMedia,
    },
  });

  // Setup navigator.permissions mock
  Object.defineProperty(global.navigator, "permissions", {
    writable: true,
    value: {
      query: mockQuery,
    },
  });

  // Setup navigator.userAgent for browser detection
  Object.defineProperty(global.navigator, "userAgent", {
    writable: true,
    value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
});

describe("CameraPermissionScreen", () => {
  it("renders the camera permission request UI", () => {
    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    expect(screen.getByText("Camera Access Required")).toBeInTheDocument();
    expect(
      screen.getByText(/Mirra needs camera access to analyze your appearance/)
    ).toBeInTheDocument();
  });

  it("shows enable camera button when permission is in prompt state", async () => {
    mockQuery.mockResolvedValue({
      state: "prompt",
      addEventListener: jest.fn(),
    });

    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Enable Camera")).toBeInTheDocument();
    });
  });

  it("calls onPermissionGranted when camera access is granted", async () => {
    mockQuery.mockResolvedValue({
      state: "prompt",
      addEventListener: jest.fn(),
    });

    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Enable Camera")).toBeInTheDocument();
    });

    const enableButton = screen.getByText("Enable Camera");
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: "user",
        },
      });
      expect(onPermissionGranted).toHaveBeenCalled();
    });
  });

  it("calls onPermissionDenied when camera access is denied", async () => {
    mockQuery.mockResolvedValue({
      state: "prompt",
      addEventListener: jest.fn(),
    });

    const notAllowedError = new Error("Permission denied");
    (notAllowedError as any).name = "NotAllowedError";
    mockGetUserMedia.mockRejectedValue(notAllowedError);

    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Enable Camera")).toBeInTheDocument();
    });

    const enableButton = screen.getByText("Enable Camera");
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(onPermissionDenied).toHaveBeenCalled();
      expect(
        screen.getByText(/Camera access was denied/)
      ).toBeInTheDocument();
    });
  });

  it("displays browser-specific instructions when permission is denied", async () => {
    mockQuery.mockResolvedValue({
      state: "denied",
      addEventListener: jest.fn(),
    });

    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/How to enable camera in Chrome:/)).toBeInTheDocument();
      expect(screen.getByText(/Click the camera icon in the address bar/)).toBeInTheDocument();
    });
  });

  it("shows retry button when permission is denied", async () => {
    mockQuery.mockResolvedValue({
      state: "prompt",
      addEventListener: jest.fn(),
    });

    const notAllowedError = new Error("Permission denied");
    (notAllowedError as any).name = "NotAllowedError";
    mockGetUserMedia.mockRejectedValue(notAllowedError);

    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Enable Camera")).toBeInTheDocument();
    });

    const enableButton = screen.getByText("Enable Camera");
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("handles NotFoundError (no camera detected)", async () => {
    mockQuery.mockResolvedValue({
      state: "prompt",
      addEventListener: jest.fn(),
    });

    const notFoundError = new Error("No camera found");
    (notFoundError as any).name = "NotFoundError";
    mockGetUserMedia.mockRejectedValue(notFoundError);

    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Enable Camera")).toBeInTheDocument();
    });

    const enableButton = screen.getByText("Enable Camera");
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(
        screen.getByText(/No camera detected/)
      ).toBeInTheDocument();
    });
  });

  it("handles NotReadableError (camera in use)", async () => {
    mockQuery.mockResolvedValue({
      state: "prompt",
      addEventListener: jest.fn(),
    });

    const notReadableError = new Error("Camera in use");
    (notReadableError as any).name = "NotReadableError";
    mockGetUserMedia.mockRejectedValue(notReadableError);

    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Enable Camera")).toBeInTheDocument();
    });

    const enableButton = screen.getByText("Enable Camera");
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Your camera is being used by another application/)
      ).toBeInTheDocument();
    });
  });

  it("displays privacy notice", () => {
    const onPermissionGranted = jest.fn();
    const onPermissionDenied = jest.fn();

    render(
      <CameraPermissionScreen
        onPermissionGranted={onPermissionGranted}
        onPermissionDenied={onPermissionDenied}
      />
    );

    expect(
      screen.getByText(/Your images are processed securely and never shared/)
    ).toBeInTheDocument();
  });
});
