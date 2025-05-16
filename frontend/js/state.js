class AppState {
    constructor() {
        this.state = {
            activePanel: 'chat',
            selectedModel: '2.0',
            isBuildMode: false,
            containers: [],
            chatHistory: [],
            subscribers: []
        };
    }

    // Get current state
    getState() {
        return {...this.state};
    }

    // Update state and notify subscribers
    setState(updates) {
        this.state = {
            ...this.state,
            ...updates
        };
        this.notifySubscribers();
    }

    // Subscribe to state changes
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    // Notify all subscribers of state changes
    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }

    // Actions
    setActivePanel(panel) {
        this.setState({ activePanel: panel });
    }

    setSelectedModel(model) {
        this.setState({ selectedModel: model });
    }

    toggleBuildMode() {
        this.setState({ isBuildMode: !this.state.isBuildMode });
    }

    updateContainers(containers) {
        this.setState({ containers });
    }

    addChatMessage(message) {
        const chatHistory = [...this.state.chatHistory, message];
        this.setState({ chatHistory });
    }
}

// Export a singleton instance
const appState = new AppState();
export default appState;
