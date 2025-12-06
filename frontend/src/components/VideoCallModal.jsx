import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaVideo, 
  FaVideoSlash, 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaPhone, 
  FaTimes,
  FaExpand,
  FaCompress
} from 'react-icons/fa';
import useThemeStore from '../store/themeStore';

const VideoCallModal = ({ 
  isOpen, 
  onClose, 
  callType, // 'outgoing', 'incoming', 'active'
  contactData, 
  onAccept, 
  onDecline, 
  onEndCall,
  localStream,
  remoteStream,
  connectionState 
}) => {
  const { theme } = useThemeStore();
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);

  // Update video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Call duration timer
  useEffect(() => {
    let interval = null;
    
    if (callType === 'active' && !callStartTime.current) {
      callStartTime.current = Date.now();
    }
    
    if (callType === 'active') {
      interval = setInterval(() => {
        if (callStartTime.current) {
          setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callType]);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle video
  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
        } ${isFullscreen ? 'bg-black' : ''}`}
      >
        {/* Video Container */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Remote Video (Main) */}
          <div className="relative w-full h-full bg-black">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                <div className="text-center text-white">
                  <div className="w-32 h-32 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-4 relative">
                    {contactData?.profilePicture ? (
                      <img 
                        src={contactData.profilePicture} 
                        alt={contactData.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold">
                        {contactData?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                    
                    {/* Connecting animation */}
                    {(connectionState === 'connecting' || (callType === 'outgoing' && connectionState === 'disconnected')) && (
                      <div className="absolute inset-0 rounded-full border-4 border-white border-opacity-30">
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">{contactData?.username || 'Unknown'}</h2>
                  <p className="text-lg opacity-80">
                    {callType === 'outgoing' && connectionState === 'connecting' && 'Connecting...'}
                    {callType === 'outgoing' && connectionState === 'disconnected' && 'Calling...'}
                    {callType === 'incoming' && 'Incoming video call'}
                    {callType === 'active' && connectionState === 'connected' && `Connected • ${formatDuration(callDuration)}`}
                    {callType === 'active' && connectionState === 'connecting' && 'Connecting...'}
                    {callType === 'active' && connectionState === 'disconnected' && formatDuration(callDuration)}
                  </p>
                </div>
              </div>
            )}
            
            {/* Local Video (Picture in Picture) */}
            {localStream && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-4 right-4 w-32 h-40 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-white cursor-pointer"
                onClick={toggleFullscreen}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <FaVideoSlash className="text-white text-2xl" />
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Header */}
          {!isFullscreen && (
            <div className={`absolute top-0 left-0 right-0 p-4 ${
              theme === 'dark' ? 'bg-gradient-to-b from-black/60 to-transparent' : 'bg-gradient-to-b from-black/40 to-transparent'
            }`}>
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center overflow-hidden">
                    {contactData?.profilePicture ? (
                      <img 
                        src={contactData.profilePicture} 
                        alt={contactData.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-semibold">
                        {contactData?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{contactData?.username || 'Unknown'}</p>
                    <p className="text-sm opacity-80">
                      {callType === 'active' && connectionState === 'connected' && formatDuration(callDuration)}
                      {callType === 'active' && connectionState === 'connecting' && 'Connecting...'}
                      {callType === 'outgoing' && connectionState === 'connecting' && 'Connecting...'}
                      {callType === 'outgoing' && connectionState === 'disconnected' && 'Calling...'}
                      {callType === 'incoming' && 'Incoming call'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                >
                  {isFullscreen ? <FaCompress /> : <FaExpand />}
                </button>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className={`absolute bottom-0 left-0 right-0 p-6 ${
            theme === 'dark' ? 'bg-gradient-to-t from-black/60 to-transparent' : 'bg-gradient-to-t from-black/40 to-transparent'
          }`}>
            <div className="flex items-center justify-center space-x-6">
              {/* Incoming call buttons */}
              {callType === 'incoming' && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onDecline}
                    className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    <FaTimes className="text-2xl" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onAccept}
                    className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    <FaVideo className="text-2xl" />
                  </motion.button>
                </>
              )}

              {/* Active call buttons */}
              {(callType === 'active' || callType === 'outgoing') && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleAudio}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg ${
                      isAudioEnabled 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isAudioEnabled ? <FaMicrophone className="text-xl" /> : <FaMicrophoneSlash className="text-xl" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onEndCall || onClose}
                    className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    <FaPhone className="text-2xl" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleVideo}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg ${
                      isVideoEnabled 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isVideoEnabled ? <FaVideo className="text-xl" /> : <FaVideoSlash className="text-xl" />}
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCallModal;
