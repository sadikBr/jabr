import math
import matplotlib.pyplot as plt

def oscillate(mass, stiffness, x0, total_time, dt=0.001):
    """Positions of a mass on a spring, released from rest at x0."""
    x, v = x0, 0.0
    positions = [x]
    for _ in range(round(total_time / dt)):
        a = -stiffness * x / mass
        v = v + a * dt
        x = x + v * dt
        positions.append(x)
    return positions

mass, stiffness = 0.5, 8.0     # kg, and newtons per metre
positions = oscillate(mass, stiffness, x0=0.1, total_time=4)
times = [i * 0.001 for i in range(len(positions))]

plt.plot(times, positions)
plt.xlabel("time (s)")
plt.ylabel("position (m)")
plt.grid(True)
plt.show()

print(f"Theory says each swing takes {2 * math.pi * math.sqrt(mass / stiffness):.3f} s")
