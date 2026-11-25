import math

def slope(f, x, h=1e-5):
    """How steep the curve y = f(x) is at x."""
    return (f(x + h) - f(x - h)) / (2 * h)

print("x² at x = 3:     ", slope(lambda x: x**2, 3))
print("sin(x) at x = 0: ", slope(math.sin, 0))
print("√x at x = 4:     ", slope(math.sqrt, 4))
