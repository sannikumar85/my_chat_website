class VideoCallService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.socket = null;
    this.isCallActive = false;
    this.currentCallWith = null;
    this.currentCallId = null;
    this.localVideo = null;
    this.remoteVideo = null;
    this.onCallReceived = null;
    this.onCallAccepted = null;
    this.onCallDeclined = null;
    this.onCallEnded = null;
    this.onRemoteStreamReceived = null;
    this.onConnectionStateChange = null;
    
    // ICE servers configuration
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  // Initialize with socket connection
  initialize(socket) {
    this.socket = socket;
    // Don't setup duplicate listeners - let ChatWindow handle socket events
  }

  // Setup socket event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    // Listen for incoming call
    this.socket.on('incoming_video_call', (data) => {
      console.log('Incoming video call:', data);
      if (this.onCallReceived) {
        this.onCallReceived(data);
      }
    });

    // Listen for call accepted
    this.socket.on('video_call_accepted', async (data) => {
      console.log('Video call accepted:', data);
      if (this.onCallAccepted) {
        this.onCallAccepted(data);
      }
      await this.handleCallAccepted(data);
    });

    // Listen for call declined
    this.socket.on('video_call_declined', (data) => {
      console.log('Video call declined:', data);
      if (this.onCallDeclined) {
        this.onCallDeclined(data);
      }
      this.endCall();
    });

    // Listen for call ended
    this.socket.on('video_call_ended', (data) => {
      console.log('Video call ended:', data);
      if (this.onCallEnded) {
        this.onCallEnded(data);
      }
      this.endCall();
    });

    // Listen for auto-ended calls (timeout)
    this.socket.on('video_call_auto_ended', (data) => {
      console.log('Video call auto-ended:', data);
      if (this.onCallEnded) {
        this.onCallEnded({ ...data, reason: 'timeout' });
      }
      this.endCall();
    });

    // Listen for ICE candidates
    this.socket.on('ice_candidate', async (data) => {
      console.log('Received ICE candidate:', data);
      if (this.peerConnection && data.candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Listen for offer
    this.socket.on('video_call_offer', async (data) => {
      console.log('Received video call offer:', data);
      await this.handleOffer(data);
    });

    // Listen for answer
    this.socket.on('video_call_answer', async (data) => {
      console.log('Received video call answer:', data);
      await this.handleAnswer(data);
    });
  }

  // Get user media (camera and microphone)
  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got local stream:', this.localStream);
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  // Create peer connection
  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceServers);

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
      this.remoteStream = event.streams[0];
      if (this.onRemoteStreamReceived) {
        this.onRemoteStreamReceived(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        this.socket?.emit('ice_candidate', {
          candidate: event.candidate,
          to: this.currentCallWith
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    return this.peerConnection;
  }

  // Start video call
  async startCall(contactId, contactData) {
    try {
      console.log('Starting video call to:', contactId);
      this.currentCallWith = contactId;
      this.isCallActive = true;

      // Get user media
      await this.getUserMedia();

      // Create peer connection
      this.createPeerConnection();

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send call invitation
      this.socket?.emit('initiate_video_call', {
        to: contactId,
        from: contactData,
        offer: offer
      });

      console.log('Video call initiated');
      return true;
    } catch (error) {
      console.error('Error starting video call:', error);
      this.endCall();
      throw error;
    }
  }

  // Accept incoming call
  async acceptCall(callData) {
    try {
      console.log('Accepting video call from:', callData.from);
      this.currentCallWith = callData.from._id;
      this.currentCallId = callData.callId;
      this.isCallActive = true;

      // Get user media
      await this.getUserMedia();

      // Create peer connection
      this.createPeerConnection();

      // Set remote description from offer
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send acceptance
      this.socket?.emit('accept_video_call', {
        to: callData.from._id,
        answer: answer,
        callId: callData.callId
      });

      console.log('Video call accepted');
      return true;
    } catch (error) {
      console.error('Error accepting video call:', error);
      this.endCall();
      throw error;
    }
  }

  // Decline incoming call
  declineCall(callData) {
    console.log('Declining video call from:', callData.from);
    this.socket?.emit('decline_video_call', {
      to: callData.from._id,
      callId: callData.callId
    });
  }

  // Handle call accepted
  async handleCallAccepted(data) {
    try {
      if (data.answer && this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Remote description set from answer');
      }
    } catch (error) {
      console.error('Error handling call accepted:', error);
    }
  }

  // Handle offer
  async handleOffer(data) {
    try {
      if (!this.peerConnection) {
        this.createPeerConnection();
      }
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle answer
  async handleAnswer(data) {
    try {
      if (this.peerConnection && data.answer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // End video call
  endCall() {
    console.log('Ending video call');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset streams
    this.remoteStream = null;
    this.isCallActive = false;

    // Notify the other party
    if (this.currentCallWith && this.socket) {
      this.socket.emit('end_video_call', {
        to: this.currentCallWith,
        callId: this.currentCallId
      });
    }

    this.currentCallWith = null;
    this.currentCallId = null;
  }

  // Toggle camera
  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Toggle microphone
  toggleMicrophone() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Set video elements
  setVideoElements(localVideo, remoteVideo) {
    this.localVideo = localVideo;
    this.remoteVideo = remoteVideo;

    // Set local stream
    if (this.localVideo && this.localStream) {
      this.localVideo.srcObject = this.localStream;
    }

    // Set remote stream
    if (this.remoteVideo && this.remoteStream) {
      this.remoteVideo.srcObject = this.remoteStream;
    }
  }

  // Event handlers
  onIncomingCall(callback) {
    this.onCallReceived = callback;
  }

  onCallAcceptedCallback(callback) {
    this.onCallAccepted = callback;
  }

  onCallDeclinedCallback(callback) {
    this.onCallDeclined = callback;
  }

  onCallEndedCallback(callback) {
    this.onCallEnded = callback;
  }

  onRemoteStream(callback) {
    this.onRemoteStreamReceived = callback;
  }

  onConnectionState(callback) {
    this.onConnectionStateChange = callback;
  }

  // Cleanup
  cleanup() {
    this.endCall();
    if (this.socket) {
      this.socket.off('incoming_video_call');
      this.socket.off('video_call_accepted');
      this.socket.off('video_call_declined');
      this.socket.off('video_call_ended');
      this.socket.off('ice_candidate');
      this.socket.off('video_call_offer');
      this.socket.off('video_call_answer');
    }
  }
}

const videoCallService = new VideoCallService();
export default videoCallService;
