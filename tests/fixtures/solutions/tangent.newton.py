import math

def slope(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

def newton(f, x, steps=6, show=False):
    """Find where f is zero, starting from the guess x."""
    for step in range(steps):
        x = x - f(x) / slope(f, x)
        if show:
            print(f"  step {step + 1}: {x:.12f}")
    return x

print("Square root of 2: solving x² - 2 = 0 from a guess of 1")
newton(lambda x: x**2 - 2, 1, show=True)

print("Solving x³ - x - 2 = 0 from a guess of 1.5")
newton(lambda x: x**3 - x - 2, 1.5, show=True)

print("Half of pi: solving cos(x) = 0 from a guess of 1")
print("  ", newton(math.cos, 1), "and pi / 2 is", math.pi / 2)
