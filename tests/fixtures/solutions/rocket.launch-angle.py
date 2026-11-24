import math

G = 9.81

def ideal_range(speed, angle_deg):
    """Distance to landing on flat ground with no air: v² sin(2θ) / g."""
    return speed**2 * math.sin(2 * math.radians(angle_deg)) / G

def launch(speed, angle_deg, dt=0.001):
    """Flight path of a ball launched from the ground. Returns (xs, ys)."""
    angle = math.radians(angle_deg)
    x, y = 0.0, 0.0
    vx = speed * math.cos(angle)
    vy = speed * math.sin(angle)
    xs, ys = [x], [y]
    for _ in range(1_000_000):
        x += vx * dt
        y += vy * dt
        vy -= G * dt
        xs.append(x)
        ys.append(y)
        if y < 0:  # it has just gone below the ground
            break
    return xs, ys

def landing_distance(xs, ys):
    """Where the path crosses the ground, between its last two points."""
    x1, y1, x2, y2 = xs[-2], ys[-2], xs[-1], ys[-1]
    return x1 + (x2 - x1) * y1 / (y1 - y2)

for angle in [30, 45, 60]:
    xs, ys = launch(20.0, angle)
    print(f"{angle}°: simulated {landing_distance(xs, ys):6.2f} m   formula {ideal_range(20.0, angle):6.2f} m")
