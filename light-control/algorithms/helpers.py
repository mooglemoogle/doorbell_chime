import time

def get_millis():
    return time.time() * 1000

def bezier_blend(t) -> float:
    return t * t * (3.0 - 2.0 * t)