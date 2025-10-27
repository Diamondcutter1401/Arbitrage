import os
import yaml
from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class Config:
    chains: Dict[str, Any]
    strategy: Dict[str, Any]

def load_config() -> Config:
    """Load configuration from YAML files and resolve environment variables."""
    with open("config/chains.yaml") as f:
        chains = yaml.safe_load(f)
    with open("config/strategy.yaml") as f:
        strategy = yaml.safe_load(f)
    
    # Resolve environment variables like ${BASE_RPC}
    def resolve_env(obj):
        if isinstance(obj, str) and obj.startswith("${") and obj.endswith("}"):
            return os.environ.get(obj[2:-1], "")
        if isinstance(obj, dict):
            return {k: resolve_env(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [resolve_env(v) for v in obj]
        return obj
    
    return Config(chains=resolve_env(chains), strategy=strategy)
