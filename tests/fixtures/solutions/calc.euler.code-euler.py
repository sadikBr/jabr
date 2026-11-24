import math
import matplotlib.pyplot as plt

def euler(f, y0, dt, steps):
    """Follow dy/dt = f(t, y) from y(0) = y0. Returns every value of y, starting with y0."""
    t, y = 0, y0
    ys = [y0]
    for _ in range(steps):
        y = y + f(t, y) * dt
        t = t + dt
        ys.append(y)
    return ys

steps = 8
dt = 2 / steps
ys = euler(lambda t, y: y, 1, dt, steps)
print(f"Euler: y(2) = {ys[-1]:.4f}   exact: {math.exp(2):.4f}")

ts = [i * dt for i in range(steps + 1)]
smooth = [i / 50 for i in range(101)]
plt.plot(smooth, [math.exp(t) for t in smooth], label="exact")
plt.plot(ts, ys, "o-", label="Euler")
plt.xlabel("t")
plt.legend()
plt.show()
