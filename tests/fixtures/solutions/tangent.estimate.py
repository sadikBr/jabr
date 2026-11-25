import math

def slope(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

def tangent(f, a):
    height = f(a)
    steepness = slope(f, a)

    def line(x):
        return height + steepness * (x - a)

    return line

def estimate(f, a, x):
    """An estimate of f(x), following the tangent at a."""
    return tangent(f, a)(x)

def error(f, a, x):
    """How far the estimate is from the true value (never negative)."""
    return abs(f(x) - estimate(f, a, x))

print("Estimating √x near x = 4")
print("distance   estimate    true value   error")
for distance in [0.1, 0.2, 0.4, 0.8]:
    x = 4 + distance
    print(f"{distance:>8}   {estimate(math.sqrt, 4, x):.6f}    {math.sqrt(x):.6f}     {error(math.sqrt, 4, x):.6f}")
