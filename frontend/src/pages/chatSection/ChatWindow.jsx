import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  FaArrowLeft, 
  FaPhone, 
  FaVideo, 
  FaEllipsisV, 
  FaPaperPlane, 
  FaPaperclip, 
  FaSmile,
  FaCheck,
  FaCheckDouble,
  FaImage,
  FaTimes
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/useUserStore';
import useChatStore from '../../store/useChatStore';
import { sendMessage, getMessages, markMessagesAsRead, sendMessageWithFile } from '../../services/chat.services';
import socketService from '../../services/socket.service';
import videoCallService from '../../services/videoCall.service';
import VideoCallModal from '../../components/VideoCallModal';
import { toast } from 'react-toastify';
import formatTimestamp from '../../utils/formateTime';

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    messages,
    setMessages,
    addMessage,
    updateMessageStatus,
    removeMessage,
    setLoading,
    setTypingStatus,
    typingUsers,
    onlineUsers,
    setOnlineStatus,
    messageReactions,
    addReaction,
    removeReaction,
    cleanupTempMessages
  } = useChatStore();

  // Ensure onlineUsers is always an array (safety check for cached data)
  const safeOnlineUsers = Array.isArray(onlineUsers) ? onlineUsers : [];

  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 });
  
  // Video call states
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallType, setVideoCallType] = useState(null); // 'outgoing', 'incoming', 'active'
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileMenuRef = useRef(null);

  // Get messages for current conversation
  const currentMessages = useMemo(() => {
    return conversationId ? messages[conversationId] || [] : [];
  }, [conversationId, messages]);

  const loadMessages = useCallback(async (convId) => {
    if (!user?._id) {
      console.warn('User not authenticated');
      return;
    }
    
    console.log('Loading messages for conversation:', convId);
    
    try {
      setLoading(true);
      const response = await getMessages(convId);
      console.log('Messages loaded:', response);
      
      if (response.status === 'success') {
        setMessages(convId, response.data);
        // Mark messages as read
        const unreadMessages = response.data
          .filter(msg => msg.receiver === user._id && msg.messageStatus !== 'read')
          .map(msg => msg._id);
        
        if (unreadMessages.length > 0) {
          console.log('Marking messages as read:', unreadMessages);
          await markMessagesAsRead(unreadMessages);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user?._id, setLoading, setMessages]);

  useEffect(() => {
    if (selectedContact?.conversation?._id) {
      const convId = selectedContact.conversation._id;
      console.log('Setting conversation ID:', convId, 'for contact:', selectedContact);
      setConversationId(convId);
      loadMessages(convId);
    } else {
      console.log('No conversation found for contact:', selectedContact);
      setConversationId(null);
    }
  }, [selectedContact, loadMessages]);

  const endVideoCall = useCallback(() => {
    console.log('Ending video call');
    videoCallService.endCall();
    setShowVideoCall(false);
    setVideoCallType(null);
    setIncomingCallData(null);
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('disconnected');
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  // Cleanup temp messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupTempMessages();
    }, 30000); // Clean every 30 seconds

    return () => clearInterval(interval);
  }, [cleanupTempMessages]);

  useEffect(() => {
    // Setup socket listeners only once when user is available
    if (user?._id && !socketService.getSocket()) {
      socketService.connect(user._id);
      // Set user as online when connecting
      setOnlineStatus(user._id, true);
    }

    if (socketService.getSocket() && user?._id) {
      // Remove only message-related listeners to prevent duplicates
      socketService.off('receive_message');
      socketService.off('message_read');
      socketService.off('message_deleted');
      socketService.off('user_typing');
      socketService.off('user_online');
      socketService.off('user_offline');
      socketService.off('reaction_added');
      socketService.off('reaction_removed');
      
      // Listen for new messages
      socketService.onReceiveMessage((message) => {
        console.log('Received message:', message);
        
        // Only add message and show notification if it's not from current user
        if (message.conversation && message.sender?._id !== user?._id) {
          addMessage(message.conversation, message);
          
          // Only show notification if the message is not for the current active conversation
          if (selectedContact?.conversation?._id !== message.conversation) {
            toast.info(`New message from ${message.sender?.username}`);
          }
        }
      });

      // Listen for message read updates
      socketService.onMessageRead((updatedMessage) => {
        console.log('Message read update:', updatedMessage);
        if (updatedMessage.conversation) {
          updateMessageStatus(updatedMessage.conversation, updatedMessage._id, updatedMessage.messageStatus);
        }
      });

      // Listen for message deletion
      socketService.onMessageDeleted((messageId) => {
        console.log('Message deleted:', messageId);
        // Remove from all conversations since we don't know which one
        Object.keys(messages).forEach(convId => {
          removeMessage(convId, messageId);
        });
      });

      // Listen for typing status
      socketService.onUserTyping(({ userId, conversationId: typingConvId, isTyping }) => {
        console.log('Typing status:', { userId, conversationId: typingConvId, isTyping });
        if (typingConvId && userId !== user._id) {
          setTypingStatus(typingConvId, userId, isTyping);
        }
      });

      // Listen for online status changes
      socketService.onUserOnline((userId) => {
        console.log('User came online:', userId);
        setOnlineStatus(userId, true);
      });

      socketService.onUserOffline((userId) => {
        console.log('User went offline:', userId);
        setOnlineStatus(userId, false);
      });

      // Listen for message reactions
      socketService.onReactionAdded(({ messageId, userId: reactorId, emoji }) => {
        console.log('Reaction added:', { messageId, userId: reactorId, emoji });
        addReaction(messageId, reactorId, emoji);
      });

      socketService.onReactionRemoved(({ messageId, userId: reactorId, emoji }) => {
        console.log('Reaction removed:', { messageId, userId: reactorId, emoji });
        removeReaction(messageId, reactorId, emoji);
      });

      // Video call listeners
      socketService.onIncomingVideoCall((data) => {
        console.log('Incoming video call:', data);
        setIncomingCallData(data);
        setVideoCallType('incoming');
        setShowVideoCall(true);
      });

      socketService.onVideoCallAccepted((data) => {
        console.log('Video call accepted:', data);
        setVideoCallType('active');
      });

      socketService.onVideoCallDeclined((data) => {
        console.log('Video call declined:', data);
        toast.info('Call declined');
        endVideoCall();
      });

      socketService.onVideoCallEnded((data) => {
        console.log('Video call ended:', data);
        if (data.reason === 'timeout') {
          toast.info('Call ended - No answer');
        } else {
          toast.info('Call ended');
        }
        endVideoCall();
      });

      // Listen for auto-ended calls
      socketService.on('video_call_auto_ended', (data) => {
        console.log('Video call auto-ended:', data);
        toast.warning('Call ended - No answer after 30 seconds');
        endVideoCall();
      });

      // Listen for call failed events
      socketService.on('video_call_failed', (data) => {
        console.log('Video call failed:', data);
        toast.error(data.message || 'Call failed');
        endVideoCall();
      });

      // Video call service callbacks
      videoCallService.onRemoteStream((stream) => {
        console.log('Remote stream received:', stream);
        setRemoteStream(stream);
      });

      videoCallService.onConnectionState((state) => {
        console.log('Connection state changed:', state);
        setConnectionState(state);
        if (state === 'connected') {
          setVideoCallType('active');
        }
      });
    }

    // Don't remove listeners on cleanup to maintain real-time functionality
    return () => {
      // Clean up video call listeners when component unmounts
      socketService.off('incoming_video_call');
      socketService.off('video_call_accepted');
      socketService.off('video_call_declined');
      socketService.off('video_call_ended');
      socketService.off('video_call_auto_ended');
      socketService.off('video_call_failed');
    };
  }, [user?._id, addMessage, messages, removeMessage, setTypingStatus, updateMessageStatus, setOnlineStatus, addReaction, removeReaction, endVideoCall, selectedContact?.conversation?._id]);

  // Separate useEffect for video call initialization
  useEffect(() => {
    if (socketService.getSocket() && user?._id) {
      console.log('Initializing video call service for user:', user._id);
      
      // Initialize video call service with socket
      videoCallService.initialize(socketService.getSocket());
      
      // Video call listeners
      socketService.onIncomingVideoCall((data) => {
        console.log('Incoming video call received:', data);
        setIncomingCallData(data);
        setVideoCallType('incoming');
        setShowVideoCall(true);
        toast.info(`Incoming video call from ${data.from?.username}`);
      });

      socketService.onVideoCallAccepted(async (data) => {
        console.log('Video call accepted:', data);
        setVideoCallType('active');
        toast.success('Call connected');
        await videoCallService.handleCallAccepted(data);
      });

      socketService.onVideoCallDeclined((data) => {
        console.log('Video call declined:', data);
        toast.info('Call declined');
        endVideoCall();
      });

      socketService.onVideoCallEnded((data) => {
        console.log('Video call ended:', data);
        toast.info('Call ended');
        endVideoCall();
      });

      socketService.onVideoCallAutoEnded((data) => {
        console.log('Video call auto-ended:', data);
        toast.info('Call timed out after 30 seconds');
        endVideoCall();
      });

      socketService.onVideoCallFailed((data) => {
        console.log('Video call failed:', data);
        toast.error('Call failed');
        endVideoCall();
      });

      // Handle video call timeout
      socketService.on('video_call_timeout', (data) => {
        console.log('Video call timeout:', data);
        toast.info('Call timed out');
        endVideoCall();
      });

      // Video call service callbacks
      videoCallService.onRemoteStream((stream) => {
        console.log('Remote stream received:', stream);
        setRemoteStream(stream);
      });

      videoCallService.onConnectionState((state) => {
        console.log('Connection state changed:', state);
        setConnectionState(state);
        if (state === 'connected') {
          setVideoCallType('active');
        }
      });
    }
  }, [user?._id, endVideoCall]);

  // Close file menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target)) {
        setShowFileMenu(false);
      }
    };

    if (showFileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFileMenu]);

  // File handling functions
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
    setShowFileMenu(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendWithFile = async () => {
    if (!selectedFile || !selectedContact || !user?._id) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('senderId', user._id);
    formData.append('receiverId', selectedContact._id);
    formData.append('messageStatus', 'send');

    const tempId = `temp-${Date.now()}`;
    
    try {
      // Add message optimistically to UI
      const tempMessage = {
        _id: tempId,
        sender: user,
        receiver: selectedContact,
        createdAt: new Date(),
        messageStatus: 'send',
        imageOrVideoUrl: filePreview,
        contentType: selectedFile.type.startsWith('image/') ? 'image' : 'video'
      };

      let targetConversationId = conversationId;
      
      if (targetConversationId) {
        addMessage(targetConversationId, tempMessage);
      }
      
      // Clear file selection
      handleRemoveFile();

      console.log('Sending file message...');
      
      // Send message to server
      const response = await sendMessageWithFile(formData);
      console.log('File message sent response:', response);
      
      if (response.status === 'success') {
        const realMessage = response.data;
        const messageConversationId = realMessage.conversation;
        
        // If we didn't have a conversation ID before, set it now
        if (!targetConversationId && messageConversationId) {
          setConversationId(messageConversationId);
          targetConversationId = messageConversationId;
        }

        // Replace temp message with real message
        if (targetConversationId) {
          removeMessage(targetConversationId, tempId);
          addMessage(targetConversationId, realMessage);
        }

        // Emit socket event for real-time delivery
        socketService.sendMessage({
          ...realMessage,
          conversation: messageConversationId
        });

        scrollToBottom();
      } else {
        // Remove failed message
        if (targetConversationId) {
          removeMessage(targetConversationId, tempId);
        }
        toast.error(response.message || 'Failed to send file');
      }
    } catch (error) {
      console.error('Error sending file message:', error);
      
      // Remove failed message
      if (conversationId) {
        removeMessage(conversationId, tempId);
      }
      
      toast.error(error.data?.message || 'Failed to send file');
    }
  };

  // Handle message reactions
  const handleReactionClick = (messageId, e) => {
    if (e) {
      e.stopPropagation();
      setReactionPickerPosition({ x: e.clientX, y: e.clientY });
    }
    setShowReactionPicker(messageId);
  };

  const handleReactionSelect = (messageId, emoji) => {
    addReaction(messageId, user._id, emoji);
    socketService.addReaction(messageId, emoji);
    setShowReactionPicker(null);
  };

  const handleRemoveReaction = (messageId, emoji) => {
    removeReaction(messageId, user._id, emoji);
    socketService.removeReaction(messageId, emoji);
  };

  // Get reactions for a message
  const getMessageReactions = (messageId) => {
    return messageReactions[messageId] || {};
  };

  // Check if user has reacted with specific emoji
  const hasUserReacted = (messageId, emoji) => {
    const reactions = getMessageReactions(messageId);
    return reactions[emoji] && reactions[emoji].includes(user._id);
  };

  // Count reactions
  const getReactionCount = (messageId, emoji) => {
    const reactions = getMessageReactions(messageId);
    return reactions[emoji] ? reactions[emoji].length : 0;
  };

  // Video call handlers
  const startVideoCall = async () => {
    try {
      console.log('Starting video call to contact:', selectedContact);
      console.log('Current user:', user);
      console.log('Socket connected:', socketService.getSocket()?.connected);
      
      if (!selectedContact?._id) {
        throw new Error('No contact selected');
      }
      
      if (!socketService.getSocket()?.connected) {
        throw new Error('Socket not connected');
      }
      
      setVideoCallType('outgoing');
      setShowVideoCall(true);
      
      // Start the call using video call service
      const stream = await videoCallService.getUserMedia();
      setLocalStream(stream);
      
      console.log('Initiating call with data:', {
        to: selectedContact._id,
        from: {
          _id: user._id,
          username: user.username,
          profilePicture: user.profilePicture
        }
      });
      
      await videoCallService.startCall(selectedContact._id, {
        _id: user._id,
        username: user.username,
        profilePicture: user.profilePicture
      });
      
      console.log('Video call started successfully');
      toast.success('Calling...');
    } catch (error) {
      console.error('Error starting video call:', error);
      toast.error(`Failed to start video call: ${error.message}`);
      setShowVideoCall(false);
      setVideoCallType(null);
    }
  };

  const acceptVideoCall = async () => {
    try {
      setVideoCallType('active');
      const stream = await videoCallService.getUserMedia();
      setLocalStream(stream);
      
      await videoCallService.acceptCall(incomingCallData);
      console.log('Video call accepted');
    } catch (error) {
      console.error('Error accepting video call:', error);
      toast.error('Failed to accept video call');
    }
  };

  const declineVideoCall = () => {
    videoCallService.declineCall(incomingCallData);
    setShowVideoCall(false);
    setVideoCallType(null);
    setIncomingCallData(null);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // If we have a file selected, send file instead
    if (selectedFile) {
      await handleSendWithFile();
      return;
    }
    
    if (!messageText.trim() || !selectedContact || !user?._id) return;

    const messageData = {
      senderId: user._id,
      receiverId: selectedContact._id,
      content: messageText.trim(),
      messageStatus: 'send'
    };

    const tempId = `temp-${Date.now()}`;
    
    try {
      // Add message optimistically to UI with tempId
      const tempMessage = {
        ...messageData,
        _id: tempId,
        tempId: tempId, // Add tempId for tracking
        createdAt: new Date(),
        sender: user,
        receiver: selectedContact,
        contentType: 'text'
      };

      // If we don't have a conversationId yet, we'll get it from the response
      let targetConversationId = conversationId;
      
      if (targetConversationId) {
        addMessage(targetConversationId, tempMessage);
      }
      
      setMessageText('');

      console.log('Sending message:', messageData);
      
      // Send message to server
      const response = await sendMessage(messageData);
      console.log('Message sent response:', response);
      
      if (response.status === 'success') {
        const realMessage = response.data;
        const messageConversationId = realMessage.conversation;
        
        // If we didn't have a conversation ID before, set it now
        if (!targetConversationId && messageConversationId) {
          setConversationId(messageConversationId);
          targetConversationId = messageConversationId;
        }
        
        if (targetConversationId) {
          // Replace temp message with real message
          const currentMessagesArray = currentMessages;
          const tempMessageIndex = currentMessagesArray.findIndex(msg => 
            msg._id === tempId || msg.tempId === tempId
          );
          
          if (tempMessageIndex !== -1) {
            // Replace the temp message with real message
            const updatedMessages = [...currentMessagesArray];
            updatedMessages[tempMessageIndex] = realMessage;
            console.log('Replacing temp message:', { tempId, realMessage });
            setMessages(targetConversationId, updatedMessages);
          } else {
            // If temp message not found, just add the real message
            console.log('Temp message not found, adding real message:', realMessage);
            addMessage(targetConversationId, realMessage);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Remove temp message on error if we had added it
      if (conversationId) {
        removeMessage(conversationId, tempId);
      }
    }
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);

    if (!isTyping && conversationId && selectedContact?._id) {
      setIsTyping(true);
      socketService.startTyping(conversationId, selectedContact._id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (conversationId && selectedContact?._id) {
        socketService.stopTyping(conversationId, selectedContact._id);
      }
    }, 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMessageStatusIcon = (message) => {
    // Safety check for message and sender
    if (!message || !message.sender || !message.sender._id || message.sender._id !== user._id) {
      return null;
    }

    switch (message.messageStatus) {
      case 'send':
        return <FaCheck className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <FaCheckDouble className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <FaCheckDouble className="w-3 h-3 text-blue-500" />;
      default:
        return <FaCheck className="w-3 h-3 text-gray-400" />;
    }
  };

  const isCurrentlyTyping = conversationId && typingUsers[conversationId] && user?._id
    ? Object.keys(typingUsers[conversationId]).some(userId => 
        userId !== user._id && typingUsers[conversationId][userId]
      )
    : false;

  // Early return if no user is authenticated
  if (!user || !user._id) {
    return (
      <div className={`h-full flex items-center justify-center ${
        theme === 'dark' ? 'bg-[#0b141a] text-gray-400' : 'bg-gray-50 text-gray-500'
      }`}>
        <div className="text-center">
          <h3 className="text-xl font-light mb-2">Please log in</h3>
          <p className="text-sm">You need to be authenticated to use chat</p>
        </div>
      </div>
    );
  }

  if (!selectedContact) {
    return null; // Let Layout handle the welcome screen
  }

  return (
    <>
      <div className={`h-full flex flex-col ${
        theme === 'dark' ? 'bg-[#0b141a]' : 'bg-white'
      }`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${
        theme === 'dark' ? 'bg-[#202c33] border-gray-600' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          {isMobile && (
            <button
              onClick={() => setSelectedContact(null)}
              className={`p-2 rounded-full transition-colors ${
                theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              title="Back to chat list"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
          )}
          <img
            src={selectedContact?.profilePicture}
            alt={selectedContact?.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className={`font-medium ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {selectedContact?.username}
            </h3>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {safeOnlineUsers.includes(selectedContact?._id) 
                ? 'online' 
                : selectedContact?.lastSeen 
                  ? `last seen ${formatTimestamp(selectedContact.lastSeen)}`
                  : 'offline'
              }
              {isCurrentlyTyping && ', typing...'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className={`p-2 rounded-full hover:bg-opacity-10 ${
            theme === 'dark' ? 'text-gray-300 hover:bg-white' : 'text-gray-600 hover:bg-gray-600'
          }`}>
            <FaPhone />
          </button>
          <button 
            onClick={startVideoCall}
            className={`p-2 rounded-full hover:bg-opacity-10 ${
              theme === 'dark' ? 'text-gray-300 hover:bg-white' : 'text-gray-600 hover:bg-gray-600'
            }`}
            title="Start video call"
          >
            <FaVideo />
          </button>
          <button className={`p-2 rounded-full hover:bg-opacity-10 ${
            theme === 'dark' ? 'text-gray-300 hover:bg-white' : 'text-gray-600 hover:bg-gray-600'
          }`}>
            <FaEllipsisV />
          </button>
          {!isMobile && (
            <button
              onClick={() => setSelectedContact(null)}
              className={`p-2 rounded-full transition-colors ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
              title="Close chat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${
        theme === 'dark' ? 'bg-[#0b141a]' : 'bg-gray-50'
      }`}
      style={{
        backgroundImage: theme === 'dark' 
          ? 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 10 0 L 0 0 0 10" fill="none" stroke="%23374151" stroke-width="0.5" opacity="0.1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23smallGrid)" /%3E%3C/svg%3E")' 
          : 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 10 0 L 0 0 0 10" fill="none" stroke="%23d1d5db" stroke-width="0.5" opacity="0.3"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23smallGrid)" /%3E%3C/svg%3E")'
      }}>
        <AnimatePresence>
          {currentMessages.map((message) => {
            // Safety check for message and sender
            if (!message || !message.sender || !message.sender._id) {
              return null;
            }
            
            return (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'} group relative`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
                  message.sender._id === user._id
                    ? theme === 'dark'
                      ? 'bg-[#005c4b] text-white'
                      : 'bg-green-500 text-white'
                    : theme === 'dark'
                      ? 'bg-[#202c33] text-gray-200'
                      : 'bg-white text-gray-800 border'
                }`}>
                  {/* Reaction Button */}
                  <button
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600 hover:bg-gray-700 text-white rounded-full p-1 text-xs z-10"
                    onClick={(e) => handleReactionClick(message._id, e)}
                    title="Add reaction"
                  >
                    😊
                  </button>

                  {/* Message Content */}
                  {message.contentType === 'image' && message.imageOrVideoUrl ? (
                    <div className="mb-2">
                      <img 
                        src={message.imageOrVideoUrl} 
                        alt="Shared content"
                        className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.imageOrVideoUrl, '_blank')}
                        style={{ maxHeight: '300px' }}
                      />
                      {message.content && (
                        <p className="text-sm mt-2">{message.content}</p>
                      )}
                    </div>
                  ) : message.contentType === 'video' && message.imageOrVideoUrl ? (
                    <div className="mb-2">
                      <video 
                        src={message.imageOrVideoUrl} 
                        controls
                        className="rounded-lg max-w-full h-auto"
                        style={{ maxHeight: '300px' }}
                      >
                        Your browser does not support the video tag.
                      </video>
                      {message.content && (
                        <p className="text-sm mt-2">{message.content}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{message.content || ''}</p>
                  )}

                  {/* Reactions Display */}
                  {Object.keys(getMessageReactions(message._id)).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 mb-1">
                      {Object.entries(getMessageReactions(message._id)).map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                            hasUserReacted(message._id, emoji)
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : theme === 'dark'
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          onClick={() => {
                            if (hasUserReacted(message._id, emoji)) {
                              handleRemoveReaction(message._id, emoji);
                            } else {
                              handleReactionSelect(message._id, emoji);
                            }
                          }}
                        >
                          <span>{emoji}</span>
                          <span>{getReactionCount(message._id, emoji)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-end space-x-1 mt-1">
                    <span className={`text-xs ${
                      message.sender._id === user._id
                        ? 'text-gray-200'
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(message.createdAt)}
                    </span>
                    {getMessageStatusIcon(message)}
                  </div>
                </div>
              </motion.div>
            );
          }).filter(Boolean)}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={`p-3 border-t ${
        theme === 'dark' ? 'bg-[#202c33] border-gray-600' : 'bg-white border-gray-200'
      }`}>
        {/* File Preview */}
        {selectedFile && filePreview && (
          <div className={`mb-3 p-3 rounded-lg border ${
            theme === 'dark' ? 'bg-[#2a3942] border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <span className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                File Preview
              </span>
              <button
                onClick={handleRemoveFile}
                className={`p-1 rounded-full hover:bg-opacity-10 ${
                  theme === 'dark' ? 'text-gray-400 hover:bg-white' : 'text-gray-500 hover:bg-gray-500'
                }`}
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex items-center justify-center">
              {selectedFile.type.startsWith('image/') ? (
                <img 
                  src={filePreview} 
                  alt="Preview"
                  className="max-h-32 max-w-full rounded-lg object-contain"
                />
              ) : (
                <video 
                  src={filePreview} 
                  controls
                  className="max-h-32 max-w-full rounded-lg"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
            <p className={`text-xs mt-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            className={`p-2 rounded-full hover:bg-opacity-10 ${
              theme === 'dark' ? 'text-gray-400 hover:bg-white' : 'text-gray-500 hover:bg-gray-500'
            }`}
          >
            <FaSmile />
          </button>
          
          {/* File Upload Button with Menu */}
          <div className="relative" ref={fileMenuRef}>
            <button
              type="button"
              onClick={() => setShowFileMenu(!showFileMenu)}
              className={`p-2 rounded-full hover:bg-opacity-10 ${
                theme === 'dark' ? 'text-gray-400 hover:bg-white' : 'text-gray-500 hover:bg-gray-500'
              }`}
            >
              <FaPaperclip />
            </button>
            
            {/* File Menu */}
            {showFileMenu && (
              <div className={`absolute bottom-full mb-2 left-0 rounded-lg shadow-lg border ${
                theme === 'dark' ? 'bg-[#2a3942] border-gray-600' : 'bg-white border-gray-200'
              } py-2 min-w-32`}>
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowFileMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-opacity-10 flex items-center space-x-2 ${
                    theme === 'dark' ? 'text-gray-200 hover:bg-white' : 'text-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <FaImage />
                  <span>Photos & Videos</span>
                </button>
              </div>
            )}
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          <input
            type="text"
            value={messageText}
            onChange={handleTyping}
            placeholder={selectedFile ? "Add a caption..." : "Type a message"}
            className={`flex-1 px-4 py-2 rounded-full focus:outline-none ${
              theme === 'dark'
                ? 'bg-[#2a3942] text-white placeholder-gray-400'
                : 'bg-gray-100 text-gray-900 placeholder-gray-500'
            }`}
          />
          
          <button
            type="submit"
            disabled={!messageText.trim() && !selectedFile}
            className={`p-2 rounded-full transition-colors ${
              (messageText.trim() || selectedFile)
                ? 'bg-green-500 text-white hover:bg-green-600'
                : theme === 'dark'
                  ? 'text-gray-400'
                  : 'text-gray-400'
            }`}
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>

      {/* Emoji Reaction Picker */}
      {showReactionPicker && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowReactionPicker(null)}
          />
          <div 
            className={`fixed z-50 p-2 rounded-lg shadow-lg border flex space-x-2 ${
              theme === 'dark' ? 'bg-[#2a3942] border-gray-600' : 'bg-white border-gray-200'
            }`}
            style={{
              left: `${Math.min(reactionPickerPosition.x - 100, window.innerWidth - 200)}px`,
              top: `${Math.max(reactionPickerPosition.y - 50, 10)}px`
            }}
          >
            {['❤️', '😂', '😮', '😢', '😡', '👍', '👎'].map((emoji) => (
              <button
                key={emoji}
                className={`p-2 text-xl hover:bg-opacity-10 rounded transition-colors ${
                  theme === 'dark' ? 'hover:bg-white' : 'hover:bg-gray-700'
                }`}
                onClick={() => handleReactionSelect(showReactionPicker, emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
      </div>

      {/* Video Call Modal */}
      {showVideoCall && (
        <VideoCallModal
          isOpen={showVideoCall}
          onClose={() => {
            setShowVideoCall(false);
            setVideoCallType(null);
            setIncomingCallData(null);
          }}
          callType={videoCallType}
          contactData={videoCallType === 'incoming' ? incomingCallData?.from : selectedContact}
          onAccept={acceptVideoCall}
          onDecline={declineVideoCall}
          onEndCall={endVideoCall}
          localStream={localStream}
          remoteStream={remoteStream}
          connectionState={connectionState}
        />
      )}
    </>
  );
};

export default ChatWindow
