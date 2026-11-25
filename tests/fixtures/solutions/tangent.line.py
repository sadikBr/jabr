import math
import matplotlib.pyplot as plt

def slope(f, x, h=1e-5):
    """How steep the curve y = f(x) is at x."""
    return (f(x + h) - f(x - h)) / (2 * h)

def tangent(f, a):
    """The tangent line to y = f(x) at x = a, as a function of x."""
    height = f(a)
    steepness = slope(f, a)

    def line(x):
        return height + steepness * (x - a)

    return line

def f(x):
    return x**3 - x

xs = [i / 50 - 2 for i in range(201)]            # from -2 to 2
plt.plot(xs, [f(x) for x in xs], label="the curve")
for a in [-1.2, 0.3, 1.4]:
    line = tangent(f, a)
    nearby = [a - 0.6, a + 0.6]
    plt.plot(nearby, [line(x) for x in nearby], "--", label=f"tangent at {a}")
    plt.plot([a], [f(a)], "ko")
plt.ylim(-3, 3)
plt.legend()
plt.show()
