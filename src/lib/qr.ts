import QRCode from 'qrcode'

/** ~1 inch square at 300 DPI for print */
export const LANYARD_QR_PRINT_PX = 300

export async function generateQrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: 'Q',
    width: LANYARD_QR_PRINT_PX,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}
