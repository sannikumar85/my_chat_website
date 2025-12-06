import React, { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import useLayoutStore from "../store/layoutStore";
import useThemeStore from "../store/themeStore";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import ChatWindow from "../pages/chatSection/ChatWindow";

const Layout = ({
  children,
  isThemeDialogOpen,
  toggleThemeDialog,
  isStatusPreviewOpen,
  statusPreviewContent,
}) => {
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );
  // const setActiveTab = useLayoutStore((state) => state.setActiveTab);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const {theme,setTheme} = useThemeStore();


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      className={`min-h-screen h-screen ${
        theme === "dark" ? "bg-[#111b21] text-white" : "bg-gray-100 text-black"
      } flex relative overflow-hidden`}
    >
      {!isMobile && <Sidebar />}
      <div className={`flex-1 flex ${isMobile ? "flex-col" : ""} h-full overflow-hidden`}>
        <AnimatePresence initial={false}>
          {/* Chat List - Always show on desktop, conditional on mobile */}
          {(!selectedContact || !isMobile) && (
            <motion.div
              key="chatlist"
              initial={{ x: isMobile ? "-100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: isMobile ? "-100%" : 0 }}
              transition={{ type: "tween" }}
              className={`${isMobile ? "w-full h-full pb-16" : "w-2/5"} h-full flex flex-col overflow-hidden`}
            >
              <div className="h-full overflow-hidden">
                {children}
              </div>
            </motion.div>
          )}

          {/* Chat Window - Show when contact selected */}
          {selectedContact && (
            <motion.div
              key="chatWindow"
              initial={{ x: isMobile ? "100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: isMobile ? "100%" : 0 }}
              transition={{ type: "tween" }}
              className={`${isMobile ? "w-full" : "flex-1"} h-full flex flex-col overflow-hidden`}
            >
              <ChatWindow
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
                isMobile={isMobile}
              />
            </motion.div>
          )}

          {/* Default welcome screen on desktop when no contact selected */}
          {!selectedContact && !isMobile && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "tween" }}
              className="flex-1 h-full"
            >
              <div className={`h-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-[#0b141a] text-gray-400' : 'bg-gray-50 text-gray-500'
              }`}>
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-64 h-64 mx-auto mb-4 opacity-20">
                      <svg viewBox="0 0 303 172" className="w-full h-full">
                        <path fill="currentColor" d="M231.7 10.9c-16.6 0-27.8 11.2-27.8 27.8v55.7c0 16.6 11.2 27.8 27.8 27.8h55.7c16.6 0 27.8-11.2 27.8-27.8V38.7c0-16.6-11.2-27.8-27.8-27.8h-55.7z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-light mb-2">SG Consultancy Chat</h3>
                  <p className="text-sm">Select a contact to start chatting</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isMobile && <Sidebar />}
      {isThemeDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${theme === "dark" ? "bg-[#202c33] text-white " : "bg-white text-black"} p-6 rounded-lg shadow-lg max-w-sm w-full`}>
            <h2 className="text-2xl font-semibold mb-4">Select Theme</h2>
            <div className="space-y-4 ">
              <label className="flex items-center space-x-3 cursor-pointer" >
                <input 
                type="radio" 
                
                value="light" 
                checked={theme === "light"}
                 onChange={() => setTheme("light")}
                 className="form-radio text-blue-600"
                 />
                <span>Light </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer" >
                <input 
                type="radio" 
                
                value="dark" 
                checked={theme === "dark"}
                 onChange={() => setTheme("dark")}
                 className="form-radio text-blue-600"
                 />
                <span>Dark </span>
              </label>
              
              <div/>
              <button
                onClick={toggleThemeDialog}
                className="mt-6 w-full  py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ststus preview */}

      {isStatusPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {statusPreviewContent}
      </div>
    )}
    </div>
  )
};

export default Layout;
