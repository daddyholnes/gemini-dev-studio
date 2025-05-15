"""
Local Storage Module for Podplay Build
Provides persistent storage when Firebase is unavailable
"""
import os
import json
import time
import sqlite3
import logging
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("local_storage")

class LocalStorage:
    def __init__(self, db_path: Optional[str] = None):
        """Initialize local storage with SQLite database
        
        Args:
            db_path: Path to SQLite database file, or None for default location
        """
        if db_path is None:
            # Use default location in user data directory
            data_dir = os.path.join(os.path.expanduser("~"), ".podplay")
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "podplay_data.db")
        
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self) -> None:
        """Initialize database schema if not exists"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create chat history table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    data TEXT NOT NULL,
                    UNIQUE(user_id, project_id, model_name)
                )
            ''')
            
            # Create projects table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    data TEXT NOT NULL,
                    UNIQUE(user_id, project_id)
                )
            ''')
            
            # Create settings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    UNIQUE(user_id, key)
                )
            ''')
            
            # Create general key-value store
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS key_value_store (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    namespace TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    UNIQUE(namespace, key)
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info(f"Database initialized: {self.db_path}")
        
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise
    
    # Chat history methods
    def save_chat_history(self, user_id: str, project_id: str, model_name: str, 
                         messages: List[Dict[str, Any]]) -> bool:
        """Save chat history for a user, project, and model
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            model_name: Model name
            messages: List of message objects
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            timestamp = int(time.time())
            data = json.dumps(messages)
            
            # Insert or replace (UPSERT)
            cursor.execute('''
                INSERT OR REPLACE INTO chat_history 
                (user_id, project_id, model_name, timestamp, data)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, project_id, model_name, timestamp, data))
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error saving chat history: {str(e)}")
            return False
    
    def load_chat_history(self, user_id: str, project_id: str, 
                         model_name: str) -> List[Dict[str, Any]]:
        """Load chat history for a user, project, and model
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            model_name: Model name
            
        Returns:
            List of message objects or empty list if not found
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT data FROM chat_history
                WHERE user_id = ? AND project_id = ? AND model_name = ?
            ''', (user_id, project_id, model_name))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return json.loads(row[0])
            else:
                return []
        
        except Exception as e:
            logger.error(f"Error loading chat history: {str(e)}")
            return []
    
    def delete_chat_history(self, user_id: str, project_id: str = None, 
                           model_name: str = None) -> bool:
        """Delete chat history for a user, optionally filtered by project and model
        
        Args:
            user_id: User identifier
            project_id: Optional project identifier for filtering
            model_name: Optional model name for filtering
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "DELETE FROM chat_history WHERE user_id = ?"
            params = [user_id]
            
            if project_id:
                query += " AND project_id = ?"
                params.append(project_id)
            
            if model_name:
                query += " AND model_name = ?"
                params.append(model_name)
            
            cursor.execute(query, params)
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error deleting chat history: {str(e)}")
            return False
    
    # Project management methods
    def save_project(self, user_id: str, project_id: str, name: str, 
                    description: str = None, data: Dict[str, Any] = None) -> bool:
        """Save project information
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            name: Project name
            description: Optional project description
            data: Optional project data dictionary
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            current_time = int(time.time())
            
            # Check if project exists
            cursor.execute('''
                SELECT created_at FROM projects
                WHERE user_id = ? AND project_id = ?
            ''', (user_id, project_id))
            
            row = cursor.fetchone()
            created_at = row[0] if row else current_time
            
            # Insert or replace (UPSERT)
            cursor.execute('''
                INSERT OR REPLACE INTO projects
                (user_id, project_id, name, description, created_at, updated_at, data)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, 
                project_id, 
                name, 
                description or "", 
                created_at, 
                current_time, 
                json.dumps(data or {})
            ))
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error saving project: {str(e)}")
            return False
    
    def get_project(self, user_id: str, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project information
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            
        Returns:
            Project dictionary or None if not found
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Return rows as dictionaries
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM projects
                WHERE user_id = ? AND project_id = ?
            ''', (user_id, project_id))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                project = dict(row)
                project['data'] = json.loads(project['data'])
                return project
            else:
                return None
        
        except Exception as e:
            logger.error(f"Error getting project: {str(e)}")
            return None
    
    def list_projects(self, user_id: str) -> List[Dict[str, Any]]:
        """List all projects for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            List of project dictionaries
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM projects
                WHERE user_id = ?
                ORDER BY updated_at DESC
            ''', (user_id,))
            
            rows = cursor.fetchall()
            conn.close()
            
            projects = []
            for row in rows:
                project = dict(row)
                project['data'] = json.loads(project['data'])
                projects.append(project)
            
            return projects
        
        except Exception as e:
            logger.error(f"Error listing projects: {str(e)}")
            return []
    
    def delete_project(self, user_id: str, project_id: str) -> bool:
        """Delete a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete project
            cursor.execute('''
                DELETE FROM projects
                WHERE user_id = ? AND project_id = ?
            ''', (user_id, project_id))
            
            # Delete associated chat history
            cursor.execute('''
                DELETE FROM chat_history
                WHERE user_id = ? AND project_id = ?
            ''', (user_id, project_id))
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error deleting project: {str(e)}")
            return False
    
    # Settings methods
    def save_setting(self, user_id: str, key: str, value: Any) -> bool:
        """Save a user setting
        
        Args:
            user_id: User identifier
            key: Setting key
            value: Setting value (will be JSON serialized)
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Serialize value
            if not isinstance(value, str):
                value = json.dumps(value)
            
            # Insert or replace (UPSERT)
            cursor.execute('''
                INSERT OR REPLACE INTO settings
                (user_id, key, value)
                VALUES (?, ?, ?)
            ''', (user_id, key, value))
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error saving setting: {str(e)}")
            return False
    
    def get_setting(self, user_id: str, key: str, default: Any = None) -> Any:
        """Get a user setting
        
        Args:
            user_id: User identifier
            key: Setting key
            default: Default value if setting not found
            
        Returns:
            Setting value (JSON deserialized if possible)
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT value FROM settings
                WHERE user_id = ? AND key = ?
            ''', (user_id, key))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                value = row[0]
                # Try to deserialize JSON
                try:
                    return json.loads(value)
                except:
                    return value
            else:
                return default
        
        except Exception as e:
            logger.error(f"Error getting setting: {str(e)}")
            return default
    
    def get_all_settings(self, user_id: str) -> Dict[str, Any]:
        """Get all settings for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary of settings
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT key, value FROM settings
                WHERE user_id = ?
            ''', (user_id,))
            
            rows = cursor.fetchall()
            conn.close()
            
            settings = {}
            for key, value in rows:
                # Try to deserialize JSON
                try:
                    settings[key] = json.loads(value)
                except:
                    settings[key] = value
            
            return settings
        
        except Exception as e:
            logger.error(f"Error getting all settings: {str(e)}")
            return {}
    
    def delete_setting(self, user_id: str, key: str) -> bool:
        """Delete a user setting
        
        Args:
            user_id: User identifier
            key: Setting key
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM settings
                WHERE user_id = ? AND key = ?
            ''', (user_id, key))
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error deleting setting: {str(e)}")
            return False
    
    # Key-value store methods
    def set_value(self, namespace: str, key: str, value: Any) -> bool:
        """Set a value in the key-value store
        
        Args:
            namespace: Namespace for categorizing keys
            key: Key name
            value: Value to store (will be JSON serialized)
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Serialize value
            if not isinstance(value, str):
                value = json.dumps(value)
            
            timestamp = int(time.time())
            
            # Insert or replace (UPSERT)
            cursor.execute('''
                INSERT OR REPLACE INTO key_value_store
                (namespace, key, value, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (namespace, key, value, timestamp))
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error setting key-value pair: {str(e)}")
            return False
    
    def get_value(self, namespace: str, key: str, default: Any = None) -> Any:
        """Get a value from the key-value store
        
        Args:
            namespace: Namespace for categorizing keys
            key: Key name
            default: Default value if key not found
            
        Returns:
            Value (JSON deserialized if possible)
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT value FROM key_value_store
                WHERE namespace = ? AND key = ?
            ''', (namespace, key))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                value = row[0]
                # Try to deserialize JSON
                try:
                    return json.loads(value)
                except:
                    return value
            else:
                return default
        
        except Exception as e:
            logger.error(f"Error getting key-value pair: {str(e)}")
            return default
    
    def get_namespace(self, namespace: str) -> Dict[str, Any]:
        """Get all key-value pairs in a namespace
        
        Args:
            namespace: Namespace to retrieve
            
        Returns:
            Dictionary of key-value pairs
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT key, value FROM key_value_store
                WHERE namespace = ?
            ''', (namespace,))
            
            rows = cursor.fetchall()
            conn.close()
            
            result = {}
            for key, value in rows:
                # Try to deserialize JSON
                try:
                    result[key] = json.loads(value)
                except:
                    result[key] = value
            
            return result
        
        except Exception as e:
            logger.error(f"Error getting namespace: {str(e)}")
            return {}
    
    def delete_value(self, namespace: str, key: str) -> bool:
        """Delete a value from the key-value store
        
        Args:
            namespace: Namespace for categorizing keys
            key: Key name
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM key_value_store
                WHERE namespace = ? AND key = ?
            ''', (namespace, key))
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error deleting key-value pair: {str(e)}")
            return False
    
    def clear_namespace(self, namespace: str) -> bool:
        """Clear all key-value pairs in a namespace
        
        Args:
            namespace: Namespace to clear
            
        Returns:
            Success indicator
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM key_value_store
                WHERE namespace = ?
            ''', (namespace,))
            
            conn.commit()
            conn.close()
            return True
        
        except Exception as e:
            logger.error(f"Error clearing namespace: {str(e)}")
            return False

# Singleton instance
_local_storage = None

def get_local_storage() -> LocalStorage:
    """Get the singleton local storage instance"""
    global _local_storage
    if _local_storage is None:
        _local_storage = LocalStorage()
    return _local_storage