# backend/app/monitoring/logging.py
import logging
import json
from datetime import datetime
from typing import Dict, Any
import structlog
from pythonjsonlogger import jsonlogger

class StructuredLogger:
    """Logger structuré pour les logs en JSON"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.setup_logging()
    
    def setup_logging(self):
        """Configure le logging structuré"""
        handler = logging.StreamHandler()
        
        formatter = jsonlogger.JsonFormatter(
            fmt='%(asctime)s %(name)s %(levelname)s %(message)s %(extra)s',
            datefmt='%Y-%m-%dT%H:%M:%S%z'
        )
        handler.setFormatter(formatter)
        
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def _log(self, level: str, message: str, extra: Dict[str, Any] = None):
        """Log un message structuré"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'message': message,
            'extra': extra or {}
        }
        
        if level == 'info':
            self.logger.info(json.dumps(log_data))
        elif level == 'error':
            self.logger.error(json.dumps(log_data))
        elif level == 'warning':
            self.logger.warning(json.dumps(log_data))
        elif level == 'debug':
            self.logger.debug(json.dumps(log_data))
    
    def info(self, message: str, **kwargs):
        self._log('info', message, kwargs)
    
    def error(self, message: str, **kwargs):
        self._log('error', message, kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log('warning', message, kwargs)
    
    def debug(self, message: str, **kwargs):
        self._log('debug', message, kwargs)

# Logger d'audit pour les actions sensibles
class AuditLogger:
    """Logger pour les actions d'audit"""
    
    def __init__(self):
        self.logger = StructuredLogger('audit')
    
    def log_action(self, user_id: str, action: str, resource: str, details: Dict = None):
        """Log une action utilisateur"""
        self.logger.info(
            f"User action: {action}",
            user_id=user_id,
            action=action,
            resource=resource,
            details=details or {},
            ip_address=None,  # À récupérer du contexte
            user_agent=None    # À récupérer du contexte
        )
    
    def log_login(self, user_id: str, success: bool):
        """Log une tentative de connexion"""
        self.logger.info(
            f"Login attempt: {success}",
            user_id=user_id,
            action="login",
            success=success
        )
    
    def log_payment(self, user_id: str, amount: float, status: str):
        """Log un paiement"""
        self.logger.info(
            f"Payment: {status}",
            user_id=user_id,
            action="payment",
            amount=amount,
            status=status
        )
    
    def log_admin_action(self, admin_id: str, action: str, target: str, details: Dict):
        """Log une action administrateur"""
        self.logger.info(
            f"Admin action: {action}",
            admin_id=admin_id,
            action=action,
            target=target,
            details=details
        )

audit_logger = AuditLogger()