import type { Metadata } from "next";
import { Cinzel, Raleway } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-display", weight: ["400", "700"] });
const raleway = Raleway({ subsets: ["latin"], variable: "--font-sans", weight: ["300", "400", "600", "700"] });

export const metadata: Metadata = {
  title: "Guided Big Game Hunts — Experience the Wild",
  description:
    "Book your guided elk, moose, and bear hunts in the heart of the Rocky Mountains. Professional outfitters, unforgettable experiences.",
  openGraph: {
    title: "Guided Big Game Hunts — Experience the Wild",
    description:
      "Book your guided elk, moose, and bear hunts in the heart of the Rocky Mountains.",
    images: ["/frames/desktop/frame-075.webp"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${raleway.variable} bg-black font-sans antialiased`}>
        {children}
        <noscript>
          <div style={{ padding: "2rem", color: "white", backgroundColor: "black" }}>
            <h1>Guided Big Game Hunts</h1>
            <p>Every hunter carries a dream. The journey begins before first light.</p>
            <p>Patience is the weapon. Close the distance.</p>
            <p>Contact us to book your guided hunt.</p>
          </div>
        </noscript>
      </body>
    </html>
  );
}
