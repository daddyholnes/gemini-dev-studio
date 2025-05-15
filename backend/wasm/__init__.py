"""
WebAssembly runtime package for Podplay Build
"""
from .wasmer_integration import get_wasmer_runtime

__all__ = ['get_wasmer_runtime']