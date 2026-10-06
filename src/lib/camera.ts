export type CameraProbeResult =
  | { status: 'available' }
  | { status: 'unavailable'; message: string }

export async function probeCameraAvailability(): Promise<CameraProbeResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      status: 'unavailable',
      message: 'No camera on this device.',
    }
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const hasVideoInput = devices.some((device) => device.kind === 'videoinput')

    if (!hasVideoInput) {
      return {
        status: 'unavailable',
        message: 'No camera connected.',
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    })
    stream.getTracks().forEach((track) => track.stop())

    return { status: 'available' }
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      return {
        status: 'unavailable',
        message:
          'Camera permission denied. Find your name below or allow camera access in browser settings.',
      }
    }

    return {
      status: 'unavailable',
      message:
        error instanceof Error
          ? error.message
          : 'Unable to access the camera.',
    }
  }
}
