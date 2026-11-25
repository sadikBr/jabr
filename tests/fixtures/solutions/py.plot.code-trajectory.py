import numpy as np
import matplotlib.pyplot as plt

G = 9.8

def trajectory(speed, angle):
    """The x and y positions of a projectile, from launch to landing."""
    theta = np.radians(angle)
    vx = speed * np.cos(theta)
    vy = speed * np.sin(theta)
    t = np.linspace(0, 2 * vy / G, 100)
    x = vx * t
    y = vy * t - 0.5 * G * t**2
    return x, y

for angle in [30, 45, 60]:
    x, y = trajectory(20, angle)
    plt.plot(x, y, label=f"{angle}°")

plt.xlabel("distance (m)")
plt.ylabel("height (m)")
plt.title("Three launches at 20 m/s")
plt.legend()
plt.grid(True)
plt.show()
