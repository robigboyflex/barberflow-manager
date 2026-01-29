import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QRCodeGeneratorProps {
  shopId: string;
  shopName: string;
}

export default function QRCodeGenerator({ shopId, shopName }: QRCodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const bookingUrl = `${window.location.origin}/book/${shopId}`;

  const handleDownload = () => {
    const svg = document.getElementById("shop-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx?.drawImage(img, 0, 0, 300, 300);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${shopName.replace(/\s+/g, "-")}-booking-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="w-4 h-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Booking QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              id="shop-qr-code"
              value={bookingUrl}
              size={200}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code to book an appointment at <strong>{shopName}</strong>
          </p>
          <p className="text-xs text-muted-foreground break-all text-center">
            {bookingUrl}
          </p>
          <Button onClick={handleDownload} className="gap-2 w-full">
            <Download className="w-4 h-4" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
