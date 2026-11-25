import math

G = 9.8

def landing_distance(speed, angle, dt=0.001):
    """How far away a ball lands, launched at `angle` degrees. Found step by step."""
    vx = speed * math.cos(math.radians(angle))
    vy = speed * math.sin(math.radians(angle))
    x, y = 0.0, 0.0
    for _ in range(100_000):        # at most 100 seconds of flight
        vy -= G * dt
        x += vx * dt
        y += vy * dt
        if y < 0:
            break                   # it has landed
    return x

for speed, angle in [(20, 45), (20, 30), (25, 60)]:
    formula = speed**2 * math.sin(math.radians(2 * angle)) / G
    print(f"{speed} m/s at {angle}°: simulated {landing_distance(speed, angle):.2f} m, formula {formula:.2f} m")
