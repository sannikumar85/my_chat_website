import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUser, 
  FaBell, 
  FaShieldAlt, 
  FaDatabase, 
  FaQuestionCircle, 
  FaChevronRight,
  FaMoon,
  FaSun,
  FaGlobe,
  FaKey,
  FaUserFriends,
  FaDownload,
  FaTrash,
  FaSignOutAlt,
  FaEdit,
  FaTimes
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/useUserStore';
import useLoginStore from '../../store/useLoginStore';
import { logoutUser } from '../../services/user.services';
import socketService from '../../services/socket.service';
import { toast } from 'react-toastify';

const Setting = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useUserStore();
  const { resetLoginState } = useLoginStore();
  const navigate = useNavigate();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showAboutEdit, setShowAboutEdit] = useState(false);
  const [editedName, setEditedName] = useState(user?.username || '');
  const [editedAbout, setEditedAbout] = useState(user?.about || 'Hey there! I am using SG Consultancy Chat');
  const [notifications, setNotifications] = useState({
    messages: true,
    groups: true,
    calls: true,
    sound: true,
    vibration: true
  });
  const [privacy, setPrivacy] = useState({
    lastSeen: 'everyone',
    profilePhoto: 'everyone',
    about: 'everyone',
    status: 'contacts',
    readReceipts: true,
    groups: 'everyone'
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Disconnect socket connections
      socketService.disconnect();
      
      // Call backend logout endpoint
      await logoutUser();
      
      // Clear all local data
      logout(); // Clear user store
      resetLoginState(); // Reset login state
      
      // Clear all localStorage data
      localStorage.clear();
      sessionStorage.clear();
      
      // Navigate to login page
      navigate('/user-login');
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if backend fails, clear local data
      socketService.disconnect();
      logout();
      resetLoginState();
      localStorage.clear();
      sessionStorage.clear();
      navigate('/user-login');
      
      toast.success('Logged out successfully');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
    toast.success(`Switched to ${theme === 'light' ? 'dark' : 'light'} mode`);
  };

  const handleSaveProfile = () => {
    // TODO: Implement profile update API call
    toast.success('Profile updated successfully');
    setShowProfileEdit(false);
  };

  const handleSaveAbout = () => {
    // TODO: Implement about update API call
    toast.success('About updated successfully');
    setShowAboutEdit(false);
  };

  const SettingItem = ({ icon, title, subtitle, onClick, rightElement, danger = false }) => (
    <motion.div
      whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
      className={`flex items-center justify-between p-4 cursor-pointer border-b ${
        theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
      } ${danger ? 'hover:bg-red-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full ${
          danger 
            ? 'bg-red-100 text-red-600' 
            : theme === 'dark' 
              ? 'bg-gray-700 text-green-400' 
              : 'bg-green-100 text-green-600'
        }`}>
          {icon}
        </div>
        <div>
          <p className={`font-medium ${danger ? 'text-red-600' : ''}`}>{title}</p>
          {subtitle && (
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {rightElement || <FaChevronRight className={`text-sm ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
      }`} />}
    </motion.div>
  );

  const ToggleSwitch = ({ enabled, onToggle }) => (
    <motion.div
      className={`w-12 h-6 rounded-full p-1 cursor-pointer ${
        enabled ? 'bg-green-500' : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
      }`}
      onClick={onToggle}
    >
      <motion.div
        className={`w-4 h-4 rounded-full bg-white shadow-md`}
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.div>
  );

  return (
    <div className={`h-full overflow-y-auto ${
      theme === 'dark' ? 'bg-[#111b21] text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b sticky top-0 z-10 ${
        theme === 'dark' ? 'border-gray-600 bg-[#202c33]' : 'border-gray-200 bg-white'
      }`}>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      {/* Profile Section */}
      <div className={`p-4 border-b ${
        theme === 'dark' ? 'border-gray-600 bg-[#202c33]' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-600 text-xl font-medium">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold">{user?.username}</h3>
              <button
                onClick={() => setShowProfileEdit(true)}
                className={`p-1 rounded-full hover:bg-opacity-10 ${
                  theme === 'dark' ? 'text-gray-400 hover:bg-white' : 'text-gray-500 hover:bg-gray-500'
                }`}
              >
                <FaEdit />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {user?.about || 'Hey there! I am using SG Consultancy Chat'}
              </p>
              <button
                onClick={() => setShowAboutEdit(true)}
                className={`p-1 rounded-full hover:bg-opacity-10 ${
                  theme === 'dark' ? 'text-gray-400 hover:bg-white' : 'text-gray-500 hover:bg-gray-500'
                }`}
              >
                <FaEdit />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4 pb-20">
        {/* Theme Settings */}
        <div className={`${theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'}`}>
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <h2 className="font-semibold text-green-500">Appearance</h2>
          </div>
          <SettingItem
            icon={theme === 'dark' ? <FaSun /> : <FaMoon />}
            title="Theme"
            subtitle={theme === 'dark' ? 'Dark mode' : 'Light mode'}
            onClick={handleThemeToggle}
            rightElement={
              <ToggleSwitch 
                enabled={theme === 'dark'} 
                onToggle={handleThemeToggle}
              />
            }
          />
        </div>

        {/* Account Settings */}
        <div className={`${theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'}`}>
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <h2 className="font-semibold text-green-500">Account</h2>
          </div>
          <SettingItem
            icon={<FaKey />}
            title="Privacy"
            subtitle="Block contacts, disappearing messages"
            onClick={() => toast.info('Privacy settings coming soon')}
          />
          <SettingItem
            icon={<FaShieldAlt />}
            title="Security"
            subtitle="Change password, two-step verification"
            onClick={() => toast.info('Security settings coming soon')}
          />
          <SettingItem
            icon={<FaUserFriends />}
            title="Blocked Contacts"
            subtitle="0 contacts"
            onClick={() => toast.info('Blocked contacts coming soon')}
          />
        </div>

        {/* Notifications */}
        <div className={`${theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'}`}>
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <h2 className="font-semibold text-green-500">Notifications</h2>
          </div>
          <SettingItem
            icon={<FaBell />}
            title="Messages"
            subtitle="Notification tone, vibrate"
            rightElement={
              <ToggleSwitch 
                enabled={notifications.messages} 
                onToggle={() => setNotifications(prev => ({ ...prev, messages: !prev.messages }))}
              />
            }
          />
          <SettingItem
            icon={<FaBell />}
            title="Groups"
            subtitle="Notification tone, vibrate"
            rightElement={
              <ToggleSwitch 
                enabled={notifications.groups} 
                onToggle={() => setNotifications(prev => ({ ...prev, groups: !prev.groups }))}
              />
            }
          />
          <SettingItem
            icon={<FaBell />}
            title="Calls"
            subtitle="Ringtone, vibrate"
            rightElement={
              <ToggleSwitch 
                enabled={notifications.calls} 
                onToggle={() => setNotifications(prev => ({ ...prev, calls: !prev.calls }))}
              />
            }
          />
        </div>

        {/* Storage */}
        <div className={`${theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'}`}>
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <h2 className="font-semibold text-green-500">Storage</h2>
          </div>
          <SettingItem
            icon={<FaDatabase />}
            title="Storage and Data"
            subtitle="Network usage, auto-download"
            onClick={() => toast.info('Storage settings coming soon')}
          />
          <SettingItem
            icon={<FaDownload />}
            title="Chat Backup"
            subtitle="Back up to cloud"
            onClick={() => toast.info('Backup settings coming soon')}
          />
        </div>

        {/* General */}
        <div className={`${theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'}`}>
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <h2 className="font-semibold text-green-500">General</h2>
          </div>
          <SettingItem
            icon={<FaGlobe />}
            title="Language"
            subtitle="English"
            onClick={() => toast.info('Language settings coming soon')}
          />
          <SettingItem
            icon={<FaQuestionCircle />}
            title="Help"
            subtitle="Help center, contact us, terms and privacy policy"
            onClick={() => toast.info('Help center coming soon')}
          />
        </div>

        {/* Danger Zone */}
        <div className={`${theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'}`}>
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
            <h2 className="font-semibold text-red-500">Account Actions</h2>
          </div>
          <SettingItem
            icon={<FaTrash />}
            title="Delete My Account"
            subtitle="Delete your account and all data"
            onClick={() => toast.error('Account deletion coming soon')}
            danger={true}
          />
          <SettingItem
            icon={<FaSignOutAlt />}
            title="Logout"
            subtitle="Sign out of your account"
            onClick={handleLogout}
            danger={true}
          />
        </div>
      </div>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowProfileEdit(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-lg shadow-lg ${
                theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit Name</h3>
                  <button
                    onClick={() => setShowProfileEdit(false)}
                    className={`p-2 rounded-full ${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'dark'
                        ? 'bg-[#2a3942] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowProfileEdit(false)}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Edit Modal */}
      <AnimatePresence>
        {showAboutEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAboutEdit(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-lg shadow-lg ${
                theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit About</h3>
                  <button
                    onClick={() => setShowAboutEdit(false)}
                    className={`p-2 rounded-full ${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">About</label>
                  <textarea
                    value={editedAbout}
                    onChange={(e) => setEditedAbout(e.target.value)}
                    rows={3}
                    maxLength={139}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${
                      theme === 'dark'
                        ? 'bg-[#2a3942] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter your about"
                  />
                  <p className={`text-sm text-right mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {editedAbout.length}/139
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowAboutEdit(false)}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAbout}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-lg shadow-lg ${
                theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                    <FaSignOutAlt className="text-red-600 text-xl" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Logout Confirmation
                    </h3>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Are you sure you want to logout?
                    </p>
                  </div>
                </div>
                
                <div className={`mb-4 p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-[#2a3942]' : 'bg-gray-50'
                }`}>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    You will be signed out from this device and redirected to the login page. 
                    You'll need to verify your phone number again to sign back in.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className={`flex-1 px-4 py-2 rounded-lg border font-medium ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    disabled={isLoggingOut}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Logging out...
                      </>
                    ) : (
                      'Yes, Logout'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Setting;
