import math

G = 9.8

def landing_distance(speed, angle, dt=0.001):
    """How far away a ball lands, launched at `angle` degrees."""
    vx = speed * math.cos(math.radians(angle))
    vy = speed * math.sin(math.radians(angle))
    x, y = 0.0, 0.0
    for _ in range(100_000):
        vy -= G * dt
        x += vx * dt
        y += vy * dt
        if y < 0:
            break
    return x

def aim(speed, target, tolerance=0.01):
    """The launch angle, between 0 and 40 degrees, that lands on the target."""
    low, high = 0.0, 40.0
    while high - low > tolerance:
        middle = (low + high) / 2
        if landing_distance(speed, middle) < target:
            low = middle
        else:
            high = middle
    return (low + high) / 2

for target in [20, 30, 38]:
    angle = aim(20, target)
    print(f"Target at {target} m: aim at {angle:.2f}°, which lands at {landing_distance(20, angle):.2f} m")
