import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FaPlus, 
  FaCamera, 
  FaImage, 
  FaTimes, 
  FaEye, 
  FaTrash
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/useUserStore';
import useStatusStore from '../../store/useStatusStore';
import { 
  getStatuses, 
  createStatus, 
  createStatusWithFile, 
  viewStatus, 
  deleteStatus 
} from '../../services/status.service';
import socketService from '../../services/socket.service';
import { toast } from 'react-toastify';
import formatTimestamp from '../../utils/formateTime';

const Status = () => {
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    setStatuses,
    addStatus,
    updateStatus,
    removeStatus,
    currentViewingStatus,
    setCurrentViewingStatus,
    viewingUserIndex,
    setViewingUserIndex,
    getGroupedStatuses,
    loading,
    setLoading
  } = useStatusStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [statusContent, setStatusContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isProgressPaused, setIsProgressPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  const fileInputRef = useRef(null);
  const progressInterval = useRef(null);

  // Load statuses
  const loadStatuses = useCallback(async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      console.log('Loading statuses...');
      const response = await getStatuses();
      console.log('Status response:', response);
      
      if (response.status === 'success') {
        setStatuses(response.data || []);
        console.log('Statuses loaded:', response.data?.length || 0);
      } else {
        console.error('Failed to load statuses:', response.message);
      }
    } catch (error) {
      console.error('Error loading statuses:', error);
      toast.error('Failed to load statuses');
    } finally {
      setLoading(false);
    }
  }, [user?._id, setStatuses, setLoading]);

  const setupSocketListeners = useCallback(() => {
    // Listen for new status
    socketService.on('new_status', (status) => {
      addStatus(status);
      toast.info(`${status.user.username} posted a new status`);
    });

    // Listen for status viewed
    socketService.on('status viewd', (data) => {
      updateStatus(data.statusId, { viewers: data.viewers });
    });

    // Listen for status deleted
    socketService.on('status_deleted', (statusId) => {
      removeStatus(statusId);
      toast.info('A status was deleted');
    });
  }, [addStatus, updateStatus, removeStatus]);

  const cleanupSocketListeners = useCallback(() => {
    socketService.off('new_status');
    socketService.off('status viewd');
    socketService.off('status_deleted');
  }, []);

  // Load statuses on component mount
  useEffect(() => {
    loadStatuses();
    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [loadStatuses, setupSocketListeners, cleanupSocketListeners]);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB');
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images and videos are supported');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Create status
  const handleCreateStatus = async () => {
    if (!statusContent.trim() && !selectedFile) {
      toast.error('Please add content or select a file');
      return;
    }

    try {
      let response;
      
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (statusContent.trim()) {
          formData.append('content', statusContent.trim());
        }
        response = await createStatusWithFile(formData);
      } else {
        response = await createStatus({
          content: statusContent.trim(),
          contentType: 'text'
        });
      }

      if (response.status === 'success') {
        addStatus(response.data);
        toast.success('Status created successfully');
        setShowCreateModal(false);
        setStatusContent('');
        setSelectedFile(null);
        setFilePreview(null);
      }
    } catch (error) {
      console.error('Error creating status:', error);
      toast.error('Failed to create status');
    }
  };

  // View status
  const handleViewStatus = async (statusData, userIndex = 0, statusIndex = 0) => {
    console.log('Viewing status:', statusData);
    setCurrentViewingStatus(statusData);
    setViewingUserIndex(userIndex);
    setCurrentStatusIndex(statusIndex);
    setShowViewerModal(true);
    setProgress(0);

    // Mark status as viewed if not own status
    if (statusData.user._id !== user._id) {
      try {
        console.log('Marking status as viewed:', statusData._id);
        const response = await viewStatus(statusData._id);
        console.log('View status response:', response);
        
        // Update the status with new viewer data
        if (response.status === 'success' && response.data) {
          updateStatus(statusData._id, response.data);
        }
      } catch (error) {
        console.error('Error viewing status:', error);
      }
    }

    // Start progress bar
    startProgressBar();
  };

  // Start progress bar for status viewing
  // Start progress bar for status viewing
  const startProgressBar = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    setProgress(0);
    setIsProgressPaused(false);
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval.current);
          handleNextStatus();
          return 100;
        }
        return prev + 2; // 5 seconds total (100/2 = 50 * 100ms = 5000ms)
      });
    }, 100);
  };

  // Pause progress bar
  const pauseProgressBar = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      setIsProgressPaused(true);
    }
  };

  // Resume progress bar
  const resumeProgressBar = () => {
    if (isProgressPaused) {
      setIsProgressPaused(false);
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval.current);
            handleNextStatus();
            return 100;
          }
          return prev + 2;
        });
      }, 100);
    }
  };

  // Toggle pause/resume
  const toggleProgressPause = () => {
    if (isProgressPaused) {
      resumeProgressBar();
    } else {
      pauseProgressBar();
    }
  };

  // Stop progress bar
  const stopProgressBar = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  // Handle next status
  const handleNextStatus = () => {
    stopProgressBar();

    const groupedStatuses = getGroupedStatuses();
    const currentUser = groupedStatuses[viewingUserIndex];
    
    if (currentStatusIndex < currentUser.statuses.length - 1) {
      // Next status of same user
      const nextStatus = currentUser.statuses[currentStatusIndex + 1];
      setCurrentViewingStatus(nextStatus);
      setCurrentStatusIndex(currentStatusIndex + 1);
      setProgress(0);
      startProgressBar();
    } else if (viewingUserIndex < groupedStatuses.length - 1) {
      // Next user's first status
      const nextUser = groupedStatuses[viewingUserIndex + 1];
      setCurrentViewingStatus(nextUser.statuses[0]);
      setViewingUserIndex(viewingUserIndex + 1);
      setCurrentStatusIndex(0);
      setProgress(0);
      startProgressBar();
    } else {
      // End of statuses
      closeStatusViewer();
    }
  };

  // Handle previous status
  const handlePrevStatus = () => {
    stopProgressBar();

    const groupedStatuses = getGroupedStatuses();
    
    if (currentStatusIndex > 0) {
      // Previous status of same user
      const currentUser = groupedStatuses[viewingUserIndex];
      const prevStatus = currentUser.statuses[currentStatusIndex - 1];
      setCurrentViewingStatus(prevStatus);
      setCurrentStatusIndex(currentStatusIndex - 1);
      setProgress(0);
      startProgressBar();
    } else if (viewingUserIndex > 0) {
      // Previous user's last status
      const prevUser = groupedStatuses[viewingUserIndex - 1];
      const lastStatusIndex = prevUser.statuses.length - 1;
      setCurrentViewingStatus(prevUser.statuses[lastStatusIndex]);
      setViewingUserIndex(viewingUserIndex - 1);
      setCurrentStatusIndex(lastStatusIndex);
      setProgress(0);
      startProgressBar();
    }
  };

  // Close status viewer modal
  const closeStatusViewer = () => {
    stopProgressBar();
    setShowViewerModal(false);
    setCurrentViewingStatus(null);
    setShowViewers(false);
    setIsProgressPaused(false);
  };

  // Delete status
  const handleDeleteStatus = async (statusId) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm('Are you sure you want to delete this status?');
    if (!confirmDelete) return;

    try {
      console.log('Deleting status:', statusId);
      const response = await deleteStatus(statusId);
      console.log('Delete response:', response);
      
      if (response.status === 'success') {
        // Remove from store
        removeStatus(statusId);
        toast.success('Status deleted successfully');
        
        // Close viewer if currently viewing deleted status
        if (currentViewingStatus && currentViewingStatus._id === statusId) {
          closeStatusViewer();
        }
        
        // Emit socket event to notify other users
        socketService.emit('status_deleted', statusId);
      } else {
        toast.error(response.message || 'Failed to delete status');
      }
    } catch (error) {
      console.error('Error deleting status:', error);
      toast.error(error.data?.message || 'Failed to delete status');
    }
  };

  const groupedStatuses = getGroupedStatuses();
  const myStatuses = groupedStatuses.find(group => group.user._id === user._id);

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${
        theme === 'dark' ? 'bg-[#111b21] text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className={`h-full ${
      theme === 'dark' ? 'bg-[#111b21] text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Main Content */}
      <div className={`h-full ${
        theme === 'dark' ? 'bg-[#111b21]' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${
          theme === 'dark' ? 'border-gray-600 bg-[#202c33]' : 'border-gray-200 bg-white'
        }`}>
          <h1 className="text-xl font-semibold">Status</h1>
        </div>

        {/* Status List */}
        <div className="p-4 space-y-6 h-[calc(100%-80px)] overflow-y-auto">
          {/* My Status */}
          <div className="space-y-3">
          <h2 className={`text-sm font-medium ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            My Status
          </h2>
          
          <div 
            className={`flex items-center space-x-4 cursor-pointer rounded-lg p-3 transition-all duration-200 ${
              theme === 'dark' 
                ? 'hover:bg-[#202c33] hover:shadow-md' 
                : 'hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200'
            }`}
            onClick={() => {
              if (myStatuses && myStatuses.statuses.length > 0) {
                // Find the user index for own statuses
                const userIndex = groupedStatuses.findIndex(group => group.user._id === user._id);
                handleViewStatus(myStatuses.statuses[0], userIndex >= 0 ? userIndex : 0, 0);
              } else {
                setShowCreateModal(true);
              }
            }}
          >
            <div className="relative">
              <div className={`w-16 h-16 rounded-full ${
                myStatuses && myStatuses.statuses.length > 0 
                  ? 'bg-gradient-to-r from-green-400 to-blue-500 p-0.5' 
                  : 'bg-gray-300'
              } flex items-center justify-center overflow-hidden`}>
                <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-medium text-lg">
                      {user.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(true);
                }}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg"
              >
                <FaPlus className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">{user.username}</p>
              {myStatuses && myStatuses.statuses.length > 0 ? (
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {formatTimestamp(myStatuses.statuses[0].createdAt)}
                </p>
              ) : (
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`}>
                  Tap to add status update
                </p>
              )}
            </div>
            
            {myStatuses && myStatuses.statuses.length > 0 && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowViewers(!showViewers);
                  }}
                  className={`p-2.5 rounded-full ${
                    theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                  } transition-colors`}
                  title={`${myStatuses.statuses[0].viewers?.length || 0} views`}
                >
                  <div className="flex items-center space-x-1">
                    <FaEye className="w-4 h-4" />
                    <span className="text-xs font-semibold">{myStatuses.statuses[0].viewers?.length || 0}</span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStatus(myStatuses.statuses[0]._id);
                  }}
                  className={`p-2.5 rounded-full text-red-500 ${
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  } transition-colors`}
                  title="Delete status"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Updates */}
        {groupedStatuses.filter(group => group.user._id !== user._id).length > 0 ? (
          <div className="space-y-4">
            <h2 className={`text-sm font-medium ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Recent updates
            </h2>
            
            {groupedStatuses
              .filter(group => group.user._id !== user._id)
              .map((group, userIndex) => (
                <motion.div
                  key={group.user._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center space-x-4 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                    theme === 'dark' 
                      ? 'hover:bg-[#202c33] hover:shadow-md' 
                      : 'hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200'
                  }`}
                  onClick={() => handleViewStatus(group.statuses[0], userIndex)}
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 p-0.5">
                      <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                        {group.user.profilePicture ? (
                          <img 
                            src={group.user.profilePicture} 
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-medium text-lg">
                            {group.user.username?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    {group.statuses.length > 1 && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold shadow-lg">
                        {group.statuses.length}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">{group.user.username}</p>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {formatTimestamp(group.statuses[0].createdAt)}
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        ) : null}

        {/* Empty State */}
        {groupedStatuses.filter(group => group.user._id !== user._id).length === 0 && (!myStatuses || myStatuses.statuses.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className={`w-32 h-32 rounded-full ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
            } flex items-center justify-center shadow-lg`}>
              <FaCamera className={`w-12 h-12 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
            </div>
            <div className="text-center max-w-sm">
              <p className="font-semibold text-lg mb-2">No status updates</p>
              <p className={`text-sm leading-relaxed ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Share photos, videos and text with your contacts
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-medium transition-colors shadow-lg"
            >
              Create your first status
            </button>
          </div>
        )}
      </div>

      {/* Create Status Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
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
                  <h3 className="text-lg font-semibold">Create Status</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className={`p-2 rounded-full ${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* File Preview */}
                {filePreview && (
                  <div className="relative">
                    {selectedFile?.type.startsWith('image/') ? (
                      <img 
                        src={filePreview} 
                        alt="Preview"
                        className="w-full max-h-64 object-contain rounded-lg"
                      />
                    ) : (
                      <video 
                        src={filePreview} 
                        controls
                        className="w-full max-h-64 rounded-lg"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}

                {/* Text Input */}
                <textarea
                  value={statusContent}
                  onChange={(e) => setStatusContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${
                    theme === 'dark' 
                      ? 'bg-[#2a3942] border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                  }`}
                  rows="3"
                />

                {/* File Upload Options */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 p-3 rounded-lg border-2 border-dashed flex items-center justify-center space-x-2 ${
                      theme === 'dark' 
                        ? 'border-gray-600 hover:border-green-500' 
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    <FaImage />
                    <span>Photo/Video</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className={`flex-1 p-2 rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateStatus}
                    disabled={!statusContent.trim() && !selectedFile}
                    className="flex-1 p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post Status
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Viewer Modal */}
      <AnimatePresence>
        {showViewerModal && currentViewingStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={closeStatusViewer}
          >
            {/* Status Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-black rounded-lg overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ aspectRatio: '9/16', maxHeight: '80vh' }}
            >
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 z-10">
                <div 
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Header */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 text-white z-10 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                    {currentViewingStatus.user.profilePicture ? (
                      <img 
                        src={currentViewingStatus.user.profilePicture} 
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 font-medium">
                        {currentViewingStatus.user.username?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{currentViewingStatus.user.username}</p>
                    <p className="text-xs text-gray-300">
                      {formatTimestamp(currentViewingStatus.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {currentViewingStatus.user._id === user._id && (
                    <>
                      <button
                        onClick={() => setShowViewers(!showViewers)}
                        className="p-2 rounded-full hover:bg-gray-800 text-white"
                        title={`${currentViewingStatus.viewers?.length || 0} views`}
                      >
                        <FaEye />
                        <span className="ml-1 text-xs">{currentViewingStatus.viewers?.length || 0}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteStatus(currentViewingStatus._id)}
                        className="p-2 rounded-full hover:bg-gray-800 text-white"
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}
                  <button
                    onClick={closeStatusViewer}
                    className="p-2 rounded-full hover:bg-gray-800 text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Navigation Areas */}
                <div 
                  className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer"
                  onClick={handlePrevStatus}
                />
                <div 
                  className="absolute left-1/3 top-0 w-1/3 h-full z-10 cursor-pointer"
                  onClick={toggleProgressPause}
                />
                <div 
                  className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-pointer"
                  onClick={handleNextStatus}
                />

                {/* Status Content */}
                {currentViewingStatus.contentType === 'image' ? (
                  <img 
                    src={currentViewingStatus.imageOrVideoUrl} 
                    alt="Status"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : currentViewingStatus.contentType === 'video' ? (
                  <video 
                    src={currentViewingStatus.imageOrVideoUrl} 
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-lg"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="text-white text-center p-8">
                    <p className="text-lg font-medium break-words">{currentViewingStatus.content}</p>
                  </div>
                )}
              </div>

              {/* Viewers Modal */}
              {showViewers && currentViewingStatus.user._id === user._id && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 max-h-64 overflow-y-auto rounded-b-lg">
                  <h3 className="text-white font-medium mb-3 text-sm">
                    Viewed by {currentViewingStatus.viewers?.length || 0}
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {currentViewingStatus.viewers?.map((viewer) => (
                      <div key={viewer._id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                          {viewer.profilePicture ? (
                            <img 
                              src={viewer.profilePicture} 
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-600 text-sm">
                              {viewer.username?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-white text-sm">{viewer.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default Status;
