import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FaArrowLeft, 
  FaCamera, 
  FaEdit, 
  FaCheck, 
  FaTimes,
  FaUserCircle,
  FaInfo
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useThemeStore from '../store/themeStore';
import useUserStore from '../store/useUserStore';
import { updateUserProfile } from '../services/user.services';

const UserDetails = () => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { user, setUser } = useUserStore();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [editedName, setEditedName] = useState(user?.username || '');
  const [editedAbout, setEditedAbout] = useState(user?.about || 'Hey there! I am using SG Consultancy Chat.');
  const [profileImage, setProfileImage] = useState(user?.profilePicture || '');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('media', file);
      
      const response = await updateUserProfile(formData);
      
      if (response.status === 'success') {
        const updatedUser = response.data;
        setUser(updatedUser);
        setProfileImage(updatedUser.profilePicture);
        toast.success('Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNameSave = async () => {
    if (!editedName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('username', editedName.trim());
      
      const response = await updateUserProfile(formData);
      
      if (response.status === 'success') {
        const updatedUser = response.data;
        setUser(updatedUser);
        setIsEditingName(false);
        toast.success('Name updated successfully!');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    }
  };

  const handleAboutSave = async () => {
    try {
      const formData = new FormData();
      formData.append('about', editedAbout.trim() || 'Hey there! I am using SG Consultancy Chat.');
      
      const response = await updateUserProfile(formData);
      
      if (response.status === 'success') {
        const updatedUser = response.data;
        setUser(updatedUser);
        setIsEditingAbout(false);
        toast.success('About updated successfully!');
      }
    } catch (error) {
      console.error('Error updating about:', error);
      toast.error('Failed to update about');
    }
  };

  const handleNameCancel = () => {
    setEditedName(user?.username || '');
    setIsEditingName(false);
  };

  const handleAboutCancel = () => {
    setEditedAbout(user?.about || 'Hey there! I am using SG Consultancy Chat.');
    setIsEditingAbout(false);
  };

  return (
    <div className={`h-screen ${
      theme === 'dark' ? 'bg-[#111b21] text-white' : 'bg-white text-gray-900'
    }`}>
      {/* Header */}
      <div className={`flex items-center p-4 ${
        theme === 'dark' ? 'bg-[#202c33]' : 'bg-gray-50'
      } border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
        <button
          onClick={() => navigate('/')}
          className={`p-2 rounded-full hover:bg-opacity-10 mr-4 ${
            theme === 'dark' 
              ? 'text-gray-300 hover:bg-white' 
              : 'text-gray-600 hover:bg-gray-600'
          }`}
        >
          <FaArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold">Profile</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* Profile Picture Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center py-8"
        >
          <div className="relative">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-gray-300">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <FaUserCircle className="w-32 h-32 text-gray-400" />
                </div>
              )}
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`absolute bottom-2 right-2 p-3 rounded-full ${
                theme === 'dark' 
                  ? 'bg-gray-600 hover:bg-gray-700' 
                  : 'bg-gray-100 hover:bg-gray-200'
              } transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FaCamera className={`w-5 h-5 ${
                theme === 'dark' ? 'text-white' : 'text-gray-600'
              }`} />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          {isUploading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-sm mt-2 text-gray-500">Uploading...</p>
            </div>
          )}
        </motion.div>

        {/* User Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6 px-4"
        >
          {/* Name Section */}
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-[#202c33]' : 'bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-green-500">Name</label>
              {!isEditingName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className={`p-1 rounded ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaEdit className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {isEditingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    theme === 'dark'
                      ? 'bg-[#2a3942] text-white border border-gray-600'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                  placeholder="Enter your name"
                  maxLength={25}
                />
                <button
                  onClick={handleNameSave}
                  className="p-2 text-green-500 hover:bg-green-100 rounded-full"
                >
                  <FaCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNameCancel}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-full"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-lg">{user?.username || 'No name set'}</p>
            )}
          </div>

          {/* About Section */}
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-[#202c33]' : 'bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-green-500">About</label>
              {!isEditingAbout && (
                <button
                  onClick={() => setIsEditingAbout(true)}
                  className={`p-1 rounded ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaEdit className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {isEditingAbout ? (
              <div className="space-y-2">
                <textarea
                  value={editedAbout}
                  onChange={(e) => setEditedAbout(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${
                    theme === 'dark'
                      ? 'bg-[#2a3942] text-white border border-gray-600'
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                  placeholder="Add something about yourself..."
                  maxLength={139}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {editedAbout.length}/139
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAboutSave}
                      className="p-2 text-green-500 hover:bg-green-100 rounded-full"
                    >
                      <FaCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleAboutCancel}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-full"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                {user?.about || 'Hey there! I am using SG Consultancy Chat.'}
              </p>
            )}
          </div>

          {/* Contact Info Section */}
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-[#202c33]' : 'bg-gray-50'
          }`}>
            <label className="text-sm font-medium text-green-500 mb-2 block">
              Contact Info
            </label>
            <div className="space-y-3">
              {user?.phoneNumber && (
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                    <FaInfo className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-gray-500">
                      {user.phoneSuffix} {user.phoneNumber}
                    </p>
                  </div>
                </div>
              )}
              
              {user?.email && (
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                    <FaInfo className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserDetails;
