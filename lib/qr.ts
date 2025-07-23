import QRCode from 'qrcode';

export async function generateQR(text: string): Promise<string> {
  return await QRCode.toDataURL(text);
}
