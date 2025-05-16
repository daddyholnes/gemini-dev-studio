"""
Docker Service for MCP

Provides Docker container management capabilities to MCP servers.
"""
import os
import json
import logging
import docker
from typing import Dict, List, Optional, Any

logger = logging.getLogger('docker_service')

class DockerService:
    """Service for managing Docker containers and images."""
    
    def __init__(self, docker_socket: str = None):
        """Initialize the Docker service.
        
        Args:
            docker_socket: Path to the Docker socket (default: None for default socket)
        """
        try:
            self.client = docker.DockerClient(base_url=docker_socket) if docker_socket else docker.from_env()
            self.client.ping()  # Test connection
            logger.info("Docker service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise
    
    def search_images(self, term: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for Docker images.
        
        Args:
            term: Search term
            limit: Maximum number of results to return
            
        Returns:
            List of matching images with name, description, and other metadata
        """
        try:
            results = self.client.images.search(term, limit=limit)
            return [{
                'name': img['name'],
                'description': img.get('description', ''),
                'stars': img.get('star_count', 0),
                'official': img.get('is_official', False),
                'automated': img.get('is_automated', False)
            } for img in results]
        except Exception as e:
            logger.error(f"Error searching images: {e}")
            raise
    
    def pull_image(self, image_name: str, tag: str = 'latest') -> Dict[str, Any]:
        """Pull a Docker image.
        
        Args:
            image_name: Name of the image to pull
            tag: Image tag (default: 'latest')
            
        Returns:
            Status and details of the pull operation
        """
        try:
            full_name = f"{image_name}:{tag}" if ':' not in image_name else image_name
            image = self.client.images.pull(full_name)
            return {
                'status': 'success',
                'image_id': image.id,
                'tags': image.tags,
                'size': image.attrs['Size']
            }
        except Exception as e:
            logger.error(f"Error pulling image {image_name}:{tag}: {e}")
            raise
    
    def run_container(self, image: str, command: str = None, 
                      ports: Dict[str, str] = None, 
                      volumes: Dict[str, Dict[str, str]] = None,
                      environment: Dict[str, str] = None,
                      detach: bool = True) -> Dict[str, Any]:
        """Run a Docker container.
        
        Args:
            image: Name of the image to run
            command: Command to run in the container
            ports: Port mappings (host_port: container_port)
            volumes: Volume mappings
            environment: Environment variables
            detach: Whether to run in detached mode
            
        Returns:
            Container information and status
        """
        try:
            container = self.client.containers.run(
                image=image,
                command=command,
                ports=ports or {},
                volumes=volumes or {},
                environment=environment or {},
                detach=detach
            )
            
            return {
                'status': 'running' if detach else 'completed',
                'container_id': container.id,
                'name': container.name,
                'image': image
            }
        except Exception as e:
            logger.error(f"Error running container {image}: {e}")
            raise
    
    def list_containers(self, all: bool = False) -> List[Dict[str, Any]]:
        """List Docker containers.
        
        Args:
            all: Whether to show all containers (including stopped ones)
            
        Returns:
            List of containers with their details
        """
        try:
            containers = self.client.containers.list(all=all)
            return [{
                'id': c.short_id,
                'name': c.name,
                'image': c.image.tags[0] if c.image.tags else c.image.id,
                'status': c.status,
                'ports': c.ports,
                'created': c.attrs['Created']
            } for c in containers]
        except Exception as e:
            logger.error(f"Error listing containers: {e}")
            raise
    
    def stop_container(self, container_id: str) -> Dict[str, Any]:
        """Stop a running container.
        
        Args:
            container_id: ID of the container to stop
            
        Returns:
            Status of the operation
        """
        try:
            container = self.client.containers.get(container_id)
            container.stop()
            return {
                'status': 'stopped',
                'container_id': container_id,
                'name': container.name
            }
        except Exception as e:
            logger.error(f"Error stopping container {container_id}: {e}")
            raise
