import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, LogIn, LogOut, Loader2, ArrowLeft, History } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../lib/utils";
const logo = "https://benglishify.in/logo.png";

export default function Header() {
  const { user, isLoading, login, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <header className="bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-[#2E2E2E] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-2 md:gap-3">
        {!isHomePage && (
          <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-full transition-colors mr-1">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
        )}
        <Link to="/" className="flex items-center gap-1.5 md:gap-2">
          <img src={logo} alt="Benglishify Logo" width="28" className="w-6 h-6 md:w-7 md:h-7 object-contain" referrerPolicy="no-referrer" />
          <h1 className="text-base md:text-lg font-bold tracking-tight text-black dark:text-white">
            Benglishify
          </h1>
        </Link>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <button 
          onClick={toggleDarkMode}
          className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-[#2E2E2E] transition-colors"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="hidden md:block h-6 w-[1px] bg-gray-200 dark:bg-[#2E2E2E] mx-1" />

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : user ? (
          <div className="flex items-center gap-1 md:gap-2">
            <img src={user.photoURL || ""} alt={user.displayName || ""} className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
            <button 
              onClick={logout}
              className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={login}
            className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full border border-gray-200 dark:border-[#2E2E2E] text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden xs:inline">Sign In</span>
          </button>
        )}

        {isHomePage && (
          <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors">
            <History className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}
