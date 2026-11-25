import math

G = 9.8

def landing_distance(speed, angle, drag=0.0, dt=0.001):
    """How far away a ball lands. `drag` is the drag constant divided by the mass."""
    vx = speed * math.cos(math.radians(angle))
    vy = speed * math.sin(math.radians(angle))
    x, y = 0.0, 0.0
    for _ in range(100_000):
        speed_now = math.hypot(vx, vy)
        ax = -drag * speed_now * vx
        ay = -G - drag * speed_now * vy
        vx += ax * dt
        vy += ay * dt
        x += vx * dt
        y += vy * dt
        if y < 0:
            break
    return x

def aim(speed, target, drag=0.0, tolerance=0.01):
    """The launch angle, between 0 and 40 degrees, that lands on the target."""
    low, high = 0.0, 40.0
    while high - low > tolerance:
        middle = (low + high) / 2
        if landing_distance(speed, middle, drag) < target:
            low = middle
        else:
            high = middle
    return (low + high) / 2

print(f"The same throw, 20 m/s at 35°: {landing_distance(20, 35):.1f} m without air, {landing_distance(20, 35, 0.01):.1f} m with")

target = 25
for drag in [0.0, 0.01]:
    angle = aim(20, target, drag)
    landed = landing_distance(20, angle, drag)
    print(f"Drag {drag}: aim at {angle:.1f}° to hit {target} m (lands at {landed:.2f} m)")
