import math

G = 9.8

def landing_distance(speed, angle, height=0):
    """How far away a ball lands, thrown at `angle` degrees from `height` metres up."""
    vx = speed * math.cos(math.radians(angle))
    vy = speed * math.sin(math.radians(angle))
    time = (vy + math.sqrt(vy**2 + 2 * G * height)) / G
    return vx * time

for height in [0, 10, 20]:
    best = max(range(1, 90), key=lambda angle: landing_distance(20, angle, height))
    distance = landing_distance(20, best, height)
    print(f"From {height:>2} m up, the best angle is {best} degrees: it lands {distance:.1f} m away")
