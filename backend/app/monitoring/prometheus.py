# backend/app/monitoring/prometheus.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi import Response
import time
from typing import Callable
import logging

logger = logging.getLogger(__name__)

# Métriques Prometheus
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

active_users = Gauge(
    'active_users',
    'Number of active users'
)

user_registrations_total = Counter(
    'user_registrations_total',
    'Total user registrations',
    ['role']
)

tracks_created_total = Counter(
    'tracks_created_total',
    'Total tracks created',
    ['genre']
)

orders_total = Counter(
    'orders_total',
    'Total orders',
    ['status']
)

revenue_total = Counter(
    'revenue_total',
    'Total revenue',
    ['currency']
)

async def track_request_metrics(request, call_next):
    """Middleware pour tracker les métriques des requêtes"""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    # Enregistrer la métrique
    http_requests_total.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    http_request_duration_seconds.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    return response

async def metrics_endpoint():
    """Endpoint pour exposer les métriques Prometheus"""
    return Response(content=generate_latest(), media_type="text/plain")