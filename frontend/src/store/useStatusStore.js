import { create } from 'zustand';

const useStatusStore = create((set, get) => ({
  statuses: [],
  currentViewingStatus: null,
  viewingUserIndex: 0,
  statusViewers: {},
  loading: false,

  // Set statuses
  setStatuses: (statuses) => set({ statuses }),

  // Add new status
  addStatus: (status) => set((state) => ({
    statuses: [status, ...state.statuses]
  })),

  // Update status (for viewers count)
  updateStatus: (statusId, updatedData) => set((state) => ({
    statuses: state.statuses.map(status =>
      status._id === statusId ? { ...status, ...updatedData } : status
    )
  })),

  // Remove status
  removeStatus: (statusId) => set((state) => ({
    statuses: state.statuses.filter(status => status._id !== statusId)
  })),

  // Set current viewing status
  setCurrentViewingStatus: (status) => set({ currentViewingStatus: status }),

  // Set viewing user index
  setViewingUserIndex: (index) => set({ viewingUserIndex: index }),

  // Set status viewers
  setStatusViewers: (statusId, viewers) => set((state) => ({
    statusViewers: {
      ...state.statusViewers,
      [statusId]: viewers
    }
  })),

  // Set loading
  setLoading: (loading) => set({ loading }),

  // Clear all data
  clearStatusData: () => set({
    statuses: [],
    currentViewingStatus: null,
    viewingUserIndex: 0,
    statusViewers: {},
    loading: false
  }),

  // Group statuses by user
  getGroupedStatuses: () => {
    const { statuses } = get();
    const grouped = {};
    
    statuses.forEach(status => {
      const userId = status.user._id;
      if (!grouped[userId]) {
        grouped[userId] = {
          user: status.user,
          statuses: []
        };
      }
      grouped[userId].statuses.push(status);
    });

    // Sort by latest status
    return Object.values(grouped).sort((a, b) => 
      new Date(b.statuses[0].createdAt) - new Date(a.statuses[0].createdAt)
    );
  }
}));

export default useStatusStore;
