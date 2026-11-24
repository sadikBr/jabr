import math
import matplotlib.pyplot as plt

G = 9.8

def fall_with_drag(mass, k, total_time=20.0, dt=0.01):
    """The falling speed at every step, starting from rest."""
    speed = 0.0
    speeds = [speed]
    for _ in range(round(total_time / dt)):
        acceleration = G - (k / mass) * speed**2
        speed += acceleration * dt
        speeds.append(speed)
    return speeds

mass, k = 80, 0.25
speeds = fall_with_drag(mass, k)
print(f"Speed after 20 s: {speeds[-1]:.1f} m/s")
print(f"Terminal velocity from the formula: {math.sqrt(mass * G / k):.1f} m/s")

times = [i * 0.01 for i in range(len(speeds))]
plt.plot(times, speeds)
plt.xlabel("time (s)")
plt.ylabel("speed (m/s)")
plt.show()
