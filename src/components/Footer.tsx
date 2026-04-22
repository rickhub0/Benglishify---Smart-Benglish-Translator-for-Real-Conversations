import { Link } from "react-router-dom";
import { Info, Smartphone, Github, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto py-8 md:py-12 px-4 md:px-6 border-t border-gray-100 dark:border-[#2E2E2E] bg-white dark:bg-[#1E1E1E] transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-base font-bold text-black dark:text-white mb-1">Benglishify.in</h2>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] md:text-xs">© 2026 Benglishify.in for the Bengali community.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <Link 
            to="/install" 
            className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Smartphone className="w-5 h-5" />
            <span>Install App</span>
          </Link>
          <Link 
            to="/about" 
            className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Info className="w-5 h-5" />
            <span>About</span>
          </Link>
          <a 
            href="https://github.com/rickhub0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Github className="w-5 h-5" />
            <span>GitHub</span>
          </a>
          <a 
            href="https://www.instagram.com/clickors/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 dark:text-gray-500 hover:text-pink-600 dark:hover:text-pink-400 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Instagram className="w-5 h-5" />
            <span>Instagram</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
