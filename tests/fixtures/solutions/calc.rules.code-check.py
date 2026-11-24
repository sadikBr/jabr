import math

def numerical_derivative(f, x, h=1e-5):
    """Estimate f'(x) from the slope between x - h and x + h."""
    return (f(x + h) - f(x - h)) / (2 * h)

def f(x):
    return x**2 * math.sin(x)

def df(x):
    """Your formula for the derivative of f."""
    return 2 * x * math.sin(x) + x**2 * math.cos(x)

for x in [0.5, 1, 2, 3]:
    print(f"x = {x:<4} formula: {df(x):9.5f}   measured: {numerical_derivative(f, x):9.5f}")
