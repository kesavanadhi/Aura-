import os
import sys
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler
from config import LOGS_DIR

# Custom Formatter for Clean Timestamped Logs
class CleanEdgeFormatter(logging.Formatter):
    def format(self, record):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        prefix = getattr(record, "tag", record.levelname)
        return f"[{timestamp}] [{prefix}] {record.getMessage()}"

def setup_logger(name: str = "AURA_EDGE") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not logger.handlers:
        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(CleanEdgeFormatter())
        logger.addHandler(console_handler)

        # File Handler (rotating at 5MB, up to 3 backups)
        log_file = LOGS_DIR / "edge_server.log"
        file_handler = RotatingFileHandler(str(log_file), maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
        file_handler.setFormatter(CleanEdgeFormatter())
        logger.addHandler(file_handler)

    return logger

edge_logger = setup_logger()

# Convenience tagging helpers for exact requested log formats:
# [MQTT] ..., [AI] ..., [EMERGENCY] ..., [CAMERA] ...
def log_mqtt(msg: str):
    edge_logger.info(msg, extra={"tag": "MQTT"})

def log_ai(msg: str):
    edge_logger.info(msg, extra={"tag": "AI"})

def log_emergency(msg: str):
    edge_logger.warning(msg, extra={"tag": "EMERGENCY"})

def log_camera(msg: str):
    edge_logger.info(msg, extra={"tag": "CAMERA"})

def log_error(msg: str):
    edge_logger.error(msg, extra={"tag": "ERROR"})
