import React from 'react';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  onNavigate?: (section: string) => void;
  onSwitchPortal?: (type: 'USER' | 'CORPORATION' | 'CONTRACTOR' | 'WARD') => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, onNavigate, onSwitchPortal, children }) => {
  const { t } = useLanguage();
  const [showPortalMenu, setShowPortalMenu] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPortalMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (section: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(section);
    } else {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  const handleFontSize = (action: 'increase' | 'decrease' | 'reset') => {
    const html = document.documentElement;
    const currentSize = parseFloat(window.getComputedStyle(html).fontSize);

    if (action === 'reset') {
      html.style.fontSize = '16px';
      return;
    }

    const newSize = action === 'increase' ? currentSize + 1 : currentSize - 1;
    if (newSize >= 12 && newSize <= 24) {
      html.style.fontSize = `${newSize}px`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] text-gray-800">

      {/* Top Strip - Standard Govt Feature */}
      <div className="bg-[#1B1D21] border-b border-gray-700 py-1.5 px-4 text-[11px] font-medium text-gray-300">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex space-x-6">
            <span className="hover:text-white cursor-default">{t.govtName}</span>
            <span className="hover:text-white cursor-default">{t.corpName}</span>
          </div>
          <div className="flex space-x-4">
            <a href="#main-content" className="hover:text-white transition-colors">{t.skipContent}</a>
            <span>|</span>
            <a href="#main-content" className="hover:text-white transition-colors">{t.screenReader}</a>
            <span>|</span>
            <div className="flex items-center space-x-1">
              <button onClick={() => handleFontSize('decrease')} className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center text-[9px] hover:bg-white hover:text-black transition-colors" aria-label="Decrease font size">A-</button>
              <button onClick={() => handleFontSize('reset')} className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center text-[9px] hover:bg-white hover:text-black transition-colors" aria-label="Reset font size">A</button>
              <button onClick={() => handleFontSize('increase')} className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center text-[9px] hover:bg-white hover:text-black transition-colors" aria-label="Increase font size">A+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex justify-between items-center bg-white">

          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            {/* SMC Logo */}
            <div className="flex-shrink-0">
              <img
                src="/assets/logo.png"
                alt="Solapur Municipal Corporation Emblem"
                className="h-20 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            <div className="flex flex-col justify-center">
              <h2 className="text-xl font-bold text-[#EA580C] leading-tight">सोलापूर महानगरपालिका</h2>
              <h1 className="text-xl md:text-2xl font-serif font-bold text-[#1E3A8A] leading-tight uppercase tracking-tight">SOLAPUR MUNICIPAL CORPORATION</h1>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">{t.govtName}</p>
            </div>
          </div>

          {/* Right Emblem */}
          <div className="hidden md:flex items-center space-x-4">
             <div className="text-right hidden lg:block">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">State Govt</p>
             </div>
             <img 
               src="/assets/maharashtra_logo.jpg" 
               alt="Maharashtra Government Emblem" 
               className="h-16 w-auto opacity-90"
             />
          </div>
        </div>

        {/* Blue Navigation Strip */}
        <div className="bg-[#1C5D9F] text-white shadow-md">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center h-12 space-x-1 md:space-x-8 text-[13px] font-bold tracking-wide uppercase">
                 <a href="#home" onClick={(e) => handleNavClick('home', e)} className="hover:bg-blue-700 px-4 py-3 transition-colors whitespace-nowrap">Home</a>
                 <a href="#about" onClick={(e) => handleNavClick('about', e)} className="hover:bg-blue-700 px-4 py-3 transition-colors whitespace-nowrap">{t.aboutUs}</a>
                 <a href="#services" onClick={(e) => handleNavClick('services', e)} className="hover:bg-blue-700 px-4 py-3 transition-colors whitespace-nowrap">{t.servicesTitle}</a>
                 <a href="#contact" onClick={(e) => handleNavClick('contact', e)} className="hover:bg-blue-700 px-4 py-3 transition-colors whitespace-nowrap">{t.contactUs}</a>
                 
                 <div className="flex-grow"></div>
                 
                 {/* Login/User Section in Nav Bar */}
                 {user ? (
                    <div className="flex items-center cursor-pointer hover:bg-blue-700 px-4 py-3" onClick={() => setShowPortalMenu(!showPortalMenu)}>
                       <i className="fas fa-user-circle mr-2 text-lg"></i>
                       <span>{user.username}</span>
                    </div>
                 ) : (
                    <div className="hidden md:block italic text-blue-200 normal-case font-medium text-xs">
                       {t.officialPortal}
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Dropdown Menu (Moved relative position handled by fixed/absolute but logic remains in App or here) */}
        {user && showPortalMenu && (
             <div className="absolute right-4 top-36 w-56 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-fade-in z-50">
               <div className="p-2 border-b border-gray-100 bg-gray-50">
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">Switch Portal</p>
               </div>
               <div className="p-1">
                 {[
                   { type: 'USER', label: 'Citizen Portal', icon: 'fa-user' },
                   { type: 'CORPORATION', label: 'Department Portal', icon: 'fa-building' },
                   { type: 'WARD', label: 'Ward Portal', icon: 'fa-map-marked-alt' },
                   { type: 'CONTRACTOR', label: 'Contractor Portal', icon: 'fa-hard-hat' }
                 ].map((portal) => (
                   <button
                     key={portal.type}
                     onClick={() => {
                       if (onSwitchPortal) onSwitchPortal(portal.type as any);
                       setShowPortalMenu(false);
                     }}
                     className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded flex items-center transition-colors"
                   >
                     <i className={`fas ${portal.icon} w-5 text-center mr-2 text-gray-400`}></i>
                     {portal.label}
                   </button>
                 ))}
               </div>
               <div className="border-t border-gray-100 p-1">
                 <button
                   onClick={onLogout}
                   className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded flex items-center transition-colors"
                 >
                   <i className="fas fa-power-off w-5 text-center mr-2"></i>
                   Logout
                 </button>
               </div>
             </div>
           )}

      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-grow w-full">
        {children}
      </main>

      {/* Footer - Standard Govt Format */}
      <footer id="contact" className="bg-[#1B1D21] text-white pt-10 pb-6 border-t-4 border-[#15803D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-sm">
            <div>
              <h4 className="font-bold text-gray-300 uppercase mb-4 text-xs tracking-wider">{t.infoRelated}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">{t.roadSafety}</a></li>
                <li><a href="#" className="hover:text-white">{t.tollInfo}</a></li>
                <li><a href="#" className="hover:text-white">{t.highwayProjects}</a></li>
                <li><a href="#" className="hover:text-white">{t.notifications}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-300 uppercase mb-4 text-xs tracking-wider">{t.aboutCorp}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">{t.aboutUs}</a></li>
                <li><a href="#" className="hover:text-white">{t.ourMission}</a></li>
                <li><a href="#" className="hover:text-white">{t.actsRules}</a></li>
                <li><a href="#" className="hover:text-white">{t.mediaCoverage}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-300 uppercase mb-4 text-xs tracking-wider">{t.helpSupport}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">{t.contactUs}</a></li>
                <li><a href="#" className="hover:text-white">{t.feedback}</a></li>
                <li><a href="#" className="hover:text-white">{t.grievances}</a></li>
                <li><a href="#" className="hover:text-white">{t.sitemap}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-300 uppercase mb-4 text-xs tracking-wider">{t.contactAddr}</h4>
              <p className="text-gray-400 leading-relaxed">
                Indrabhuvan,<br />
                Railway Lines,<br />
                Solapur - 413001
              </p>
              <div className="mt-4 flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-twitter"></i></a>
                <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-facebook"></i></a>
                <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-youtube"></i></a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <div className="mb-2 md:mb-0">
              {t.managedBy} <strong>{t.corpName}</strong>
            </div>
            <div>
              &copy; {new Date().getFullYear()} {t.rightsReserved} {t.designedBy}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
