import math
import matplotlib.pyplot as plt

MU = 398600.0         # GM for the Earth, in km³/s²
EARTH_RADIUS = 6371   # km

def gravity(x, y):
    """The acceleration (ax, ay), in km/s², at the point (x, y)."""
    r = math.hypot(x, y)     # distance from the centre of the Earth
    g = MU / r**2
    return -g * x / r, -g * y / r

def fly(speed, altitude=400, dt=1.0, max_time=20000):
    """Follow a cannonball fired sideways. Returns its x and y positions."""
    x, y = 0.0, EARTH_RADIUS + altitude
    vx, vy = speed, 0.0
    xs, ys = [x], [y]
    for _ in range(int(max_time / dt)):
        ax, ay = gravity(x, y)
        vx += ax * dt
        vy += ay * dt
        x += vx * dt
        y += vy * dt
        xs.append(x)
        ys.append(y)
        if math.hypot(x, y) < EARTH_RADIUS:
            break            # it has hit the ground
    return xs, ys

turn = [math.radians(a) for a in range(361)]
plt.fill([EARTH_RADIUS * math.cos(a) for a in turn],
         [EARTH_RADIUS * math.sin(a) for a in turn], color="lightskyblue")

for speed in [5.0, 7.0, 7.67, 9.0]:
    xs, ys = fly(speed)
    plt.plot(xs, ys, label=f"{speed} km/s")

plt.axis("equal")
plt.legend()
plt.show()
