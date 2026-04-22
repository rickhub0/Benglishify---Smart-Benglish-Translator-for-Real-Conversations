import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#121212] text-[#202124] dark:text-gray-100 font-sans flex flex-col transition-colors duration-300">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
