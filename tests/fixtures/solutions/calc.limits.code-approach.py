import math

def approach(f, a, steps=5):
    """Values of f at a + 0.1, a + 0.01, ... closing in on a from the right."""
    values = []
    for k in range(1, steps + 1):
        value = f(a + 10**-k)
        values.append(value)
    return values

def f(x):
    return (1 - math.cos(x)) / x**2

for k, value in enumerate(approach(f, 0), start=1):
    print(f"x = {10**-k:<8g} f(x) = {value:.8f}")
