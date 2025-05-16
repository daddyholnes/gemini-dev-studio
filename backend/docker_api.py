"""
Docker API for MCP

Provides HTTP endpoints for Docker container management.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
import logging

from .docker_service import DockerService

logger = logging.getLogger('docker_api')
router = APIRouter()

# Initialize Docker service
try:
    docker_service = DockerService()
    logger.info("Docker service initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Docker service: {e}")
    docker_service = None

@router.get("/status")
async def get_status():
    """Get Docker service status"""
    try:
        if not docker_service:
            raise HTTPException(status_code=500, detail="Docker service not available")
        
        return {
            "status": "available",
            "docker_version": docker_service.client.version()
        }
    except Exception as e:
        logger.error(f"Error getting Docker status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/images/search")
async def search_images(term: str, limit: int = 10):
    """Search for Docker images"""
    try:
        if not docker_service:
            raise HTTPException(status_code=500, detail="Docker service not available")
        
        results = docker_service.search_images(term, limit)
        return {"results": results}
    except Exception as e:
        logger.error(f"Error searching images: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/images/pull")
async def pull_image(image: str, tag: str = 'latest'):
    """Pull a Docker image"""
    try:
        if not docker_service:
            raise HTTPException(status_code=500, detail="Docker service not available")
        
        result = docker_service.pull_image(image, tag)
        return result
    except Exception as e:
        logger.error(f"Error pulling image {image}:{tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/containers/run")
async def run_container(
    image: str,
    command: Optional[str] = None,
    ports: Optional[Dict[str, str]] = None,
    volumes: Optional[Dict[str, Dict[str, str]]] = None,
    environment: Optional[Dict[str, str]] = None,
    detach: bool = True
):
    """Run a Docker container"""
    try:
        if not docker_service:
            raise HTTPException(status_code=500, detail="Docker service not available")
        
        result = docker_service.run_container(
            image=image,
            command=command,
            ports=ports or {},
            volumes=volumes or {},
            environment=environment or {},
            detach=detach
        )
        return result
    except Exception as e:
        logger.error(f"Error running container {image}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/containers")
async def list_containers(all: bool = False):
    """List Docker containers"""
    try:
        if not docker_service:
            raise HTTPException(status_code=500, detail="Docker service not available")
        
        containers = docker_service.list_containers(all=all)
        return {"containers": containers}
    except Exception as e:
        logger.error(f"Error listing containers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/containers/{container_id}/stop")
async def stop_container(container_id: str):
    """Stop a running container"""
    try:
        if not docker_service:
            raise HTTPException(status_code=500, detail="Docker service not available")
        
        result = docker_service.stop_container(container_id)
        return result
    except Exception as e:
        logger.error(f"Error stopping container {container_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
