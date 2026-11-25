import matplotlib.pyplot as plt

G = 9.8
FPS = 60
BOUNCE = 0.8     # the share of its speed the ball keeps when it bounces

def update(y, v, dt):
    """One frame of physics for a ball. Returns its new height and velocity."""
    v = v - G * dt
    y = y + v * dt
    if y < 0:
        y = 0
        v = -v * BOUNCE
    return y, v

y, v = 5.0, 0.0
heights = [y]
for frame in range(5 * FPS):
    y, v = update(y, v, 1 / FPS)
    heights.append(y)

plt.plot([i / FPS for i in range(len(heights))], heights)
plt.xlabel("time (s)")
plt.ylabel("height (m)")
plt.show()
print(f"Lowest point reached: {min(heights):.2f} m")
