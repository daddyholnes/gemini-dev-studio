"""
Collaboration Module for Podplay Build
Enables real-time collaboration between users
"""
import os
import json
import time
import uuid
import logging
import threading
import queue
from typing import Dict, List, Any, Optional, Union, Callable

# Import local storage for persistence
from local_storage import get_local_storage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("collaboration")

class CollaborationSession:
    """Represents a single collaboration session between multiple users"""
    
    def __init__(self, session_id: str, project_id: str, owner_id: str, name: str):
        """Initialize a collaboration session
        
        Args:
            session_id: Unique session identifier
            project_id: Associated project identifier
            owner_id: User ID of session owner
            name: Session name
        """
        self.session_id = session_id
        self.project_id = project_id
        self.owner_id = owner_id
        self.name = name
        self.created_at = int(time.time())
        self.updated_at = int(time.time())
        self.participants = {owner_id: {"role": "owner", "joined_at": self.created_at}}
        self.status = "active"
        self.messages = []
        self.events = []
        self.cursors = {}  # User cursor positions
        self.shared_state = {}  # Shared state between participants
        
        # Event queue for real-time updates
        self.event_queue = queue.Queue()
        
        # Subscribers for SSE
        self.subscribers = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary
        
        Returns:
            Session data as dictionary
        """
        return {
            "id": self.session_id,
            "project_id": self.project_id,
            "owner_id": self.owner_id,
            "name": self.name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "participants": self.participants,
            "status": self.status,
            "messages": self.messages[-50:],  # Limit to last 50 messages
            "events": self.events[-20:],  # Limit to last 20 events
            "cursors": self.cursors,
            "shared_state": self.shared_state
        }
    
    def add_participant(self, user_id: str, role: str = "guest") -> bool:
        """Add participant to session
        
        Args:
            user_id: User identifier
            role: Participant role (owner, editor, guest)
            
        Returns:
            Success indicator
        """
        if user_id in self.participants:
            return False
        
        self.participants[user_id] = {
            "role": role,
            "joined_at": int(time.time())
        }
        
        self.updated_at = int(time.time())
        
        # Create system event
        self._add_event("participant_joined", {
            "user_id": user_id,
            "role": role
        })
        
        return True
    
    def remove_participant(self, user_id: str) -> bool:
        """Remove participant from session
        
        Args:
            user_id: User identifier
            
        Returns:
            Success indicator
        """
        if user_id not in self.participants:
            return False
        
        # Can't remove owner
        if user_id == self.owner_id:
            return False
        
        del self.participants[user_id]
        self.updated_at = int(time.time())
        
        # Create system event
        self._add_event("participant_left", {
            "user_id": user_id
        })
        
        # Remove cursor if exists
        if user_id in self.cursors:
            del self.cursors[user_id]
        
        return True
    
    def update_participant_role(self, user_id: str, role: str) -> bool:
        """Update participant role
        
        Args:
            user_id: User identifier
            role: New role
            
        Returns:
            Success indicator
        """
        if user_id not in self.participants:
            return False
        
        # Owner role can only be changed through transfer_ownership
        if user_id == self.owner_id and role != "owner":
            return False
        
        old_role = self.participants[user_id]["role"]
        self.participants[user_id]["role"] = role
        self.updated_at = int(time.time())
        
        # Create system event
        self._add_event("role_changed", {
            "user_id": user_id,
            "old_role": old_role,
            "new_role": role
        })
        
        return True
    
    def transfer_ownership(self, new_owner_id: str) -> bool:
        """Transfer session ownership
        
        Args:
            new_owner_id: New owner user identifier
            
        Returns:
            Success indicator
        """
        if new_owner_id not in self.participants:
            return False
        
        old_owner_id = self.owner_id
        self.owner_id = new_owner_id
        
        # Update roles
        self.participants[old_owner_id]["role"] = "editor"
        self.participants[new_owner_id]["role"] = "owner"
        
        self.updated_at = int(time.time())
        
        # Create system event
        self._add_event("ownership_transferred", {
            "old_owner_id": old_owner_id,
            "new_owner_id": new_owner_id
        })
        
        return True
    
    def add_message(self, user_id: str, content: str, 
                   message_type: str = "text") -> Dict[str, Any]:
        """Add chat message to session
        
        Args:
            user_id: User identifier
            content: Message content
            message_type: Message type (text, code, file, etc.)
            
        Returns:
            Message object
        """
        if user_id not in self.participants:
            return None
        
        message_id = str(uuid.uuid4())
        timestamp = int(time.time())
        
        message = {
            "id": message_id,
            "user_id": user_id,
            "content": content,
            "type": message_type,
            "timestamp": timestamp
        }
        
        self.messages.append(message)
        self.updated_at = timestamp
        
        # Push event to queue
        self._push_event("message", message)
        
        return message
    
    def update_cursor(self, user_id: str, position: Dict[str, Any]) -> bool:
        """Update user cursor position
        
        Args:
            user_id: User identifier
            position: Cursor position information
            
        Returns:
            Success indicator
        """
        if user_id not in self.participants:
            return False
        
        self.cursors[user_id] = {
            "position": position,
            "updated_at": int(time.time())
        }
        
        # Push event to queue
        self._push_event("cursor_update", {
            "user_id": user_id,
            "position": position
        })
        
        return True
    
    def update_shared_state(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update shared state
        
        Args:
            user_id: User identifier
            updates: Dictionary of state updates
            
        Returns:
            Success indicator
        """
        if user_id not in self.participants:
            return False
        
        # Check permissions
        role = self.participants[user_id]["role"]
        if role not in ["owner", "editor"]:
            return False
        
        # Apply updates
        for key, value in updates.items():
            self.shared_state[key] = value
        
        self.updated_at = int(time.time())
        
        # Push event to queue
        self._push_event("state_update", {
            "user_id": user_id,
            "updates": updates
        })
        
        return True
    
    def subscribe(self, subscriber_id: str, callback: Callable) -> bool:
        """Subscribe to session events
        
        Args:
            subscriber_id: Subscriber identifier
            callback: Callback function for events
            
        Returns:
            Success indicator
        """
        self.subscribers[subscriber_id] = callback
        return True
    
    def unsubscribe(self, subscriber_id: str) -> bool:
        """Unsubscribe from session events
        
        Args:
            subscriber_id: Subscriber identifier
            
        Returns:
            Success indicator
        """
        if subscriber_id in self.subscribers:
            del self.subscribers[subscriber_id]
            return True
        return False
    
    def close(self) -> bool:
        """Close collaboration session
        
        Returns:
            Success indicator
        """
        self.status = "closed"
        self.updated_at = int(time.time())
        
        # Create system event
        self._add_event("session_closed", {
            "closed_at": self.updated_at
        })
        
        # Notify all subscribers
        self._notify_subscribers({
            "type": "session_closed",
            "data": {
                "session_id": self.session_id,
                "closed_at": self.updated_at
            }
        })
        
        # Clear subscribers
        self.subscribers = {}
        
        return True
    
    # Private methods
    def _add_event(self, event_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add system event
        
        Args:
            event_type: Event type
            data: Event data
            
        Returns:
            Event object
        """
        event_id = str(uuid.uuid4())
        timestamp = int(time.time())
        
        event = {
            "id": event_id,
            "type": event_type,
            "data": data,
            "timestamp": timestamp
        }
        
        self.events.append(event)
        
        # Push event to queue
        self._push_event(event_type, data)
        
        return event
    
    def _push_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """Push event to queue
        
        Args:
            event_type: Event type
            data: Event data
        """
        event = {
            "type": event_type,
            "data": data,
            "timestamp": int(time.time())
        }
        
        # Add to queue
        self.event_queue.put(event)
        
        # Notify subscribers
        self._notify_subscribers(event)
    
    def _notify_subscribers(self, event: Dict[str, Any]) -> None:
        """Notify all subscribers
        
        Args:
            event: Event object
        """
        for subscriber_id, callback in list(self.subscribers.items()):
            try:
                callback(event)
            except Exception as e:
                logger.error(f"Error notifying subscriber {subscriber_id}: {str(e)}")
                # Remove failed subscriber
                self.unsubscribe(subscriber_id)

class CollaborationManager:
    def __init__(self):
        """Initialize collaboration manager"""
        self.storage = get_local_storage()
        self.active_sessions = {}
        self.load_active_sessions()
    
    def load_active_sessions(self) -> None:
        """Load active sessions from storage"""
        sessions_data = self.storage.get_namespace('collab_sessions')
        
        for session_id, session_data in sessions_data.items():
            # Only load active sessions
            if session_data.get('status') == 'active':
                # Create session object
                session = CollaborationSession(
                    session_id,
                    session_data['project_id'],
                    session_data['owner_id'],
                    session_data['name']
                )
                
                # Restore session state
                session.created_at = session_data['created_at']
                session.updated_at = session_data['updated_at']
                session.participants = session_data['participants']
                session.status = session_data['status']
                session.messages = session_data.get('messages', [])
                session.events = session_data.get('events', [])
                session.cursors = session_data.get('cursors', {})
                session.shared_state = session_data.get('shared_state', {})
                
                # Add to active sessions
                self.active_sessions[session_id] = session
        
        logger.info(f"Loaded {len(self.active_sessions)} active sessions")
    
    def save_session(self, session: CollaborationSession) -> bool:
        """Save session to storage
        
        Args:
            session: Collaboration session
            
        Returns:
            Success indicator
        """
        session_data = session.to_dict()
        return self.storage.set_value('collab_sessions', session.session_id, session_data)
    
    def create_session(self, project_id: str, owner_id: str, name: str) -> CollaborationSession:
        """Create a new collaboration session
        
        Args:
            project_id: Associated project identifier
            owner_id: User ID of session owner
            name: Session name
            
        Returns:
            Collaboration session
        """
        session_id = str(uuid.uuid4())
        session = CollaborationSession(session_id, project_id, owner_id, name)
        
        # Save session
        self.save_session(session)
        
        # Add to active sessions
        self.active_sessions[session_id] = session
        
        return session
    
    def get_session(self, session_id: str) -> Optional[CollaborationSession]:
        """Get collaboration session by ID
        
        Args:
            session_id: Session identifier
            
        Returns:
            Collaboration session or None if not found
        """
        # Check active sessions first
        if session_id in self.active_sessions:
            return self.active_sessions[session_id]
        
        # Try to load from storage
        session_data = self.storage.get_value('collab_sessions', session_id)
        if not session_data:
            return None
        
        # Create session object
        session = CollaborationSession(
            session_id,
            session_data['project_id'],
            session_data['owner_id'],
            session_data['name']
        )
        
        # Restore session state
        session.created_at = session_data['created_at']
        session.updated_at = session_data['updated_at']
        session.participants = session_data['participants']
        session.status = session_data['status']
        session.messages = session_data.get('messages', [])
        session.events = session_data.get('events', [])
        session.cursors = session_data.get('cursors', {})
        session.shared_state = session_data.get('shared_state', {})
        
        # Add to active sessions if still active
        if session.status == 'active':
            self.active_sessions[session_id] = session
        
        return session
    
    def get_project_sessions(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all sessions for a project
        
        Args:
            project_id: Project identifier
            
        Returns:
            List of session summaries
        """
        # Get all sessions from storage
        all_sessions = self.storage.get_namespace('collab_sessions')
        
        # Filter by project ID
        project_sessions = []
        for session_id, session_data in all_sessions.items():
            if session_data['project_id'] == project_id:
                # Create a summary
                summary = {
                    'id': session_id,
                    'name': session_data['name'],
                    'owner_id': session_data['owner_id'],
                    'created_at': session_data['created_at'],
                    'updated_at': session_data['updated_at'],
                    'status': session_data['status'],
                    'participant_count': len(session_data['participants'])
                }
                project_sessions.append(summary)
        
        # Sort by updated_at (most recent first)
        project_sessions.sort(key=lambda s: s['updated_at'], reverse=True)
        
        return project_sessions
    
    def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all sessions for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            List of session summaries
        """
        # Get all sessions from storage
        all_sessions = self.storage.get_namespace('collab_sessions')
        
        # Filter by user ID
        user_sessions = []
        for session_id, session_data in all_sessions.items():
            if user_id in session_data['participants']:
                # Create a summary
                summary = {
                    'id': session_id,
                    'name': session_data['name'],
                    'project_id': session_data['project_id'],
                    'owner_id': session_data['owner_id'],
                    'created_at': session_data['created_at'],
                    'updated_at': session_data['updated_at'],
                    'status': session_data['status'],
                    'participant_count': len(session_data['participants']),
                    'role': session_data['participants'][user_id]['role']
                }
                user_sessions.append(summary)
        
        # Sort by updated_at (most recent first)
        user_sessions.sort(key=lambda s: s['updated_at'], reverse=True)
        
        return user_sessions
    
    def join_session(self, session_id: str, user_id: str, role: str = "guest") -> Optional[CollaborationSession]:
        """Join a collaboration session
        
        Args:
            session_id: Session identifier
            user_id: User identifier
            role: Participant role
            
        Returns:
            Updated session or None if join failed
        """
        session = self.get_session(session_id)
        if not session or session.status != 'active':
            return None
        
        # Add participant
        success = session.add_participant(user_id, role)
        if success:
            # Save session
            self.save_session(session)
            return session
        
        return None
    
    def leave_session(self, session_id: str, user_id: str) -> bool:
        """Leave a collaboration session
        
        Args:
            session_id: Session identifier
            user_id: User identifier
            
        Returns:
            Success indicator
        """
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Remove participant
        success = session.remove_participant(user_id)
        if success:
            # Save session
            self.save_session(session)
            
            # If no participants left, close session
            if len(session.participants) == 0:
                self.close_session(session_id)
            
            return True
        
        return False
    
    def close_session(self, session_id: str) -> bool:
        """Close a collaboration session
        
        Args:
            session_id: Session identifier
            
        Returns:
            Success indicator
        """
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Close session
        success = session.close()
        if success:
            # Save session
            self.save_session(session)
            
            # Remove from active sessions
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            
            return True
        
        return False
    
    def send_message(self, session_id: str, user_id: str, content: str, 
                    message_type: str = "text") -> Optional[Dict[str, Any]]:
        """Send a message to a collaboration session
        
        Args:
            session_id: Session identifier
            user_id: User identifier
            content: Message content
            message_type: Message type
            
        Returns:
            Message object or None if send failed
        """
        session = self.get_session(session_id)
        if not session or session.status != 'active':
            return None
        
        # Add message
        message = session.add_message(user_id, content, message_type)
        if message:
            # Save session periodically (not on every message to avoid excessive writes)
            if len(session.messages) % 10 == 0:
                self.save_session(session)
            
            return message
        
        return None
    
    def update_cursor(self, session_id: str, user_id: str, 
                     position: Dict[str, Any]) -> bool:
        """Update user cursor position in a session
        
        Args:
            session_id: Session identifier
            user_id: User identifier
            position: Cursor position information
            
        Returns:
            Success indicator
        """
        session = self.get_session(session_id)
        if not session or session.status != 'active':
            return False
        
        # Update cursor
        return session.update_cursor(user_id, position)
    
    def update_shared_state(self, session_id: str, user_id: str, 
                           updates: Dict[str, Any]) -> bool:
        """Update shared state in a session
        
        Args:
            session_id: Session identifier
            user_id: User identifier
            updates: Dictionary of state updates
            
        Returns:
            Success indicator
        """
        session = self.get_session(session_id)
        if not session or session.status != 'active':
            return False
        
        # Update shared state
        success = session.update_shared_state(user_id, updates)
        if success:
            # Save session
            self.save_session(session)
            return True
        
        return False
    
    def start_event_stream(self, session_id: str, user_id: str, 
                          callback: Callable) -> Optional[str]:
        """Start event stream for a session
        
        Args:
            session_id: Session identifier
            user_id: User identifier
            callback: Callback function for events
            
        Returns:
            Subscriber ID or None if subscription failed
        """
        session = self.get_session(session_id)
        if not session or session.status != 'active' or user_id not in session.participants:
            return None
        
        # Generate subscriber ID
        subscriber_id = f"{user_id}_{str(uuid.uuid4())[:8]}"
        
        # Subscribe to session events
        success = session.subscribe(subscriber_id, callback)
        if success:
            return subscriber_id
        
        return None
    
    def stop_event_stream(self, session_id: str, subscriber_id: str) -> bool:
        """Stop event stream for a session
        
        Args:
            session_id: Session identifier
            subscriber_id: Subscriber identifier
            
        Returns:
            Success indicator
        """
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Unsubscribe from session events
        return session.unsubscribe(subscriber_id)
    
    def cleanup_inactive_sessions(self, max_age_days: int = 7) -> int:
        """Clean up inactive sessions
        
        Args:
            max_age_days: Maximum age in days for inactive sessions
            
        Returns:
            Number of sessions cleaned up
        """
        # Get all sessions from storage
        all_sessions = self.storage.get_namespace('collab_sessions')
        
        # Calculate cutoff timestamp
        cutoff = int(time.time()) - (max_age_days * 24 * 60 * 60)
        
        # Find inactive sessions
        inactive_sessions = []
        for session_id, session_data in all_sessions.items():
            if session_data['status'] == 'closed' and session_data['updated_at'] < cutoff:
                inactive_sessions.append(session_id)
        
        # Delete inactive sessions
        for session_id in inactive_sessions:
            self.storage.delete_value('collab_sessions', session_id)
            
            # Also remove from active sessions if present
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
        
        logger.info(f"Cleaned up {len(inactive_sessions)} inactive sessions")
        return len(inactive_sessions)

# Singleton instance
_collaboration_manager = None

def get_collaboration_manager() -> CollaborationManager:
    """Get the singleton collaboration manager instance"""
    global _collaboration_manager
    if _collaboration_manager is None:
        _collaboration_manager = CollaborationManager()
    return _collaboration_manager

# Flask SSE implementation for real-time events
class FlaskSSE:
    def __init__(self, app=None):
        """Initialize Flask SSE"""
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app"""
        self.app = app
        
        # Register route for event stream
        @app.route('/api/sse/session/<session_id>', methods=['GET'])
        def sse_stream(session_id):
            from flask import Response, request
            
            # Get user ID from request
            user_id = request.headers.get('X-User-ID')
            if not user_id:
                return Response('User ID required', status=401)
            
            # Create queue for this connection
            event_queue = queue.Queue()
            
            # Define callback for session events
            def on_event(event):
                event_queue.put(event)
            
            # Start event stream
            collab_manager = get_collaboration_manager()
            subscriber_id = collab_manager.start_event_stream(session_id, user_id, on_event)
            
            if not subscriber_id:
                return Response('Failed to subscribe to session events', status=400)
            
            # SSE response generator
            def generate():
                try:
                    # Send initial data
                    session = collab_manager.get_session(session_id)
                    if session:
                        yield f"data: {json.dumps({'type': 'init', 'data': session.to_dict()})}\n\n"
                    
                    # Send events as they happen
                    while True:
                        try:
                            event = event_queue.get(timeout=30)
                            yield f"data: {json.dumps(event)}\n\n"
                        except queue.Empty:
                            # Send keepalive comment
                            yield ": keepalive\n\n"
                
                finally:
                    # Clean up subscription when client disconnects
                    collab_manager.stop_event_stream(session_id, subscriber_id)
            
            return Response(generate(), mimetype='text/event-stream')