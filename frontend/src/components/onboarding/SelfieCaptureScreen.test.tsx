import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SelfieCaptureScreen } from "./SelfieCaptureScreen";

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();

// Mock HTMLVideoElement properties
const mockVideoElement = {
  videoWidth: 1280,
  videoHeight: 720,
  srcObject: null,
};

// Mock HTMLCanvasElement
const mockCanvas = document.createElement("canvas");
const mockContext = {
  drawImage: jest.fn(),
};
mockCanvas.getContext = jest.fn(() => mockContext);

beforeEach(() => {
  // Reset mocks
  mockGetUserMedia.mockReset();
  mockContext.drawImage.mockReset();

  // Setup navigator.mediaDevices mock
  Object.defineProperty(global.navigator, "mediaDevices", {
    writable: true,
    value: {
      getUserMedia: mockGetUserMedia,
    },
  });

  // Mock HTMLVideoElement
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
    get: () => mockVideoElement.videoWidth,
  });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
    get: () => mockVideoElement.videoHeight,
  });

  // Mock HTMLCanvasElement.toDataURL
  HTMLCanvasElement.prototype.toDataURL = jest.fn(
    () => "data:image/jpeg;base64,mockBase64String"
  );
});

describe("SelfieCaptureScreen", () => {
  it("renders the camera feed with glassmorphic card", async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Position Your Face")).toBeInTheDocument();
      expect(
        screen.getByText(/Center your face in the frame/)
      ).toBeInTheDocument();
      expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
    });
  });

  it("initializes camera on mount", async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: "user",
        },
      });
    });
  });

  it("captures selfie when Start Initial Scan button is clicked", async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
    });

    const captureButton = screen.getByText("Start Initial Scan");
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText("How does this look?")).toBeInTheDocument();
      expect(screen.getByText("Retake")).toBeInTheDocument();
      expect(screen.getByText("Use This")).toBeInTheDocument();
    });
  });

  it("calls onCapture with base64 image when Use This is clicked", async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
    });

    // Capture selfie
    const captureButton = screen.getByText("Start Initial Scan");
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText("Use This")).toBeInTheDocument();
    });

    // Use the captured image
    const useButton = screen.getByText("Use This");
    fireEvent.click(useButton);

    expect(onCapture).toHaveBeenCalledWith("data:image/jpeg;base64,mockBase64String");
  });

  it("calls onRecapture and resets to ready state when Retake is clicked", async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
    });

    // Capture selfie
    const captureButton = screen.getByText("Start Initial Scan");
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText("Retake")).toBeInTheDocument();
    });

    // Retake
    const retakeButton = screen.getByText("Retake");
    fireEvent.click(retakeButton);

    expect(onRecapture).toHaveBeenCalled();
    expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
  });

  it("displays error when camera access fails", async () => {
    const notAllowedError = new Error("Permission denied");
    (notAllowedError as any).name = "NotAllowedError";
    mockGetUserMedia.mockRejectedValue(notAllowedError);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Camera Error")).toBeInTheDocument();
      expect(
        screen.getByText(/Camera access was denied/)
      ).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("displays error when camera resolution is too low", async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    // Set video dimensions below minimum
    mockVideoElement.videoWidth = 320;
    mockVideoElement.videoHeight = 240;

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
    });

    const captureButton = screen.getByText("Start Initial Scan");
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText("Camera Error")).toBeInTheDocument();
      expect(
        screen.getByText(/Camera resolution too low/)
      ).toBeInTheDocument();
    });

    // Reset video dimensions
    mockVideoElement.videoWidth = 1280;
    mockVideoElement.videoHeight = 720;
  });

  it("displays privacy notice in ready state", async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Your images are processed securely/)
      ).toBeInTheDocument();
    });
  });

  it("stops camera stream when component unmounts", async () => {
    const mockStop = jest.fn();
    const mockStream = {
      getTracks: () => [{ stop: mockStop }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    const { unmount } = render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    unmount();

    expect(mockStop).toHaveBeenCalled();
  });

  it("stops camera stream when Use This is clicked", async () => {
    const mockStop = jest.fn();
    const mockStream = {
      getTracks: () => [{ stop: mockStop }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
    });

    // Capture selfie
    const captureButton = screen.getByText("Start Initial Scan");
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText("Use This")).toBeInTheDocument();
    });

    // Use the captured image
    const useButton = screen.getByText("Use This");
    fireEvent.click(useButton);

    expect(mockStop).toHaveBeenCalled();
  });

  it("handles NotFoundError (no camera detected)", async () => {
    const notFoundError = new Error("No camera found");
    (notFoundError as any).name = "NotFoundError";
    mockGetUserMedia.mockRejectedValue(notFoundError);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No camera detected/)
      ).toBeInTheDocument();
    });
  });

  it("handles NotReadableError (camera in use)", async () => {
    const notReadableError = new Error("Camera in use");
    (notReadableError as any).name = "NotReadableError";
    mockGetUserMedia.mockRejectedValue(notReadableError);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Your camera is being used by another application/)
      ).toBeInTheDocument();
    });
  });

  it("retries camera initialization when Try Again is clicked", async () => {
    const notAllowedError = new Error("Permission denied");
    (notAllowedError as any).name = "NotAllowedError";
    mockGetUserMedia.mockRejectedValueOnce(notAllowedError);

    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Try Again");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
    });
  });

  it("displays preview image after capture", async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const onCapture = jest.fn();
    const onRecapture = jest.fn();

    render(
      <SelfieCaptureScreen onCapture={onCapture} onRecapture={onRecapture} />
    );

    await waitFor(() => {
      expect(screen.getByText("Start Initial Scan")).toBeInTheDocument();
    });

    const captureButton = screen.getByText("Start Initial Scan");
    fireEvent.click(captureButton);

    await waitFor(() => {
      const previewImage = screen.getByAltText("Captured selfie");
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute(
        "src",
        "data:image/jpeg;base64,mockBase64String"
      );
    });
  });
});
