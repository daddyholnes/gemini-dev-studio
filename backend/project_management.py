"""
Project Management Module for Podplay Build
Enables tracking of projects, tasks, milestones, and deadlines
"""
import os
import json
import time
import uuid
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta

# Import local storage for persistence
from local_storage import get_local_storage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("project_management")

class ProjectManager:
    def __init__(self):
        """Initialize project manager with local storage"""
        self.storage = get_local_storage()
    
    # Project methods
    def create_project(self, user_id: str, name: str, description: str = "", 
                      tech_stack: List[str] = None, icon: str = None) -> Dict[str, Any]:
        """Create a new project
        
        Args:
            user_id: User identifier
            name: Project name
            description: Project description
            tech_stack: List of technologies used
            icon: Icon identifier
            
        Returns:
            Project object with ID
        """
        # Generate project ID (slugified name + unique identifier)
        project_id = self._slugify(name) + "-" + str(uuid.uuid4())[:8]
        
        # Create project object
        project = {
            "id": project_id,
            "name": name,
            "description": description,
            "tech_stack": tech_stack or [],
            "icon": icon or "default",
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
            "tasks": [],
            "milestones": [],
            "members": [user_id],
            "status": "active"
        }
        
        # Save to storage
        self.storage.save_project(user_id, project_id, name, description, project)
        
        return project
    
    def get_project(self, user_id: str, project_id: str) -> Optional[Dict[str, Any]]:
        """Get a project by ID
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            
        Returns:
            Project object or None if not found
        """
        project = self.storage.get_project(user_id, project_id)
        if project:
            return project.get('data', {})
        return None
    
    def update_project(self, user_id: str, project_id: str, 
                      updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update project properties
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            updates: Dictionary of properties to update
            
        Returns:
            Updated project object or None if update failed
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return None
        
        # Apply updates
        for key, value in updates.items():
            if key not in ['id', 'created_at']:  # Don't allow changing these
                project[key] = value
        
        # Update timestamp
        project['updated_at'] = int(time.time())
        
        # Save to storage
        success = self.storage.save_project(
            user_id, 
            project_id, 
            project['name'], 
            project['description'], 
            project
        )
        
        return project if success else None
    
    def delete_project(self, user_id: str, project_id: str) -> bool:
        """Delete a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            
        Returns:
            Success indicator
        """
        return self.storage.delete_project(user_id, project_id)
    
    def list_projects(self, user_id: str) -> List[Dict[str, Any]]:
        """List all projects for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            List of project objects
        """
        projects = self.storage.list_projects(user_id)
        return [project.get('data', {}) for project in projects]
    
    # Task methods
    def add_task(self, user_id: str, project_id: str, title: str, 
                description: str = "", due_date: Optional[int] = None, 
                priority: str = "medium", assignee: Optional[str] = None,
                tags: List[str] = None) -> Optional[Dict[str, Any]]:
        """Add a task to a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            title: Task title
            description: Task description
            due_date: Due date timestamp (optional)
            priority: Priority level (low, medium, high, critical)
            assignee: User assigned to the task (optional)
            tags: List of tags (optional)
            
        Returns:
            Updated project object or None if update failed
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return None
        
        # Generate task ID
        task_id = str(uuid.uuid4())
        
        # Create task object
        task = {
            "id": task_id,
            "title": title,
            "description": description,
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
            "due_date": due_date,
            "priority": priority,
            "status": "todo",
            "assignee": assignee or user_id,
            "creator": user_id,
            "tags": tags or [],
            "comments": []
        }
        
        # Add to project tasks
        project['tasks'].append(task)
        project['updated_at'] = int(time.time())
        
        # Save to storage
        success = self.storage.save_project(
            user_id, 
            project_id, 
            project['name'], 
            project['description'], 
            project
        )
        
        return project if success else None
    
    def update_task(self, user_id: str, project_id: str, task_id: str,
                   updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a task in a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            task_id: Task identifier
            updates: Dictionary of properties to update
            
        Returns:
            Updated project object or None if update failed
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return None
        
        # Find task
        for i, task in enumerate(project['tasks']):
            if task['id'] == task_id:
                # Apply updates
                for key, value in updates.items():
                    if key not in ['id', 'created_at']:  # Don't allow changing these
                        task[key] = value
                
                # Update timestamp
                task['updated_at'] = int(time.time())
                project['tasks'][i] = task
                project['updated_at'] = int(time.time())
                
                # Save to storage
                success = self.storage.save_project(
                    user_id, 
                    project_id, 
                    project['name'], 
                    project['description'], 
                    project
                )
                
                return project if success else None
        
        # Task not found
        return None
    
    def delete_task(self, user_id: str, project_id: str, task_id: str) -> Optional[Dict[str, Any]]:
        """Delete a task from a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            task_id: Task identifier
            
        Returns:
            Updated project object or None if update failed
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return None
        
        # Find and remove task
        project['tasks'] = [task for task in project['tasks'] if task['id'] != task_id]
        project['updated_at'] = int(time.time())
        
        # Save to storage
        success = self.storage.save_project(
            user_id, 
            project_id, 
            project['name'], 
            project['description'], 
            project
        )
        
        return project if success else None
    
    def add_task_comment(self, user_id: str, project_id: str, task_id: str,
                        comment: str) -> Optional[Dict[str, Any]]:
        """Add a comment to a task
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            task_id: Task identifier
            comment: Comment text
            
        Returns:
            Updated project object or None if update failed
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return None
        
        # Find task
        for i, task in enumerate(project['tasks']):
            if task['id'] == task_id:
                # Create comment object
                comment_obj = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "content": comment,
                    "created_at": int(time.time())
                }
                
                # Add comment to task
                if 'comments' not in task:
                    task['comments'] = []
                
                task['comments'].append(comment_obj)
                task['updated_at'] = int(time.time())
                project['tasks'][i] = task
                project['updated_at'] = int(time.time())
                
                # Save to storage
                success = self.storage.save_project(
                    user_id, 
                    project_id, 
                    project['name'], 
                    project['description'], 
                    project
                )
                
                return project if success else None
        
        # Task not found
        return None
    
    # Milestone methods
    def add_milestone(self, user_id: str, project_id: str, title: str,
                     description: str = "", due_date: Optional[int] = None,
                     color: str = "#6366F1") -> Optional[Dict[str, Any]]:
        """Add a milestone to a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            title: Milestone title
            description: Milestone description
            due_date: Due date timestamp (optional)
            color: Color code for the milestone
            
        Returns:
            Updated project object or None if update failed
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return None
        
        # Generate milestone ID
        milestone_id = str(uuid.uuid4())
        
        # Create milestone object
        milestone = {
            "id": milestone_id,
            "title": title,
            "description": description,
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
            "due_date": due_date,
            "color": color,
            "status": "pending",
            "completed_at": None
        }
        
        # Add to project milestones
        project['milestones'].append(milestone)
        project['updated_at'] = int(time.time())
        
        # Save to storage
        success = self.storage.save_project(
            user_id, 
            project_id, 
            project['name'], 
            project['description'], 
            project
        )
        
        return project if success else None
    
    def update_milestone(self, user_id: str, project_id: str, milestone_id: str,
                        updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a milestone in a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            milestone_id: Milestone identifier
            updates: Dictionary of properties to update
            
        Returns:
            Updated project object or None if update failed
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return None
        
        # Find milestone
        for i, milestone in enumerate(project['milestones']):
            if milestone['id'] == milestone_id:
                # Apply updates
                for key, value in updates.items():
                    if key not in ['id', 'created_at']:  # Don't allow changing these
                        milestone[key] = value
                
                # Update timestamp
                milestone['updated_at'] = int(time.time())
                
                # If status changed to completed, set completed_at
                if 'status' in updates and updates['status'] == 'completed' and not milestone.get('completed_at'):
                    milestone['completed_at'] = int(time.time())
                
                project['milestones'][i] = milestone
                project['updated_at'] = int(time.time())
                
                # Save to storage
                success = self.storage.save_project(
                    user_id, 
                    project_id, 
                    project['name'], 
                    project['description'], 
                    project
                )
                
                return project if success else None
        
        # Milestone not found
        return None
    
    def delete_milestone(self, user_id: str, project_id: str, 
                        milestone_id: str) -> Optional[Dict[str, Any]]:
        """Delete a milestone from a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            milestone_id: Milestone identifier
            
        Returns:
            Updated project object or None if update failed
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return None
        
        # Find and remove milestone
        project['milestones'] = [m for m in project['milestones'] if m['id'] != milestone_id]
        project['updated_at'] = int(time.time())
        
        # Save to storage
        success = self.storage.save_project(
            user_id, 
            project_id, 
            project['name'], 
            project['description'], 
            project
        )
        
        return project if success else None
    
    # Helper methods
    def _slugify(self, text: str) -> str:
        """Convert text to slug format
        
        Args:
            text: Text to convert
            
        Returns:
            Slugified text
        """
        # Convert to lowercase
        text = text.lower()
        
        # Replace spaces with hyphens
        text = text.replace(" ", "-")
        
        # Remove special characters
        import re
        text = re.sub(r'[^a-z0-9\-]', '', text)
        
        # Remove multiple consecutive hyphens
        text = re.sub(r'-+', '-', text)
        
        # Trim hyphens from start and end
        text = text.strip('-')
        
        return text
    
    def get_project_stats(self, user_id: str, project_id: str) -> Dict[str, Any]:
        """Get statistics for a project
        
        Args:
            user_id: User identifier
            project_id: Project identifier
            
        Returns:
            Dictionary of project statistics
        """
        project = self.get_project(user_id, project_id)
        if not project:
            return {}
        
        # Calculate statistics
        total_tasks = len(project['tasks'])
        completed_tasks = sum(1 for task in project['tasks'] if task['status'] == 'done')
        total_milestones = len(project['milestones'])
        completed_milestones = sum(1 for m in project['milestones'] if m['status'] == 'completed')
        
        # Calculate completion percentage
        completion = 0
        if total_tasks > 0:
            completion = round((completed_tasks / total_tasks) * 100)
        
        # Calculate overdue items
        now = int(time.time())
        overdue_tasks = sum(1 for task in project['tasks'] 
                           if task['status'] != 'done' 
                           and task.get('due_date') 
                           and task['due_date'] < now)
        
        overdue_milestones = sum(1 for m in project['milestones'] 
                                if m['status'] != 'completed' 
                                and m.get('due_date') 
                                and m['due_date'] < now)
        
        # Calculate upcoming deadlines (next 7 days)
        next_week = now + (7 * 24 * 60 * 60)
        upcoming_tasks = sum(1 for task in project['tasks'] 
                            if task['status'] != 'done' 
                            and task.get('due_date') 
                            and now <= task['due_date'] < next_week)
        
        upcoming_milestones = sum(1 for m in project['milestones'] 
                                 if m['status'] != 'completed' 
                                 and m.get('due_date') 
                                 and now <= m['due_date'] < next_week)
        
        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "total_milestones": total_milestones,
            "completed_milestones": completed_milestones,
            "completion_percentage": completion,
            "overdue_tasks": overdue_tasks,
            "overdue_milestones": overdue_milestones,
            "upcoming_tasks": upcoming_tasks,
            "upcoming_milestones": upcoming_milestones,
            "last_updated": project['updated_at'],
            "created": project['created_at']
        }
    
    def get_all_project_stats(self, user_id: str) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all projects of a user
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary mapping project IDs to their statistics
        """
        projects = self.list_projects(user_id)
        
        stats = {}
        for project in projects:
            project_id = project['id']
            stats[project_id] = self.get_project_stats(user_id, project_id)
        
        return stats

# Singleton instance
_project_manager = None

def get_project_manager() -> ProjectManager:
    """Get the singleton project manager instance"""
    global _project_manager
    if _project_manager is None:
        _project_manager = ProjectManager()
    return _project_manager