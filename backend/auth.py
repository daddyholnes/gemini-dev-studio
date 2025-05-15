"""
Authentication Module for Podplay Build
Handles user authentication, authorization, and session management
"""
import os
import time
import json
import uuid
import logging
import secrets
import hashlib
import jwt
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from flask import request, jsonify, redirect, url_for, session
from urllib.parse import urlencode, quote_plus

# Import local storage for user data
from local_storage import get_local_storage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("auth")

class AuthManager:
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize authentication manager
        
        Args:
            config: Optional configuration dictionary
        """
        self.storage = get_local_storage()
        self.config = config or {}
        
        # JWT settings
        self.jwt_secret = self.config.get('jwt_secret') or os.environ.get('JWT_SECRET') or secrets.token_hex(32)
        self.jwt_algorithm = 'HS256'
        self.jwt_expiry = int(self.config.get('jwt_expiry', 86400))  # 24 hours
        
        # OAuth providers
        self.oauth_providers = {
            'github': {
                'name': 'GitHub',
                'client_id': os.environ.get('GITHUB_CLIENT_ID', ''),
                'client_secret': os.environ.get('GITHUB_CLIENT_SECRET', ''),
                'authorize_url': 'https://github.com/login/oauth/authorize',
                'token_url': 'https://github.com/login/oauth/access_token',
                'user_info_url': 'https://api.github.com/user',
                'scope': 'read:user user:email',
                'user_parser': self._parse_github_user
            },
            'google': {
                'name': 'Google',
                'client_id': os.environ.get('GOOGLE_CLIENT_ID', ''),
                'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET', ''),
                'authorize_url': 'https://accounts.google.com/o/oauth2/v2/auth',
                'token_url': 'https://oauth2.googleapis.com/token',
                'user_info_url': 'https://www.googleapis.com/oauth2/v3/userinfo',
                'scope': 'profile email',
                'user_parser': self._parse_google_user
            }
        }
    
    # User management methods
    def create_user(self, email: str, password: str = None, 
                  name: str = None, provider: str = None,
                  provider_id: str = None) -> Optional[Dict[str, Any]]:
        """Create a new user
        
        Args:
            email: User email address
            password: Password (optional if using OAuth)
            name: User name
            provider: OAuth provider name
            provider_id: OAuth provider user ID
            
        Returns:
            User object or None if creation failed
        """
        # Check if user already exists
        existing_user = self.get_user_by_email(email)
        if existing_user:
            return None
        
        # Generate user ID
        user_id = str(uuid.uuid4())
        
        # Hash password if provided
        password_hash = None
        if password:
            password_hash = self._hash_password(password)
        
        # Create user object
        user = {
            'id': user_id,
            'email': email,
            'name': name or email.split('@')[0],
            'password_hash': password_hash,
            'created_at': int(time.time()),
            'updated_at': int(time.time()),
            'active': True,
            'role': 'user',
            'oauth_providers': {}
        }
        
        # Add OAuth provider if specified
        if provider and provider_id:
            user['oauth_providers'][provider] = {
                'id': provider_id,
                'connected_at': int(time.time())
            }
        
        # Save to storage
        success = self.storage.set_value('users', user_id, user)
        if success:
            # Also index by email for quick lookup
            self.storage.set_value('user_emails', email, user_id)
            return user
        
        return None
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID
        
        Args:
            user_id: User identifier
            
        Returns:
            User object or None if not found
        """
        user = self.storage.get_value('users', user_id)
        
        # Remove sensitive information
        if user and 'password_hash' in user:
            user = user.copy()
            user.pop('password_hash', None)
        
        return user
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email address
        
        Args:
            email: User email address
            
        Returns:
            User object or None if not found
        """
        user_id = self.storage.get_value('user_emails', email)
        if user_id:
            return self.get_user(user_id)
        return None
    
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user properties
        
        Args:
            user_id: User identifier
            updates: Dictionary of properties to update
            
        Returns:
            Updated user object or None if update failed
        """
        user = self.storage.get_value('users', user_id)
        if not user:
            return None
        
        # Apply updates
        for key, value in updates.items():
            if key not in ['id', 'created_at', 'password_hash']:  # Don't allow changing these
                user[key] = value
        
        # Update timestamp
        user['updated_at'] = int(time.time())
        
        # Save to storage
        success = self.storage.set_value('users', user_id, user)
        if success:
            # Remove sensitive information for return value
            if 'password_hash' in user:
                user = user.copy()
                user.pop('password_hash', None)
            return user
        
        return None
    
    def delete_user(self, user_id: str) -> bool:
        """Delete a user
        
        Args:
            user_id: User identifier
            
        Returns:
            Success indicator
        """
        user = self.storage.get_value('users', user_id)
        if not user:
            return False
        
        # Remove email index
        self.storage.delete_value('user_emails', user['email'])
        
        # Remove user
        return self.storage.delete_value('users', user_id)
    
    def change_password(self, user_id: str, new_password: str) -> bool:
        """Change user password
        
        Args:
            user_id: User identifier
            new_password: New password
            
        Returns:
            Success indicator
        """
        user = self.storage.get_value('users', user_id)
        if not user:
            return False
        
        # Hash new password
        user['password_hash'] = self._hash_password(new_password)
        user['updated_at'] = int(time.time())
        
        # Save to storage
        return self.storage.set_value('users', user_id, user)
    
    # Authentication methods
    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password
        
        Args:
            email: User email address
            password: User password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user_id = self.storage.get_value('user_emails', email)
        if not user_id:
            return None
        
        user = self.storage.get_value('users', user_id)
        if not user:
            return None
        
        # Check password
        if not user.get('password_hash') or not self._verify_password(password, user['password_hash']):
            return None
        
        # Check if user is active
        if not user.get('active', True):
            return None
        
        # Remove sensitive information
        if 'password_hash' in user:
            user = user.copy()
            user.pop('password_hash', None)
        
        return user
    
    def generate_token(self, user_id: str) -> str:
        """Generate JWT token for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            JWT token string
        """
        payload = {
            'sub': user_id,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(seconds=self.jwt_expiry)
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def verify_token(self, token: str) -> Optional[str]:
        """Verify JWT token and extract user ID
        
        Args:
            token: JWT token string
            
        Returns:
            User ID if token is valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload['sub']
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None
    
    # OAuth methods
    def get_oauth_url(self, provider: str, redirect_uri: str, state: str = None) -> Optional[str]:
        """Get OAuth authorization URL
        
        Args:
            provider: OAuth provider name
            redirect_uri: Redirect URI after authorization
            state: Optional state parameter for security
            
        Returns:
            Authorization URL or None if provider not configured
        """
        if provider not in self.oauth_providers:
            return None
        
        provider_config = self.oauth_providers[provider]
        if not provider_config.get('client_id'):
            logger.warning(f"OAuth provider {provider} not properly configured")
            return None
        
        # Generate state if not provided
        if not state:
            state = secrets.token_hex(16)
        
        # Build authorization URL
        params = {
            'client_id': provider_config['client_id'],
            'redirect_uri': redirect_uri,
            'scope': provider_config['scope'],
            'response_type': 'code',
            'state': state
        }
        
        auth_url = f"{provider_config['authorize_url']}?{urlencode(params)}"
        return auth_url
    
    def handle_oauth_callback(self, provider: str, code: str, redirect_uri: str) -> Optional[Dict[str, Any]]:
        """Handle OAuth callback and authenticate user
        
        Args:
            provider: OAuth provider name
            code: Authorization code
            redirect_uri: Redirect URI (must match the one used in authorization request)
            
        Returns:
            User object if authentication successful, None otherwise
        """
        if provider not in self.oauth_providers:
            return None
        
        provider_config = self.oauth_providers[provider]
        
        try:
            # Exchange code for access token
            import requests
            
            token_data = {
                'client_id': provider_config['client_id'],
                'client_secret': provider_config['client_secret'],
                'code': code,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code'
            }
            
            headers = {'Accept': 'application/json'}
            
            token_response = requests.post(provider_config['token_url'], 
                                         data=token_data, 
                                         headers=headers)
            
            if token_response.status_code != 200:
                logger.error(f"OAuth token error: {token_response.text}")
                return None
            
            token_info = token_response.json()
            access_token = token_info.get('access_token')
            
            if not access_token:
                logger.error("No access token in OAuth response")
                return None
            
            # Get user information
            user_info_headers = {
                'Authorization': f"Bearer {access_token}",
                'Accept': 'application/json'
            }
            
            user_response = requests.get(provider_config['user_info_url'], 
                                       headers=user_info_headers)
            
            if user_response.status_code != 200:
                logger.error(f"OAuth user info error: {user_response.text}")
                return None
            
            user_info = user_response.json()
            
            # Parse user information based on provider
            parsed_user = provider_config['user_parser'](user_info)
            
            if not parsed_user or 'email' not in parsed_user:
                logger.error(f"Could not parse OAuth user info: {user_info}")
                return None
            
            # Check if user exists
            existing_user = self.get_user_by_email(parsed_user['email'])
            
            if existing_user:
                # Update OAuth provider information
                if 'oauth_providers' not in existing_user:
                    existing_user['oauth_providers'] = {}
                
                existing_user['oauth_providers'][provider] = {
                    'id': parsed_user['provider_id'],
                    'connected_at': int(time.time())
                }
                
                # Update user
                return self.update_user(existing_user['id'], {
                    'oauth_providers': existing_user['oauth_providers'],
                    'last_login': int(time.time())
                })
            else:
                # Create new user
                return self.create_user(
                    email=parsed_user['email'],
                    name=parsed_user['name'],
                    provider=provider,
                    provider_id=parsed_user['provider_id']
                )
        
        except Exception as e:
            logger.error(f"OAuth error: {str(e)}")
            return None
    
    # Helper methods
    def _hash_password(self, password: str) -> str:
        """Hash password using PBKDF2 with SHA-256
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
        """
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return f"{salt.hex()}:{key.hex()}"
    
    def _verify_password(self, password: str, stored_hash: str) -> bool:
        """Verify password against stored hash
        
        Args:
            password: Plain text password
            stored_hash: Stored password hash
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            salt_hex, key_hex = stored_hash.split(':')
            salt = bytes.fromhex(salt_hex)
            key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
            return key.hex() == key_hex
        except:
            return False
    
    def _parse_github_user(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Parse GitHub user information
        
        Args:
            user_info: User information from GitHub API
            
        Returns:
            Standardized user information
        """
        email = user_info.get('email')
        
        # GitHub might not provide email if it's private
        if not email:
            # Make a separate request to get email
            import requests
            headers = {'Authorization': f"token {user_info.get('access_token')}"}
            email_response = requests.get('https://api.github.com/user/emails', headers=headers)
            
            if email_response.status_code == 200:
                emails = email_response.json()
                primary_emails = [e for e in emails if e.get('primary') and e.get('verified')]
                if primary_emails:
                    email = primary_emails[0]['email']
                elif emails:
                    email = emails[0]['email']
        
        if not email:
            # Last resort: create a placeholder email
            email = f"{user_info.get('login')}@github.example.com"
        
        return {
            'provider_id': str(user_info.get('id')),
            'email': email,
            'name': user_info.get('name') or user_info.get('login')
        }
    
    def _parse_google_user(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Google user information
        
        Args:
            user_info: User information from Google API
            
        Returns:
            Standardized user information
        """
        return {
            'provider_id': user_info.get('sub'),
            'email': user_info.get('email'),
            'name': user_info.get('name') or user_info.get('email').split('@')[0]
        }

# Singleton instance
_auth_manager = None

def get_auth_manager() -> AuthManager:
    """Get the singleton authentication manager instance"""
    global _auth_manager
    if _auth_manager is None:
        _auth_manager = AuthManager()
    return _auth_manager

# Flask authentication middleware
def auth_required(f):
    """Decorator for Flask routes that require authentication"""
    import functools
    
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        
        token = auth_header.split(' ')[1]
        auth_manager = get_auth_manager()
        user_id = auth_manager.verify_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = auth_manager.get_user(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        # Add user to request context
        request.user = user
        request.user_id = user_id
        
        return f(*args, **kwargs)
    
    return decorated